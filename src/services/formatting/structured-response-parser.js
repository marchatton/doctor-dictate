const JSON_START = /\{\s*"sections"/;

function extractJsonBlock(raw) {
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

function normalizeSections(sections, manifest) {
  if (!Array.isArray(sections)) {
    throw new Error('sections must be an array');
  }

  const manifestByKey = new Map((manifest.entries || []).map((entry) => [entry.key, entry]));

  return sections.map((section) => {
    if (!section || typeof section !== 'object') {
      throw new Error('Invalid section entry');
    }

    const { key, title, body, confidence } = section;

    if (!key || typeof key !== 'string') {
      throw new Error('Section missing key');
    }

    if (typeof body !== 'string') {
      throw new Error(`Section ${key} missing string body`);
    }

    const manifestEntry = manifestByKey.get(key) || null;

    return {
      key,
      title: typeof title === 'string' ? title : manifestEntry?.title || '',
      body,
      confidence: typeof confidence === 'number' ? confidence : null,
      manifestEntry
    };
  });
}

function parseStructuredResponse(rawResponse, manifest = { entries: [] }) {
  if (typeof rawResponse !== 'string') {
    throw new Error('Response must be a string');
  }

  const jsonText = extractJsonBlock(rawResponse);
  let parsed;

  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    throw new Error('Failed to parse JSON response');
  }

  if (!parsed.sections) {
    throw new Error('JSON response missing sections array');
  }

  const sections = normalizeSections(parsed.sections, manifest);
  const uncategorized = Array.isArray(parsed.uncategorized) ? parsed.uncategorized : [];

  return {
    sections,
    uncategorized,
    raw: parsed
  };
}

module.exports = {
  parseStructuredResponse
};

