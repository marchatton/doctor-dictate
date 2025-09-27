const dictionary = require('../../data/medical-dictionary');

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function createLowerMap(map = {}) {
  const lowered = new Map();
  Object.entries(map).forEach(([key, value]) => {
    if (!key || typeof key !== 'string') return;
    lowered.set(key.toLowerCase(), value);
  });
  return lowered;
}

function buildMedicationCatalog(dict) {
  const catalog = new Map();

  const addName = (name) => {
    if (!name) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    catalog.set(trimmed.toLowerCase(), trimmed);
  };

  const meds = dict.medications || {};
  Object.values(meds).forEach((category) => {
    Object.entries(category || {}).forEach(([generic, data]) => {
      const canonical = data?.brandNames?.[0] || generic;
      addName(canonical);
      addName(generic);
      (data?.brandNames || []).forEach(addName);
    });
  });

  // Add correction targets as known values
  const correctionTargets = Object.values(dict.corrections?.medications || {});
  correctionTargets.forEach(addName);

  return catalog;
}

function levenshtein(a, b) {
  const lenA = a.length;
  const lenB = b.length;
  const dp = Array.from({ length: lenA + 1 }, () => new Array(lenB + 1).fill(0));

  for (let i = 0; i <= lenA; i += 1) dp[i][0] = i;
  for (let j = 0; j <= lenB; j += 1) dp[0][j] = j;

  for (let i = 1; i <= lenA; i += 1) {
    for (let j = 1; j <= lenB; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }

  return dp[lenA][lenB];
}

const phraseCorrectionsMap = createLowerMap(dictionary.corrections?.phrases || {});
const medicationCorrectionMap = createLowerMap(dictionary.corrections?.medications || {});
const abbreviationMap = createLowerMap(dictionary.corrections?.abbreviations || {});
const knownMedicationCatalog = buildMedicationCatalog(dictionary);

function applyMappedReplacements(text, map) {
  let output = text;
  map.forEach((replacement, key) => {
    const regex = new RegExp(`\\b${escapeRegExp(key)}\\b`, 'gi');
    output = output.replace(regex, replacement);
  });
  return output;
}

function capitalizeMedication(name) {
  return name
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
    .trim();
}

function findClosestMedication(candidateLower) {
  let best = { name: null, distance: Infinity };
  knownMedicationCatalog.forEach((canonical, lower) => {
    const distance = levenshtein(candidateLower, lower);
    if (distance < best.distance) {
      best = { name: canonical, distance };
    }
  });

  if (!best.name) return null;

  const threshold = Math.max(2, Math.ceil(best.name.length * 0.35));
  return best.distance <= threshold ? best : null;
}

function resolveMedicationName(candidate) {
  const trimmed = candidate.trim();
  if (!trimmed) return { text: candidate, bracket: false };

  const lower = trimmed.toLowerCase();

  if (medicationCorrectionMap.has(lower)) {
    return { text: medicationCorrectionMap.get(lower), bracket: false };
  }

  if (knownMedicationCatalog.has(lower)) {
    return { text: knownMedicationCatalog.get(lower), bracket: false };
  }

  const closest = findClosestMedication(lower);
  if (closest) {
    return { text: closest.name, bracket: true };
  }

  return { text: capitalizeMedication(trimmed), bracket: true };
}

function extractMedicationCandidate(content) {
  const stripped = content.trim();
  if (!stripped) return null;

  const match = stripped.match(/^[^\d(]+/);
  if (!match) return null;

  const candidate = match[0].replace(/[•:*]/g, '').trim();
  if (!candidate) return null;

  return candidate;
}

function normalizeMedicationLines(text) {
  const lines = text.split('\n');

  return lines.map((line) => {
    const match = line.match(/^(\s*(?:\d+\.\s+|[-*+]\s+)?)\s*(.*)$/);
    if (!match) return line;

    const prefix = match[1] || '';
    let content = match[2] || '';

    const candidate = extractMedicationCandidate(content);
    if (!candidate) return line;

    if (content.includes('{')) return line; // already marked

    const { text: resolvedName, bracket } = resolveMedicationName(candidate);
    const replacement = bracket ? `{${resolvedName}}` : resolvedName;

    const candidateRegex = new RegExp(`^${escapeRegExp(candidate)}`);
    content = content.replace(candidateRegex, replacement);

    return `${prefix}${content}`.trimEnd();
  }).join('\n');
}

function applyAbbreviationNormalization(text) {
  let output = text;
  abbreviationMap.forEach((replacement, key) => {
    const regex = new RegExp(`\\b${escapeRegExp(key)}\\b`, 'gi');
    output = output.replace(regex, replacement);
  });
  return output;
}

function isMedicationSection(entry) {
  if (!entry) return false;
  const id = entry.id || '';
  const title = entry.title || '';

  const medicationIds = ['current-meds', 'medications', 'medication-list'];
  if (medicationIds.includes(id)) return true;

  return /med(ication)?s?/i.test(title);
}

function normalizeSectionBody(body, manifestEntry) {
  if (!body || typeof body !== 'string') return body;

  let output = body;
  output = applyMappedReplacements(output, phraseCorrectionsMap);
  output = applyMappedReplacements(output, medicationCorrectionMap);
  output = applyAbbreviationNormalization(output);

  if (isMedicationSection(manifestEntry)) {
    output = normalizeMedicationLines(output);
  }

  return output;
}

module.exports = {
  normalizeSectionBody
};
