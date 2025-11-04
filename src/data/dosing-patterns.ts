/**
 * Dosing Patterns and Preservation Rules
 * Ensures exact preservation of medication dosing language
 */

const dosingPatterns = {
  // Examples of dosing language that must be preserved exactly
  preserveExact: [
    // Pills/tablets
    "one pill per day",
    "two pills daily",
    "one pill twice daily",
    "one tablet in the morning",
    "two tablets at bedtime",
    "half tablet daily",
    "one and a half tablets",
    "three tablets with meals",
    "one tablet every morning",
    "one tablet at night",
    
    // Capsules
    "one capsule daily",
    "two capsules every morning",
    "one capsule twice daily",
    "one capsule with breakfast",
    
    // Liquids
    "5ml twice daily",
    "10ml at bedtime",
    "one teaspoon daily",
    "two teaspoons twice daily",
    "one tablespoon at bedtime",
    "two tablespoons every 6 hours",
    "10 drops under tongue",
    "5 drops in each ear",
    
    // Topical
    "apply twice daily",
    "apply to affected area",
    "use as directed",
    "thin layer twice daily",
    "apply liberally",
    "rub in gently",
    
    // Injections
    "inject once weekly",
    "subcutaneous injection daily",
    "IM injection monthly",
    "inject as directed",
    
    // Inhalers/sprays
    "two puffs twice daily",
    "one puff as needed",
    "two inhalations every 4 hours",
    "one spray in each nostril",
    "two sprays daily",
    
    // PRN (as needed)
    "as needed for pain",
    "as needed for anxiety",
    "as needed for sleep",
    "PRN for nausea",
    "use when necessary",
    "take as required",
    "for breakthrough pain",
    
    // Complex schedules
    "Monday Wednesday Friday",
    "every other day",
    "three times a day with meals",
    "four times daily",
    "every 4 hours",
    "every 4-6 hours",
    "every 6 hours while awake",
    "at breakfast and dinner",
    "morning and evening",
    "with food",
    "on empty stomach",
    "30 minutes before meals",
    "1 hour after meals",
    
    // Tapers and adjustments
    "increase by 5mg weekly",
    "taper over 2 weeks",
    "reduce gradually",
    "as directed by physician",
    
    // Duration
    "for 7 days",
    "for 10 days",
    "until finished",
    "ongoing",
    "continuous"
  ],
  
  // Rules for preservation
  preservationRules: [
    {
      rule: "Keep exact wording of frequency",
      example: "'one pill per day' → '(one pill per day)' NOT '(daily)'"
    },
    {
      rule: "Preserve 'as needed' phrasing",
      example: "'as needed for anxiety' → '(as needed for anxiety)' NOT '(PRN anxiety)'"
    },
    {
      rule: "Keep specific timing instructions",
      example: "'30 minutes before meals' → '(30 minutes before meals)' NOT '(AC)'"
    },
    {
      rule: "Maintain numerical descriptions",
      example: "'two tablets' → '(two tablets)' NOT '(2 tabs)'"
    },
    {
      rule: "Preserve meal-related instructions",
      example: "'with breakfast' → '(with breakfast)' NOT '(QAM with food)'"
    },
    {
      rule: "Keep day-of-week schedules",
      example: "'Monday Wednesday Friday' → '(Monday Wednesday Friday)' NOT '(MWF)'"
    }
  ],
  
  // Important note about comprehensiveness
  note: "This list is NOT exhaustive. The golden rule is: PRESERVE ALL DOSING LANGUAGE EXACTLY AS DICTATED. When in doubt, keep the original wording.",
  
  // Common abbreviations to NOT automatically apply
  doNotAbbreviate: {
    "one pill per day": "daily",
    "twice daily": "BID",
    "three times daily": "TID",
    "four times daily": "QID",
    "at bedtime": "QHS",
    "every morning": "QAM",
    "as needed": "PRN",
    "before meals": "AC",
    "after meals": "PC",
    "with food": "c food"
  },
  
  // Examples showing correct preservation
  correctExamples: [
    {
      input: "Lexapro 20 milligrams one pill every morning",
      correct: "Lexapro 20mg (one pill every morning)",
      wrong: "Lexapro 20mg (daily)"
    },
    {
      input: "Gabapentin 300 mg three times a day with meals",
      correct: "Gabapentin 300mg (three times a day with meals)",
      wrong: "Gabapentin 300mg (TID with food)"
    },
    {
      input: "Lorazepam 0.5 mg as needed for anxiety",
      correct: "Lorazepam 0.5mg (as needed for anxiety)",
      wrong: "Lorazepam 0.5mg (PRN)"
    },
    {
      input: "Apply cream twice daily to affected areas",
      correct: "Apply cream (twice daily to affected areas)",
      wrong: "Apply cream (BID)"
    }
  ]
};

/**
 * Check if a phrase contains dosing language
 * @param {string} text - Text to check
 * @returns {boolean} - True if contains dosing language
 */
function containsDosingLanguage(text: string): boolean {
  const dosingKeywords = [
    'pill', 'tablet', 'capsule', 'mg', 'ml', 'daily', 'twice',
    'three times', 'four times', 'as needed', 'PRN', 'QHS',
    'morning', 'evening', 'bedtime', 'meals', 'apply', 'inject',
    'puff', 'spray', 'drop', 'teaspoon', 'tablespoon'
  ];
  
  const lowerText = text.toLowerCase();
  return dosingKeywords.some(keyword => lowerText.includes(keyword));
}

/**
 * Format dosing for medication entry
 * @param {string} medication - Medication name and dose
 * @param {string} frequency - Frequency/instructions
 * @returns {string} - Formatted medication entry
 */
function formatMedicationDosing(medication: string, frequency: string): string {
  // Ensure mg abbreviation
  medication = medication.replace(/\bmilligrams?\b/gi, 'mg');
  medication = medication.replace(/\bmicrograms?\b/gi, 'mcg');
  medication = medication.replace(/\bmilliliters?\b/gi, 'ml');
  
  // Preserve exact frequency wording
  return `${medication} (${frequency})`;
}

type DosingPatterns = typeof dosingPatterns;

export { dosingPatterns, containsDosingLanguage, formatMedicationDosing };
export type { DosingPatterns };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    dosingPatterns,
    containsDosingLanguage,
    formatMedicationDosing,
  };
}
