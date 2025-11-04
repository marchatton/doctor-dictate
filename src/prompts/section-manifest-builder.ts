import type { ManifestEntry, PromptTemplate, SectionManifest } from '../types/medical';
import { SectionDetector } from './section-detector';

type BuilderOptions = Record<string, unknown>;

type Detection = ReturnType<SectionDetector['detectAllSections']>[number];

type ManifestEntryInternal = ManifestEntry & {
  templateSection: ManifestEntry['templateSection'];
  range: ManifestEntry['range'];
  contentRange: ManifestEntry['contentRange'];
  lineRange: ManifestEntry['lineRange'];
};

export class SectionManifestBuilder {
  private readonly template: PromptTemplate;

  private readonly options: BuilderOptions;

  private readonly detector: SectionDetector;

  private readonly requiredIds: Set<string>;

  constructor(template: PromptTemplate, options: BuilderOptions = {}) {
    this.template = template || { id: 'unknown', name: 'unknown', sections: [] };
    this.options = options;
    this.detector = new SectionDetector(this.template);
    this.requiredIds = new Set(
      (this.template.sections || [])
        .filter((section) => section.required)
        .map((section) => section.id)
        .filter((id): id is string => Boolean(id)),
    );
  }

  build(text: string): SectionManifest {
    const rawText = typeof text === 'string' ? text : '';
    const lines = rawText.split('\n');
    const textLength = rawText.length;

    const detections = this.detector.detectAllSections(rawText) || [];
    const entries: ManifestEntryInternal[] = [];
    const slugCounts = new Map<string, number>();

    detections.forEach((detection, index) => {
      entries.push(this.createEntryFromDetection(detection, index, textLength, lines, slugCounts));
    });

    for (let i = 0; i < entries.length; i += 1) {
      this.applyRangeMetadata(entries, i, textLength, lines.length);
    }

    if (entries.length === 0 && rawText.trim().length > 0) {
      entries.push(this.buildFallbackEntry(rawText, lines));
    }

    const detectedIds = new Set(entries.filter((entry) => entry.id).map((entry) => entry.id as string));
    const missingRequired = Array.from(this.requiredIds).filter((id) => !detectedIds.has(id));

    const summary = {
      textLength,
      totalDetected: entries.length,
      knownCount: entries.filter((entry) => entry.type === 'known').length,
      unknownCount: entries.filter((entry) => entry.type !== 'known').length,
      missingRequired,
      hasFallback: entries.length === 1 && entries[0].type === 'unsectioned',
    };

    return { entries, summary };
  }

  private createEntryFromDetection(
    detection: Detection,
    index: number,
    textLength: number,
    lines: string[],
    slugCounts: Map<string, number>,
  ): ManifestEntryInternal {
    const templateSection = detection.section || null;
    const isKnown = Boolean(templateSection && templateSection.id);
    const id = isKnown ? templateSection?.id ?? null : null;
    const title = isKnown ? templateSection?.title ?? detection.title : detection.title;
    const headerText = detection.lineText || '';
    const headerEndOffset = Math.min((detection.position ?? 0) + headerText.length, textLength);

    return {
      order: index,
      key: this.resolveKey(id, title, index, slugCounts),
      id,
      title,
      detectedTitle: detection.title,
      type: isKnown ? 'known' : detection.type || 'smart',
      confidence: detection.confidence ?? (isKnown ? 1 : 0),
      position: detection.position ?? 0,
      lineNumber: detection.lineNumber,
      lineText: headerText.trim(),
      format: isKnown ? templateSection?.format ?? 'paragraph' : detection.suggestedFormat || 'paragraph',
      templateSection: isKnown
        ? {
            id: templateSection?.id ?? '',
            required: Boolean(templateSection?.required),
            format: templateSection?.format,
          }
        : null,
      range: {
        start: detection.position ?? 0,
        end: null,
      },
      contentRange: {
        start: Math.min(headerEndOffset + 1, textLength),
        end: null,
      },
      lineRange: {
        start: detection.lineNumber,
        end: null,
      },
    };
  }

  private applyRangeMetadata(entries: ManifestEntryInternal[], index: number, textLength: number, totalLines: number): void {
    const current = entries[index];
    const next = entries[index + 1];
    const nextStart = next ? next.range.start : textLength;
    const nextLineStart = next ? next.lineNumber : totalLines || 1;

    current.range.end = nextStart;
    current.contentRange.end = nextStart;
    current.lineRange.end = Math.max(current.lineNumber, nextLineStart - 1);

    if (current.contentRange.start < current.range.start) {
      current.contentRange.start = current.range.start;
    }
    if (current.contentRange.start > (current.contentRange.end ?? current.contentRange.start)) {
      current.contentRange.start = current.contentRange.end ?? current.contentRange.start;
    }
  }

  private buildFallbackEntry(rawText: string, lines: string[]): ManifestEntryInternal {
    return {
      order: 0,
      key: 'custom-unsectioned',
      id: null,
      title: 'Unsectioned',
      detectedTitle: 'Unsectioned',
      type: 'unsectioned',
      confidence: 0,
      position: 0,
      lineNumber: 1,
      lineText: lines[0] ? lines[0].trim() : '',
      format: 'paragraph',
      templateSection: null,
      range: { start: 0, end: rawText.length },
      contentRange: { start: 0, end: rawText.length },
      lineRange: { start: 1, end: lines.length || 1 },
    };
  }

  private resolveKey(id: string | null, title: string, index: number, slugCounts: Map<string, number>): string {
    if (id) return id;

    const baseSlug = this.slugify(title || `section-${index + 1}`);
    const count = (slugCounts.get(baseSlug) || 0) + 1;
    slugCounts.set(baseSlug, count);
    const suffix = count > 1 ? `-${count}` : '';
    return `custom-${baseSlug}${suffix}`;
  }

  private slugify(input: string): string {
    const slug = (input || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return slug || 'section';
  }
}
