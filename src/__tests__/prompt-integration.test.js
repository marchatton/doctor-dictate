const { MedicalPrompt, TemplateLoader, SectionDetector } = require('../prompts');

const template = TemplateLoader.load('medicine-management');
const prompt = new MedicalPrompt(template);

describe('MedicalPrompt integration', () => {
  it('generates a free-form prompt with strict rules and corrections', () => {
    const dictation = 'Identification John Smith 14 year old male. Problem list ADHD improving.';
    const output = prompt.generatePrompt(dictation);

    expect(output).toContain('AVAILABLE SECTIONS (only use if content exists)');
    expect(output).toContain('STRICT RULES - MUST FOLLOW');
    expect(output).toContain('DICTATION COMMANDS TO CONVERT');
    expect(output).toContain('CORRECTIONS TO APPLY');
    expect(output).toContain(dictation);
  });

  it('generates a manifest-aware prompt that requests JSON output', () => {
    const manifest = {
      entries: [
        {
          key: 'identification',
          title: 'Identification',
          type: 'known',
          format: 'paragraph',
          templateSection: { required: true },
          contentRange: { start: 0, end: 50 }
        },
        {
          key: 'speaker-1',
          title: 'Therapy Updates',
          type: 'speaker',
          format: 'paragraph',
          contentRange: { start: 51, end: 120 }
        }
      ]
    };

    const dictation = 'Identification John Smith. Therapy updates patient reports better sleep.';
    const output = prompt.generatePrompt(dictation, { manifest });

    expect(output).toContain('SECTION MANIFEST (process in this order)');
    expect(output).toContain('Respond with JSON only');
    expect(output).toContain('key": "identification"');
    expect(output).toContain('Therapy Updates');
  });

  it('post processes extra whitespace from formatted output', () => {
    const messy = '### Identification\nJohn\n\n\nSmith';
    expect(prompt.postProcess(messy)).toBe('### Identification\n\nJohn\nSmith');
  });
});

describe('SectionDetector helper', () => {
  const detector = new SectionDetector(template);

  it('identifies known template sections', () => {
    const text = 'Identification John Smith is 14. Chief complaint follow-up.';
    const sections = detector.detectAllSections(text);
    const titles = sections.map((section) => section.title);

    expect(titles).toContain('Identification');
    expect(titles.some((title) => /Chief/i.test(title))).toBe(true);
  });

  it('discovers smart sections not present in template', () => {
    const text = 'Physical exam: vitals stable. Labs: CBC normal.';
    const sections = detector.detectAllSections(text);
    const smartSections = sections.filter((section) => section.type === 'smart');

    expect(smartSections.length).toBeGreaterThan(0);
    expect(smartSections.map((s) => s.title.toLowerCase())).toContain('physical exam');
  });
});
