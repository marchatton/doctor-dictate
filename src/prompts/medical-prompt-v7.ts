import * as fs from 'fs';
import * as path from 'path';

import medicalDictionary from '../data/medical-dictionary';
import type { PromptTemplate, SectionManifest } from '../types/medical';

type GenerateOptions = {
  manifest?: SectionManifest;
};

type StructuredManifest = SectionManifest;

class MedicalPromptV7 {
  static VERSION = '7.0';

  private readonly template: PromptTemplate;

  private readonly corrections: typeof medicalDictionary.corrections;

  constructor(template: PromptTemplate, _options: Record<string, unknown> = {}) {
    this.template = template;
    this.corrections = medicalDictionary.corrections;
  }

  generatePrompt(dictationText: string, options: GenerateOptions = {}): string {
    const { manifest } = options;

    if (manifest && manifest.entries && manifest.entries.length > 0) {
      return this.generateStructuredPrompt(dictationText, manifest);
    }

    const sections = this.template.sections
      .map((section) => `${section.title}: ${section.format}${section.required ? ' (required)' : ''}`)
      .join('\n');

    const prompt = `Format this medical dictation into a structured note.

AVAILABLE SECTIONS (only use if content exists):
${sections}

STRICT RULES - MUST FOLLOW:
1. ONLY include sections that have actual content in the dictation
2. NEVER create or hallucinate content that wasn't dictated
3. If a section wasn't mentioned, DO NOT include it
4. When you hear a section name, start a new section with ### prefix
5. Section matching: "problemist"→"Problem List", "carton medications"→"Current Meds", etc.

DICTATION COMMANDS TO CONVERT:
- "period" → "." (except in "interim period", "school period")
- "comma" → ","
- "colon" → ":"
- "next paragraph" or "new paragraph" → start new section/paragraph
- "next line" → new line

CONTENT RULES:
- Include EVERYTHING that was dictated (no omissions)
- Keep medication names exactly as stated
- Keep dosing in parentheses as stated
- Convert units: milligrams→mg, milliliters→ml

CRITICAL: Only output sections that were actually dictated. Do not add sections like ROS, Vitals, MSE, Risk Assessment, etc. unless they were specifically mentioned in the dictation.

CORRECTIONS TO APPLY:
${JSON.stringify(this.corrections, null, 2)}

EXAMPLE (only showing dictated sections):
If dictation mentions: "identification John Smith 14 year old male period chief complaint follow-up"
Output:
### Identification
John Smith 14 year old male

### CC
Follow-up

DO NOT add other sections unless explicitly dictated!

INPUT TO FORMAT:
${dictationText}

OUTPUT:`;

    return prompt;
  }

  private generateStructuredPrompt(dictationText: string, manifest: StructuredManifest): string {
    const manifestLines = manifest.entries
      .map((entry, index) => {
        const required = entry.templateSection ? Boolean(entry.templateSection.required) : false;
        const origin = entry.type === 'known' ? 'template-section' : 'speaker-defined-section';
        const format = entry.format || 'paragraph';
        const guidance = entry.type === 'known'
          ? 'Follow template rules. Maintain dictated content verbatim.'
          : 'Keep dictated title and content exactly as provided; do not rename.';
        const contentRange = entry.contentRange || { start: 0, end: 0 };

        return `  {
    "order": ${index},
    "key": "${entry.key}",
    "title": "${entry.title}",
    "format": "${format}",
    "required": ${required},
    "origin": "${origin}",
    "dictationRange": { "start": ${contentRange.start ?? 0}, "end": ${contentRange.end ?? 0} },
    "guidance": "${guidance}"
  }`;
      })
      .join(',\n');

    const jsonSchema = `Return ONLY valid JSON using this schema:
{
  "sections": [
    {
      "key": string,            // use the key provided above
      "title": string,          // repeat the title exactly as given
      "body": string,           // formatted content for that section
      "confidence": number      // 0-1 confidence in placement
    }
  ],
  "uncategorized": [string]    // any fragments you could not place (optional)
}`;

    const instructions = `You MUST:
1. Preserve dictation order — process entries in the order listed above.
2. Include only sections present in the manifest. No additional sections allowed.
3. Omit any section whose body would be empty.
4. Do NOT invent content. Every word must come from the dictation.
5. Keep medication names, doses, and abbreviations exactly as dictated.
6. If unsure about a medication spelling, wrap it in braces (e.g., {Journay PM}).`;

    const prompt = `Format the dictation into structured JSON.

SECTION MANIFEST (process in this order):
[
${manifestLines}
]

${instructions}

DICTATION COMMAND CONVERSIONS:
- "period" → "." (except literal use like "interim period")
- "comma" → ","
- "colon" → ":"
- "next line" → line break within section
- "next paragraph"/"new paragraph" → new bullet or sentence as appropriate

${jsonSchema}

CORRECTIONS TO APPLY (use exact casing shown):
${JSON.stringify(this.corrections, null, 2)}

RAW DICTATION (do not alter order):
${dictationText}

Respond with JSON only.`;

    return prompt;
  }

  postProcess(text: string): string {
    if (!text) {
      return '';
    }

    let normalized = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n');

    normalized = normalized.replace(/(###\s+[^\n]+)\n(?!\n)/g, '$1\n\n');

    normalized = normalized.replace(/(^|\n)(?!###\s)([^\n]+)\n\n(?![#])/g, (_, prefix, line) => `${prefix}${line}\n`);

    return normalized.trim();
  }
}

class TemplateLoader {
  static load(templateName: string): PromptTemplate {
    const templatePath = path.join(__dirname, '../templates/format', `${templateName}.json`);
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template '${templateName}' not found`);
    }

    const raw = fs.readFileSync(templatePath, 'utf8');
    return JSON.parse(raw) as PromptTemplate;
  }
}

export { MedicalPromptV7, TemplateLoader };
