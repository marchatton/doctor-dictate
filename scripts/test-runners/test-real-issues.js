/**
 * Real transcription issues we need to handle
 */

const realIssues = {
  // Transcription errors (mishearing)
  mishearing: {
    'problemist': 'problem list',
    'leave complaint': 'chief complaint', 
    'drawn APM': '[unclear medication]',
    'Join A P.M.': 'Quetiapine',
    'Chorn APM': 'Quetiapine',
    'Jordan APM': 'Quetiapine',
    '60 milli': '60 mg',
    'Lexapro unclear_name': 'Lexapro',
  },

  // Natural speech variations
  variations: {
    // Doctor might say any of these:
    identification: [
      "This is John Smith, 14-year-old male",
      "John Smith is a 14-year-old male", 
      "Patient is John Smith, 14-year-old",
      "We have John Smith here, he's 14",
      "14-year-old male, John Smith"
    ],
    
    problems: [
      "Problem list: ADHD improving",
      "Problems include ADHD which is improving",
      "ADHD is doing better, depression is stable",
      "His ADHD - improving. Depression - stable",
      "Diagnoses: One, ADHD, Two, Depression"
    ],

    medications: [
      "Current meds: Lexapro 20mg daily",
      "He's on Lexapro 20 milligrams every day",
      "Taking 20mg of Lexapro in the morning",
      "Medications include Lexapro twenty milligrams",
      "On Lexapro 20, Quetiapine 60 at bedtime"
    ]
  },

  // Sections in random order
  randomOrder: [
    "medications → problems → identification",
    "interim history → identification → meds",
    "assessment first, then going back to problems"
  ],

  // Missing sections entirely
  missingSections: [
    "No MSE mentioned",
    "No risk assessment",
    "No interim history"
  ],

  // New sections not in template
  newSections: [
    "School performance",
    "Parent concerns", 
    "Side effects review",
    "Behavioral observations"
  ],

  // Mixed narrative and structured
  mixedStyle: `
    "So we're seeing John today, he's 14, seventh grade. 
     Following up for his ADHD and depression. 
     The ADHD is getting better, I'd say partial control.
     Mom says homework is improving. 
     Still on the Lexapro 20 and the quetiapine 60 at night.
     No major issues, sleeping well, no side effects."
  `
};

console.log('Real issues to handle:', JSON.stringify(realIssues, null, 2));

module.exports = realIssues;