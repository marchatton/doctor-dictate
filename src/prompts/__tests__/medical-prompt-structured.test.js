const { MedicalPromptV7 } = require('../medical-prompt-v7');

describe('MedicalPromptV7 structured prompt', () => {
  const template = {
    sections: [
      { id: 'identification', title: 'Identification', format: 'paragraph', required: true },
      { id: 'cc', title: 'CC', format: 'single-line', required: true },
      { id: 'interim-history', title: 'Interim History', format: 'bullet-list', required: false }
    ]
  };

  it('produces JSON-focused instructions scoped to manifest entries', () => {
    const prompt = new MedicalPromptV7(template);

    const manifest = {
      entries: [
        {
          key: 'identification',
          id: 'identification',
          title: 'Identification',
          type: 'known',
          templateSection: { id: 'identification', required: true, format: 'paragraph' },
          format: 'paragraph',
          contentRange: { start: 0, end: 120 }
        },
        {
          key: 'custom-sleep-hygiene',
          id: null,
          title: 'Sleep Hygiene',
          type: 'smart',
          format: 'paragraph',
          templateSection: null,
          contentRange: { start: 121, end: 220 }
        }
      ],
      summary: { totalDetected: 2 }
    };

    const dictation = 'Identification: John Smith... Sleep Hygiene: Discussed routines.';
    const promptText = prompt.generatePrompt(dictation, { manifest });

    expect(promptText).toContain('Format the dictation into structured JSON');
    expect(promptText).toContain('"key": "identification"');
    expect(promptText).toContain('"title": "Sleep Hygiene"');
    expect(promptText).toContain('Return ONLY valid JSON');
    expect(promptText).toContain('"sections": [');
    expect(promptText).toContain('Respond with JSON only.');

    expect(promptText.includes('Interim History')).toBe(false);
  });
});

