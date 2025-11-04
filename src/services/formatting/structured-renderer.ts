import { normalizeSectionBody } from './structured-normalizer';

type ManifestEntry = {
  key?: string;
  id?: string;
  title?: string;
  format?: string;
  body?: string;
  [key: string]: unknown;
};

type TemplateFormatting = {
  sectionHeaderPrefix?: string;
  sectionHeaderLevel?: number;
};

type TemplateShape = {
  formatting?: TemplateFormatting;
};

type StructuredSection = {
  key: string;
  title?: string;
  body?: string;
  manifestEntry?: ManifestEntry;
};

type StructuredPayload = {
  sections?: StructuredSection[];
  uncategorized?: string[];
};

type ManifestShape = {
  entries?: Array<ManifestEntry & { format?: string }>;
};

function getHeaderPrefix(template: TemplateShape): string {
  const formatting = template?.formatting ?? {};
  if (typeof formatting.sectionHeaderPrefix === 'string' && formatting.sectionHeaderPrefix.trim().length > 0) {
    return formatting.sectionHeaderPrefix;
  }
  const level = formatting.sectionHeaderLevel ?? 3;
  return '#'.repeat(Math.max(1, level));
}

function splitLines(body: string): string[] {
  return body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function stripListPrefix(line: string): string {
  return line.replace(/^\s*(?:\d+\.\s+|[-*+]\s+)/, '').trim();
}

function renderList(body: string, style: 'numbered-list' | 'bullet-list'): string {
  const lines = splitLines(body).map(stripListPrefix);
  if (lines.length === 0) return '';

  if (style === 'numbered-list') {
    return lines.map((line, index) => `${index + 1}. ${line}`).join('\n');
  }

  return lines.map((line) => `- ${line}`).join('\n');
}

function renderSectionBody(body: string, format?: string): string {
  if (!body || typeof body !== 'string') return '';

  switch (format) {
    case 'numbered-list':
    case 'bullet-list':
      return renderList(body, format);
    case 'single-line':
      return body.replace(/\s+/g, ' ').trim();
    default:
      return body.trim();
  }
}

function normalizeTitle(manifestEntry?: ManifestEntry, parsedSection?: StructuredSection): string {
  if (manifestEntry?.title && typeof manifestEntry.title === 'string') return manifestEntry.title;
  if (parsedSection?.title) return parsedSection.title;
  return 'Untitled Section';
}

function shouldSkipSection(section?: StructuredSection): boolean {
  if (!section) return true;
  if (!section.body) return true;
  return section.body.trim().length === 0;
}

function renderStructuredMarkdown(
  structuredPayload: StructuredPayload,
  manifest: ManifestShape,
  template: TemplateShape,
): string {
  const headerPrefix = getHeaderPrefix(template);
  const sectionsByKey = new Map<string, StructuredSection>(
    (structuredPayload.sections ?? []).map((section) => [section.key, section]),
  );
  const lines: string[] = [];

  (manifest.entries ?? []).forEach((entry) => {
    const section = entry.key ? sectionsByKey.get(entry.key) : undefined;
    if (shouldSkipSection(section)) return;

    const title = normalizeTitle(entry, section);
    const format = (entry.format ?? section?.manifestEntry?.format ?? 'paragraph') as string;
    let body = renderSectionBody(section?.body ?? '', format);
    body = normalizeSectionBody(body, entry);
    if (!body) return;

    lines.push(`${headerPrefix} ${title}`);
    lines.push(body);
    lines.push('');
  });

  const uncategorized = structuredPayload.uncategorized ?? [];
  if (uncategorized.length > 0) {
    lines.push(`${headerPrefix} Uncategorized`);
    uncategorized.forEach((fragment) => {
      if (fragment && fragment.trim().length > 0) {
        lines.push(`- ${fragment.trim()}`);
      }
    });
    lines.push('');
  }

  return lines.join('\n').trim();
}

export { renderStructuredMarkdown };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    renderStructuredMarkdown,
  };
}
