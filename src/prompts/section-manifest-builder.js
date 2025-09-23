const { SectionDetector } = require('./section-detector');

/**
 * Builds an ordered manifest of sections detected within dictation text.
 * Preserves original order, records unknown headings, and captures source ranges
 * so downstream systems can format deterministically without losing content.
 */
class SectionManifestBuilder {
  constructor(template, options = {}) {
    this.template = template || { sections: [] };
    this.options = options;
    this.detector = new SectionDetector(this.template);
    this.requiredIds = new Set(
      (this.template.sections || [])
        .filter(section => section.required)
        .map(section => section.id)
        .filter(Boolean)
    );
  }

  /**
   * Produce an ordered manifest for the supplied dictation text.
   * @param {string} text
   * @returns {{ entries: Array, summary: Object }}
   */
  build(text) {
    const rawText = typeof text === 'string' ? text : '';
    const lines = rawText.split('\n');
    const textLength = rawText.length;

    const detections = this.detector.detectAllSections(rawText) || [];
    const entries = [];
    const slugCounts = new Map();

    detections.forEach((detection, index) => {
      const templateSection = detection.section || null;
      const isKnown = Boolean(templateSection && templateSection.id);
      const id = isKnown ? templateSection.id : null;
      const title = isKnown ? templateSection.title : detection.title;
      const headerText = detection.lineText || '';
      const headerEndOffset = Math.min(detection.position + headerText.length, textLength);

      const entry = {
        order: index,
        key: this.resolveKey(id, title, index, slugCounts),
        id,
        title,
        detectedTitle: detection.title,
        type: isKnown ? 'known' : detection.type || 'smart',
        confidence: detection.confidence ?? (isKnown ? 1 : 0),
        position: detection.position,
        lineNumber: detection.lineNumber,
        lineText: headerText.trim(),
        format: isKnown ? templateSection.format : detection.suggestedFormat || 'paragraph',
        templateSection: isKnown ? {
          id: templateSection.id,
          required: Boolean(templateSection.required),
          format: templateSection.format
        } : null,
        range: {
          start: detection.position,
          end: null
        },
        contentRange: {
          start: Math.min(headerEndOffset + 1, textLength),
          end: null
        },
        lineRange: {
          start: detection.lineNumber,
          end: null
        }
      };

      entries.push(entry);
    });

    // Compute range endings once we know subsequent sections
    for (let i = 0; i < entries.length; i += 1) {
      const current = entries[i];
      const next = entries[i + 1];
      const nextStart = next ? next.range.start : textLength;
      const nextLineStart = next ? next.lineNumber : lines.length || 1;

      current.range.end = nextStart;
      current.contentRange.end = nextStart;
      current.lineRange.end = Math.max(current.lineNumber, nextLineStart - 1);

      // Ensure content range never precedes header start
      if (current.contentRange.start < current.range.start) {
        current.contentRange.start = current.range.start;
      }
      if (current.contentRange.start > current.contentRange.end) {
        current.contentRange.start = current.contentRange.end;
      }
    }

    // Fallback: if no sections detected but text exists, capture entire note
    if (entries.length === 0 && rawText.trim().length > 0) {
      entries.push({
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
        range: { start: 0, end: textLength },
        contentRange: { start: 0, end: textLength },
        lineRange: { start: 1, end: lines.length || 1 }
      });
    }

    const detectedIds = new Set(entries.filter(entry => entry.id).map(entry => entry.id));
    const missingRequired = Array.from(this.requiredIds)
      .filter(id => !detectedIds.has(id));

    const summary = {
      textLength,
      totalDetected: entries.length,
      knownCount: entries.filter(entry => entry.type === 'known').length,
      unknownCount: entries.filter(entry => entry.type !== 'known').length,
      missingRequired,
      hasFallback: entries.length === 1 && entries[0].type === 'unsectioned'
    };

    return { entries, summary };
  }

  resolveKey(id, title, index, slugCounts) {
    if (id) return id;

    const baseSlug = this.slugify(title || `section-${index + 1}`);
    const count = (slugCounts.get(baseSlug) || 0) + 1;
    slugCounts.set(baseSlug, count);
    const suffix = count > 1 ? `-${count}` : '';
    return `custom-${baseSlug}${suffix}`;
  }

  slugify(input) {
    const slug = (input || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return slug || 'section';
  }
}

module.exports = { SectionManifestBuilder };
