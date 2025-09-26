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
      { key: 'custom-sleep-hygiene', title: 'Sleep Hygiene', format: 'bullet-list' }
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
});

