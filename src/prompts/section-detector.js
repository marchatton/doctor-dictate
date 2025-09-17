/**
 * Smart Section Detection System
 * Detects both known and unknown section headers in medical dictation
 */

class SectionDetector {
  constructor(template) {
    this.template = template;
    this.knownSections = this.buildKnownPatterns();
    this.smartRules = this.buildSmartRules();
  }
  
  /**
   * Build regex patterns from template sections
   */
  buildKnownPatterns() {
    if (!this.template || !this.template.sections) {
      return [];
    }
    
    return this.template.sections.map(section => ({
      id: section.id,
      title: section.title,
      patterns: section.patterns?.map(p => new RegExp(p, 'i')) || [],
      format: section.format
    }));
  }
  
  /**
   * Build smart detection rules for unknown sections
   */
  buildSmartRules() {
    return [
      {
        name: "After paragraph break with colon",
        pattern: /(?:^|\n\n)([A-Z][A-Za-z\s]{2,30}):\s/,
        confidence: 0.95,
        description: "New paragraph followed by short title ending in colon",
        extractTitle: (match) => match[1]
      },
      {
        name: "After dictated 'next paragraph' with colon",
        pattern: /next paragraph[,.]?\s*([A-Z][A-Za-z\s]{2,30}):\s/i,
        confidence: 0.98,
        description: "Explicit 'next paragraph' command followed by title with colon",
        extractTitle: (match) => match[1]
      },
      {
        name: "After 'new line' with colon",
        pattern: /(?:new line|next line)[,.]?\s*([A-Z][A-Za-z\s]{2,30}):\s/i,
        confidence: 0.90,
        description: "Line break command followed by title with colon",
        extractTitle: (match) => match[1]
      },
      {
        name: "Medical section keywords",
        pattern: /(?:^|\.\s+)((?:Problem List|Current Meds|Current Medications|Interim History|Assessment|Plan|Chief Complaint|CC|ROS|MSE|Risk Assessment|Past Medical History|Social History|Family History|Therapy Notes|Vitals?|Mental Status))(?:\s*:|\s+)/i,
        confidence: 0.92,
        description: "Common medical section names at sentence boundaries",
        extractTitle: (match) => match[1]
      },
      {
        name: "Standalone short phrase with colon",
        pattern: /^([A-Z][A-Za-z\s]{2,25}):(?:\s|$)/m,
        confidence: 0.85,
        description: "Short standalone phrase ending with colon (likely a header)",
        extractTitle: (match) => match[1]
      },
      {
        name: "After period with capitalized phrase and colon",
        pattern: /\.\s+([A-Z][A-Za-z\s]{2,30}):\s/,
        confidence: 0.88,
        description: "New sentence that's a short title with colon",
        extractTitle: (match) => match[1]
      },
      {
        name: "After 'new section' command",
        pattern: /(?:new section|next section)[,.]?\s*([A-Z][A-Za-z\s]{2,30})/i,
        confidence: 0.96,
        description: "Explicit section command",
        extractTitle: (match) => match[1]
      },
      {
        name: "Double line break with title",
        pattern: /\n\n([A-Z][A-Za-z\s]{2,30})(?:\s*:|\s*\n)/,
        confidence: 0.87,
        description: "Double line break followed by potential header",
        extractTitle: (match) => match[1]
      }
    ];
  }
  
  /**
   * Detect if text at position is a section header
   * @param {string} text - Full text
   * @param {number} position - Current position in text
   * @returns {Object|null} - Detection result with confidence
   */
  detectSection(text, position) {
    // Get context around position (50 chars before, 100 after)
    const contextStart = Math.max(0, position - 50);
    const contextEnd = Math.min(text.length, position + 100);
    const context = text.substring(contextStart, contextEnd);
    const relativePos = position - contextStart;
    
    // Check known patterns first
    for (const section of this.knownSections) {
      for (const pattern of section.patterns) {
        const match = context.substring(relativePos).match(pattern);
        if (match && match.index === 0) {
          return {
            type: 'known',
            confidence: 1.0,
            section: section,
            title: section.title,
            format: section.format
          };
        }
      }
    }
    
    // Apply smart rules for unknown sections
    for (const rule of this.smartRules) {
      const match = context.match(rule.pattern);
      if (match) {
        // Check if match is near our position
        const matchPos = match.index || 0;
        if (Math.abs(matchPos - relativePos) < 10) {
          const title = rule.extractTitle(match);
          return {
            type: 'smart',
            confidence: rule.confidence,
            rule: rule.name,
            title: this.normalizeTitle(title),
            suggestedFormat: this.suggestFormat(title)
          };
        }
      }
    }
    
    return null;
  }
  
  /**
   * Normalize detected title
   * @param {string} title - Raw detected title
   * @returns {string} - Normalized title
   */
  normalizeTitle(title) {
    return title
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/^(.)/, m => m.toUpperCase());
  }
  
  /**
   * Suggest format based on title
   * @param {string} title - Section title
   * @returns {string} - Suggested format type
   */
  suggestFormat(title) {
    const lowerTitle = title.toLowerCase();
    
    // Lists likely to be numbered
    if (lowerTitle.includes('problem') || 
        lowerTitle.includes('medication') || 
        lowerTitle.includes('med')) {
      return 'numbered-list';
    }
    
    // Lists likely to be bulleted
    if (lowerTitle.includes('history') || 
        lowerTitle.includes('ros') || 
        lowerTitle.includes('assessment') ||
        lowerTitle.includes('plan')) {
      return 'bullet-list';
    }
    
    // Single line items
    if (lowerTitle.includes('cc') || 
        lowerTitle.includes('chief') ||
        lowerTitle.includes('date')) {
      return 'single-line';
    }
    
    // Default to paragraph
    return 'paragraph';
  }
  
  /**
   * Process entire text and identify all sections
   * @param {string} text - Full dictation text
   * @returns {Array} - Array of detected sections with positions
   */
  detectAllSections(text) {
    const sections = [];
    const lines = text.split('\n');
    let currentPos = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const detection = this.detectSection(text, currentPos);
      
      if (detection && detection.confidence > 0.8) {
        sections.push({
          ...detection,
          position: currentPos,
          lineNumber: i + 1,
          lineText: line
        });
      }
      
      currentPos += line.length + 1; // +1 for newline
    }
    
    return sections;
  }
}

module.exports = { SectionDetector };