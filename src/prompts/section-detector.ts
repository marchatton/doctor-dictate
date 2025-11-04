import type { PromptTemplate, TemplateSection } from '../types/medical';

type KnownPattern = {
  id?: string;
  title?: string;
  patterns: RegExp[];
  format?: string;
  section?: TemplateSection;
};

type SmartRule = {
  name: string;
  pattern: RegExp;
  confidence: number;
  description: string;
  extractTitle: (match: RegExpMatchArray) => string;
};

type DetectionResult = {
  type: 'known' | 'smart';
  confidence: number;
  section?: TemplateSection;
  title: string;
  format?: string;
  rule?: string;
  suggestedFormat?: string;
};

export class SectionDetector {
  private readonly template: PromptTemplate;

  private readonly knownSections: KnownPattern[];

  private readonly smartRules: SmartRule[];

  constructor(template: PromptTemplate) {
    this.template = template;
    this.knownSections = this.buildKnownPatterns();
    this.smartRules = this.buildSmartRules();
  }

  private buildKnownPatterns(): KnownPattern[] {
    if (!this.template || !Array.isArray(this.template.sections)) {
      return [];
    }

    return this.template.sections.map((section) => ({
      id: section.id,
      title: section.title,
      patterns: (section.patterns ?? []).map((pattern) => new RegExp(pattern, 'i')),
      format: section.format,
      section,
    }));
  }

  private buildSmartRules(): SmartRule[] {
    return [
      {
        name: 'After paragraph break with colon',
        pattern: /(?:^|\n\n)([A-Z][A-Za-z\s]{2,30}):\s/,
        confidence: 0.95,
        description: 'New paragraph followed by short title ending in colon',
        extractTitle: (match) => match[1],
      },
      {
        name: "After dictated 'next paragraph' with colon",
        pattern: /next paragraph[,.]?\s*([A-Z][A-Za-z\s]{2,30}):\s/i,
        confidence: 0.98,
        description: "Explicit 'next paragraph' command followed by title with colon",
        extractTitle: (match) => match[1],
      },
      {
        name: "After 'new line' with colon",
        pattern: /(?:new line|next line)[,.]?\s*([A-Z][A-Za-z\s]{2,30}):\s/i,
        confidence: 0.9,
        description: 'Line break command followed by title with colon',
        extractTitle: (match) => match[1],
      },
      {
        name: 'Medical section keywords',
        pattern:
          /(?:^|\.\s+)((?:Problem List|Current Meds|Current Medications|Interim History|Assessment|Plan|Chief Complaint|CC|ROS|MSE|Risk Assessment|Past Medical History|Social History|Family History|Therapy Notes|Vitals?|Mental Status))(?:\s*:|\s+)/i,
        confidence: 0.92,
        description: 'Common medical section names at sentence boundaries',
        extractTitle: (match) => match[1],
      },
      {
        name: 'Standalone short phrase with colon',
        pattern: /^([A-Z][A-Za-z\s]{2,25}):(?:\s|$)/m,
        confidence: 0.85,
        description: 'Short standalone phrase ending with colon (likely a header)',
        extractTitle: (match) => match[1],
      },
      {
        name: 'After period with capitalized phrase and colon',
        pattern: /\.\s+([A-Z][A-Za-z\s]{2,30}):\s/,
        confidence: 0.88,
        description: "New sentence that's a short title with colon",
        extractTitle: (match) => match[1],
      },
      {
        name: "After 'new section' command",
        pattern: /(?:new section|next section)[,.]?\s*([A-Z][A-Za-z\s]{2,30})/i,
        confidence: 0.96,
        description: 'Explicit section command',
        extractTitle: (match) => match[1],
      },
      {
        name: 'Double line break with title',
        pattern: /\n\n([A-Z][A-Za-z\s]{2,30})(?:\s*:|\s*\n)/,
        confidence: 0.87,
        description: 'Double line break followed by potential header',
        extractTitle: (match) => match[1],
      },
    ];
  }

  detectSection(text: string, position: number): (DetectionResult & { position?: number }) | null {
    const contextStart = Math.max(0, position - 50);
    const contextEnd = Math.min(text.length, position + 100);
    const context = text.substring(contextStart, contextEnd);
    const relativePos = position - contextStart;

    for (const section of this.knownSections) {
      for (const pattern of section.patterns) {
        const match = context.substring(relativePos).match(pattern);
        if (match && match.index === 0) {
          return {
            type: 'known',
            confidence: 1,
            section: section.section,
            title: section.title ?? 'Unknown',
            format: section.format,
          };
        }
      }
    }

    for (const rule of this.smartRules) {
      const match = context.match(rule.pattern);
      if (match) {
        const matchPos = match.index ?? 0;
        if (Math.abs(matchPos - relativePos) < 10) {
          const title = this.normalizeTitle(rule.extractTitle(match));
          return {
            type: 'smart',
            confidence: rule.confidence,
            rule: rule.name,
            title,
            suggestedFormat: this.suggestFormat(title),
          };
        }
      }
    }

    return null;
  }

  private normalizeTitle(title: string): string {
    return title.trim().replace(/\s+/g, ' ').replace(/^(.)/, (match) => match.toUpperCase());
  }

  private suggestFormat(title: string): string {
    const lowerTitle = title.toLowerCase();

    if (lowerTitle.includes('problem') || lowerTitle.includes('medication') || lowerTitle.includes('med')) {
      return 'numbered-list';
    }

    if (
      lowerTitle.includes('history') ||
      lowerTitle.includes('ros') ||
      lowerTitle.includes('assessment') ||
      lowerTitle.includes('plan')
    ) {
      return 'bullet-list';
    }

    if (lowerTitle.includes('cc') || lowerTitle.includes('chief') || lowerTitle.includes('date')) {
      return 'single-line';
    }

    return 'paragraph';
  }

  detectAllSections(text: string): Array<DetectionResult & { position: number; lineNumber: number; lineText: string }> {
    const sections: Array<DetectionResult & { position: number; lineNumber: number; lineText: string }> = [];
    const lines = text.split('\n');
    let currentPos = 0;

    for (let i = 0; i < lines.length; i += 1) {
      const detection = this.detectSection(text, currentPos);

      if (detection && detection.confidence > 0.8) {
        sections.push({
          ...detection,
          position: currentPos,
          lineNumber: i + 1,
          lineText: lines[i],
        });
      }

      currentPos += lines[i].length + 1;
    }

    const seen = new Set(sections.map((section) => `${section.title}-${section.position}`));
    for (const position of this.collectCandidatePositions(text)) {
      const detection = this.detectSection(text, position);
      if (!detection || detection.confidence <= 0.8) {
        continue;
      }

      const key = `${detection.title}-${position}`;
      if (seen.has(key)) {
        continue;
      }

      sections.push({
        ...detection,
        position,
        lineNumber: this.getLineNumber(text, position),
        lineText: this.extractLine(text, position),
      });
      seen.add(key);
    }

    return sections;
  }

  private collectCandidatePositions(text: string): number[] {
    const positions: number[] = [];
    const regex = /[^.!?\n]+[.!?\n]/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      positions.push(match.index);
    }
    if (positions.length === 0) {
      positions.push(0);
    }
    return positions;
  }

  private getLineNumber(text: string, index: number): number {
    return text.slice(0, index).split('\n').length;
  }

  private extractLine(text: string, index: number): string {
    const start = text.lastIndexOf('\n', index) + 1;
    const end = text.indexOf('\n', index);
    return text.slice(start, end === -1 ? text.length : end).trim();
  }
}
