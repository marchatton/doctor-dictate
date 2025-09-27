const { renderStructuredMarkdown } = require('../structured-renderer');

describe('renderStructuredMarkdown', () => {
  const template = {
    formatting: {
      sectionHeaderPrefix: '###'
    }
  };

  const manifest = {
    entries: [
      { key: 'identification', title: 'Identification', format: 'paragraph' },
      { key: 'custom-sleep-hygiene', title: 'Sleep Hygiene', format: 'bullet-list' },
      { key: 'current-meds', title: 'Current Meds', format: 'numbered-list', id: 'current-meds' }
    ]
  };

  it('renders sections in manifest order with appropriate formatting', () => {
    const structured = {
      sections: [
        {
          key: 'custom-sleep-hygiene',
          title: 'Sleep Hygiene',
          body: 'Lights out by 10pm\nAvoid screens before bed',
          confidence: 0.8
        },
        {
          key: 'identification',
          body: 'John Smith is a 14-year-old male.'
        }
      ],
      uncategorized: []
    };

    const markdown = renderStructuredMarkdown(structured, manifest, template);

    expect(markdown).toContain('### Identification');
    expect(markdown).toContain('John Smith is a 14-year-old male.');
    expect(markdown).toMatch(/- Lights out by 10pm/);
    expect(markdown).toMatch(/- Avoid screens before bed/);
    expect(markdown.indexOf('Identification')).toBeLessThan(markdown.indexOf('Sleep Hygiene'));
  });

  it('omits sections with empty bodies and appends uncategorized fragments', () => {
    const structured = {
      sections: [
        { key: 'identification', body: '' }
      ],
      uncategorized: ['Raw fragment']
    };

    const markdown = renderStructuredMarkdown(structured, manifest, template);

    expect(markdown).not.toContain('### Identification');
    expect(markdown).toContain('### Uncategorized');
    expect(markdown).toContain('- Raw fragment');
  });

  it('normalizes medications and flags uncertain names', () => {
    const structured = {
      sections: [
        {
          key: 'current-meds',
          body: '1. Jordan APM 60 mg (qhs)\n2. Lexapro 20 mg (qhs)'
        }
      ],
      uncategorized: []
    };

    const markdown = renderStructuredMarkdown(structured, manifest, template);

    expect(markdown).toContain('{Jornay PM}');
    expect(markdown).toContain('Lexapro 20 mg (QHS)');
  });
});
