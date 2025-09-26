const DEFAULT_HEADER_PREFIX = '###';

function getHeaderPrefix(template) {
  const formatting = template?.formatting || {};
  if (typeof formatting.sectionHeaderPrefix === 'string' && formatting.sectionHeaderPrefix.trim().length > 0) {
    return formatting.sectionHeaderPrefix;
  }
  const level = formatting.sectionHeaderLevel || 3;
  return '#'.repeat(Math.max(1, level));
}

function splitLines(body) {
  return body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function renderList(body, style) {
  const lines = splitLines(body);
  if (lines.length === 0) return '';

  if (style === 'numbered-list') {
    return lines.map((line, index) => `${index + 1}. ${line}`).join('\n');
  }

  return lines.map((line) => `- ${line}`).join('\n');
}

function renderSectionBody(body, format) {
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

function normalizeTitle(manifestEntry, parsedSection) {
  if (manifestEntry?.title) return manifestEntry.title;
  if (parsedSection?.title) return parsedSection.title;
  return 'Untitled Section';
}

function shouldSkipSection(section) {
  if (!section) return true;
  if (!section.body) return true;
  return section.body.trim().length === 0;
}

function renderStructuredMarkdown(structuredPayload, manifest, template) {
  const headerPrefix = getHeaderPrefix(template);
  const sectionsByKey = new Map((structuredPayload.sections || []).map((section) => [section.key, section]));
  const lines = [];

  (manifest.entries || []).forEach((entry) => {
    const section = sectionsByKey.get(entry.key);
    if (shouldSkipSection(section)) return;

    const title = normalizeTitle(entry, section);
    const format = entry.format || section.manifestEntry?.format || 'paragraph';
    const body = renderSectionBody(section.body, format);
    if (!body) return;

    lines.push(`${headerPrefix} ${title}`);

    if (format === 'single-line') {
      lines.push(body);
    } else {
      lines.push(body);
    }

    lines.push('');
  });

  // Append uncategorized fragments if present
  if (Array.isArray(structuredPayload.uncategorized) && structuredPayload.uncategorized.length > 0) {
    lines.push(`${headerPrefix} Uncategorized`);
    structuredPayload.uncategorized.forEach((fragment) => {
      if (fragment && fragment.trim().length > 0) {
        lines.push(`- ${fragment.trim()}`);
      }
    });
    lines.push('');
  }

  return lines.join('\n').trim();
}

module.exports = {
  renderStructuredMarkdown
};

