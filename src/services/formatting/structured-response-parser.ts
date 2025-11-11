import type { ManifestEntry, SectionManifest, StructuredPayload, StructuredSection } from '../../types/medical';

const JSON_START = /\{\s*"sections"/;

function extractJsonBlock(raw: string): string {
  const startIndex = raw.search(JSON_START);
  if (startIndex === -1) {
    throw new Error('No JSON object detected in response');
  }

  const substring = raw.slice(startIndex);
  let depth = 0;
  let endIndex = -1;

  for (let i = 0; i < substring.length; i += 1) {
    const char = substring[i];
    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        endIndex = i + 1;
        break;
      }
    }
  }

  if (endIndex === -1) {
    throw new Error('Malformed JSON object');
  }

  return substring.slice(0, endIndex);
}

function normalizeSections(sections: unknown, manifest: Pick<SectionManifest, 'entries'> | { entries?: ManifestEntry[] }): StructuredSection[] {
  if (!Array.isArray(sections)) {
    throw new Error('sections must be an array');
  }

  const manifestByKey = new Map((manifest.entries ?? []).map((entry) => [entry.key, entry]));

  return sections.map((section) => {
    if (!section || typeof section !== 'object') {
      throw new Error('Invalid section entry');
    }

    const typedSection = section as Partial<StructuredSection> & { key?: string; body?: string; title?: string; confidence?: number };
    const { key, title, body, confidence } = typedSection;

    if (!key || typeof key !== 'string') {
      throw new Error('Section missing key');
    }

    if (typeof body !== 'string') {
      throw new Error(`Section ${key} missing string body`);
    }

    const manifestEntry = manifestByKey.get(key) ?? null;

    return {
      key,
      title: typeof title === 'string' ? title : manifestEntry?.title,
      body,
      confidence: typeof confidence === 'number' ? confidence : null,
      manifestEntry: manifestEntry ?? undefined,
    } satisfies StructuredSection;
  });
}

export function parseStructuredResponse(
  rawResponse: string,
  manifest: Pick<SectionManifest, 'entries'> | { entries?: ManifestEntry[] } = { entries: [] },
): StructuredPayload {
  if (typeof rawResponse !== 'string') {
    throw new Error('Response must be a string');
  }

  const jsonText = extractJsonBlock(rawResponse);
  let parsed: { sections?: unknown; uncategorized?: unknown; [key: string]: unknown };

  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'unknown error';
    throw new Error(`Failed to parse JSON response: ${reason}`);
  }

  if (!parsed.sections) {
    throw new Error('JSON response missing sections array');
  }

  const sections = normalizeSections(parsed.sections, manifest);
  const uncategorized = Array.isArray(parsed.uncategorized)
    ? parsed.uncategorized.filter((fragment): fragment is string => typeof fragment === 'string')
    : [];

  return {
    sections,
    uncategorized,
    raw: parsed,
  };
}
