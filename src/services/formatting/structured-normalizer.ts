import medicalDictionary from '../../data/medical-dictionary';
import type { MedicalDictionary } from '../../types/medical';

type ReplacementMap = Map<string, string>;
type MedicationCatalog = Map<string, string>;
type MedicationResolution = { text: string; bracket: boolean };
type ManifestEntryLike = { id?: string; title?: string; [key: string]: unknown };

const dictionary: MedicalDictionary = medicalDictionary;

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function createLowerMap(map: Record<string, string> = {}): ReplacementMap {
  const lowered: ReplacementMap = new Map();
  Object.entries(map).forEach(([key, value]) => {
    if (!key) return;
    lowered.set(key.toLowerCase(), value);
  });
  return lowered;
}

function buildMedicationCatalog(dict: MedicalDictionary): MedicationCatalog {
  const catalog: MedicationCatalog = new Map();

  const addName = (name?: string) => {
    if (!name) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    catalog.set(trimmed.toLowerCase(), trimmed);
  };

  Object.values(dict.medications).forEach((category) => {
    Object.entries(category ?? {}).forEach(([generic, data]) => {
      const canonical = data?.brandNames?.[0] ?? generic;
      addName(canonical);
      addName(generic);
      (data?.brandNames ?? []).forEach(addName);
    });
  });

  // Add correction targets as known values
  const correctionTargets = Object.values(dict.corrections?.medications ?? {});
  correctionTargets.forEach(addName);

  return catalog;
}

function levenshtein(a: string, b: string): number {
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

const phraseCorrectionsMap: ReplacementMap = createLowerMap(dictionary.corrections?.phrases ?? {});
const medicationCorrectionMap: ReplacementMap = createLowerMap(dictionary.corrections?.medications ?? {});
const abbreviationMap: ReplacementMap = createLowerMap(dictionary.corrections?.abbreviations ?? {});
const knownMedicationCatalog: MedicationCatalog = buildMedicationCatalog(dictionary);

function applyMappedReplacements(text: string, map: ReplacementMap): string {
  let output = text;
  map.forEach((replacement, key) => {
    const regex = new RegExp(`\\b${escapeRegExp(key)}\\b`, 'gi');
    output = output.replace(regex, replacement);
  });
  return output;
}

function capitalizeMedication(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
    .trim();
}

function findClosestMedication(candidateLower: string): { name: string; distance: number } | null {
  let best: { name: string; distance: number } | null = null;
  knownMedicationCatalog.forEach((canonical, lower) => {
    const distance = levenshtein(candidateLower, lower);
    if (!best || distance < best.distance) {
      best = { name: canonical, distance };
    }
  });

  if (!best) return null;

  const threshold = Math.max(2, Math.ceil(best.name.length * 0.35));
  return best.distance <= threshold ? best : null;
}

function resolveMedicationName(candidate: string): MedicationResolution {
  const trimmed = candidate.trim();
  if (!trimmed) return { text: candidate, bracket: false };

  const lower = trimmed.toLowerCase();

  if (medicationCorrectionMap.has(lower)) {
    return { text: medicationCorrectionMap.get(lower) ?? trimmed, bracket: false };
  }

  if (knownMedicationCatalog.has(lower)) {
    return { text: knownMedicationCatalog.get(lower) ?? trimmed, bracket: false };
  }

  const closest = findClosestMedication(lower);
  if (closest) {
    return { text: closest.name, bracket: true };
  }

  return { text: capitalizeMedication(trimmed), bracket: true };
}

function extractMedicationCandidate(content: string): string | null {
  const stripped = content.trim();
  if (!stripped) return null;

  const match = stripped.match(/^[^\d(]+/);
  if (!match) return null;

  const candidate = match[0].replace(/[•:*]/g, '').trim();
  if (!candidate) return null;

  return candidate;
}

function normalizeMedicationLines(text: string): string {
  const lines = text.split('\n');

  return lines
    .map((line) => {
      const match = line.match(/^(\s*(?:\d+\.\s+|[-*+]\s+)?)\s*(.*)$/);
      if (!match) return line;

      const prefix = match[1] ?? '';
      let content = match[2] ?? '';

      const candidate = extractMedicationCandidate(content);
      if (!candidate) return line;

      if (content.includes('{')) return line; // already marked

      const { text: resolvedName, bracket } = resolveMedicationName(candidate);
      const replacement = bracket ? `{${resolvedName}}` : resolvedName;

      const candidateRegex = new RegExp(`^${escapeRegExp(candidate)}`);
      content = content.replace(candidateRegex, replacement);

      return `${prefix}${content}`.trimEnd();
    })
    .join('\n');
}

function applyAbbreviationNormalization(text: string): string {
  let output = text;
  abbreviationMap.forEach((replacement, key) => {
    const regex = new RegExp(`\\b${escapeRegExp(key)}\\b`, 'gi');
    output = output.replace(regex, replacement);
  });
  return output;
}

function isMedicationSection(entry?: ManifestEntryLike): boolean {
  if (!entry) return false;
  const id = typeof entry.id === 'string' ? entry.id : '';
  const title = typeof entry.title === 'string' ? entry.title : '';

  const medicationIds = ['current-meds', 'medications', 'medication-list'];
  if (medicationIds.includes(id)) return true;

  return /med(ication)?s?/i.test(title);
}

function normalizeSectionBody(body: string, manifestEntry?: ManifestEntryLike): string {
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

export { normalizeSectionBody };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    normalizeSectionBody,
  };
}
