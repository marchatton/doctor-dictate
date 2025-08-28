/**
 * Template filtering utility to clean up transcription output
 * Removes template placeholders and empty sections
 */

interface TemplateFilterOptions {
  removeEmptySections?: boolean;
  removePlaceholders?: boolean;
  removeHeaders?: boolean;
}

// Patterns that indicate template/placeholder content
const PLACEHOLDER_PATTERNS = [
  /not specified/gi,
  /none noted/gi,
  /relevant .+ not specified/gi,
  /no changes reported/gi,
  /no changes/gi,
  /no notable themes or concerns/gi,
  /no abnormalities noted/gi,
  /none indicated/gi,
  /not assessed/gi,
  /not applicable/gi,
  /\[\w+\]/g, // [placeholder] format
  /\*\*\w+\*\*/g, // **placeholder** format
  /reported\.$/gi, // Lines ending with just "reported."
];

// Section headers that should be removed if they have no content
const EMPTY_SECTION_PATTERNS = [
  /^##\s+.*?\n(?=\s*$|\n##|\n#)/gm, // Empty markdown sections
  /^\*\*.*?\*\*\s*\n(?=\s*$|\n\*\*|\n#)/gm, // Empty bold sections
];

// Patterns for completely empty or template-only lines
const EMPTY_LINE_PATTERNS = [
  /^[\s]*$/gm, // Empty lines
  /^\s*-\s*$/gm, // Just dashes
  /^\s*\*\s*$/gm, // Just asterisks
  /^\s*None\.?\s*$/gim,
  /^\s*N\/A\.?\s*$/gim,
];

export function filterTemplate(text: string, options: TemplateFilterOptions = {}): string {
  const {
    removeEmptySections = true,
    removePlaceholders = true,
    removeHeaders = false
  } = options;

  let cleaned = text;

  // Remove placeholder patterns
  if (removePlaceholders) {
    PLACEHOLDER_PATTERNS.forEach(pattern => {
      cleaned = cleaned.replace(pattern, '');
    });
  }

  // Remove empty lines and template-only content
  EMPTY_LINE_PATTERNS.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '');
  });

  // Remove empty sections
  if (removeEmptySections) {
    cleaned = removeEmptyMarkdownSections(cleaned);
  }

  // Clean up multiple consecutive newlines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  // Remove leading/trailing whitespace
  cleaned = cleaned.trim();

  return cleaned;
}

function removeEmptyMarkdownSections(text: string): string {
  const lines = text.split('\n');
  const result: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    
    // Check if this is a header line
    if (line.match(/^#{1,6}\s+/) || line.match(/^\*\*[^*]+\*\*\s*$/)) {
      // Look ahead to see if this section has meaningful content
      let j = i + 1;
      let hasContent = false;
      
      // Skip empty lines after header
      while (j < lines.length && lines[j].trim() === '') {
        j++;
      }
      
      // Check for content until next header or end
      while (j < lines.length) {
        const contentLine = lines[j];
        
        // If we hit another header, stop looking
        if (contentLine.match(/^#{1,6}\s+/) || contentLine.match(/^\*\*[^*]+\*\*\s*$/)) {
          break;
        }
        
        // Check if this line has meaningful content
        if (contentLine.trim() && !isTemplateLine(contentLine)) {
          hasContent = true;
          break;
        }
        j++;
      }
      
      if (hasContent) {
        result.push(line);
      }
      // Skip this header if no content found
    } else {
      // Not a header, include if it has content
      if (line.trim() && !isTemplateLine(line)) {
        result.push(line);
      } else if (line.trim() === '') {
        // Preserve some empty lines for formatting
        result.push(line);
      }
    }
    i++;
  }

  return result.join('\n');
}

function isTemplateLine(line: string): boolean {
  const trimmed = line.trim().toLowerCase();
  
  // Check against known template phrases
  const templatePhrases = [
    'not specified',
    'none noted',
    'no changes',
    'not applicable',
    'n/a',
    'none',
    'no notable themes or concerns',
    'relevant',
    'not assessed'
  ];
  
  return templatePhrases.some(phrase => trimmed.includes(phrase));
}

export function extractMedications(text: string): string[] {
  // Only extract medications from actual spoken content, not template text
  const filteredText = filterTemplate(text);
  
  const medicationPatterns = [
    /\b([a-zA-Z]+(?:ine|ol|am|ex|pram))\s+\d+\s*mg\b/gi, // Common medication suffixes with dosage
    /\b(lexapro|sertraline|wellbutrin|zoloft|prozac|effexor|paxil|celexa|cymbalta|pristiq|venlafaxine|escitalopram|fluoxetine|paroxetine|citalopram|duloxetine|bupropion|trazodone|mirtazapine|buspirone|lorazepam|alprazolam|clonazepam|diazepam|temazepam|zolpidem|eszopicolone|quetiapine|aripiprazole|risperidone|olanzapine|ziprasidone|paliperidone|abilify|seroquel|risperdal|zyprexa|geodon|invega|ritalin|adderall|concerta|vyvanse|strattera|methylphenidate|amphetamine|lisdexamfetamine|atomoxetine|modafinil|provigil|lithium|lamictal|depakote|tegretol|topamax|lamotrigine|valproate|carbamazepine|topiramate)\s*(?:\d+\s*mg)?/gi,
  ];
  
  const medications = new Set<string>();
  
  medicationPatterns.forEach(pattern => {
    const matches = filteredText.match(pattern);
    if (matches) {
      matches.forEach(match => {
        // Clean up the match
        const cleaned = match.toLowerCase().trim();
        // Only add if it appears in actual content, not template phrases
        if (!isTemplateLine(match) && cleaned.length > 2) {
          medications.add(cleaned);
        }
      });
    }
  });
  
  return Array.from(medications);
}

export function countMedicalTerms(text: string): number {
  // Count potential medical terms (simplified)
  const medicalPatterns = [
    /\b(?:adhd|depression|anxiety|bipolar|ptsd|ocd)\b/gi,
    /\b\w+\s+\d+\s*mg\b/gi,
    /\b(?:diagnosis|symptoms|treatment|therapy|medication)\b/gi,
    /\b(?:patient|clinical|medical|psychiatric)\b/gi
  ];
  
  let count = 0;
  medicalPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      count += matches.length;
    }
  });
  
  return count;
}

export function extractPatientName(text: string): string {
  // Extract patient name from transcript
  const namePatterns = [
    /(?:patient|client)\s+(?:is\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi,
    /(?:follow-up|followup)\s+(?:for|with)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:is\s+)?(?:a\s+)?\d+(?:-|\s)year(?:-|\s)old/gi,
    /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*,?\s*(?:age\s+)?\d+/gm, // Name at start of line with age
  ];
  
  for (const pattern of namePatterns) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      // Extract the name from the first match
      const match = matches[0];
      const nameMatch = pattern.exec(text);
      if (nameMatch && nameMatch[1]) {
        const name = nameMatch[1].trim();
        // Basic validation - should be 2-30 chars, not common words
        const commonWords = ['patient', 'client', 'therapy', 'session', 'treatment', 'follow', 'up'];
        if (name.length >= 2 && name.length <= 30 && !commonWords.includes(name.toLowerCase())) {
          return name;
        }
      }
    }
  }
  
  return 'Unknown';
}