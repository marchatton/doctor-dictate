const { parseStructuredResponse } = require('../structured-response-parser');

describe('parseStructuredResponse', () => {
  const manifest = {
    entries: [
      { key: 'identification', title: 'Identification', type: 'known' },
      { key: 'custom-sleep-hygiene', title: 'Sleep Hygiene', type: 'smart' }
    ]
  };

  it('extracts JSON payload and normalizes sections', () => {
    const response = `Here is the output\n{\n  "sections": [\n    {\n      "key": "identification",\n      "title": "Identification",\n      "body": "John Smith is a 14-year-old male.",\n      "confidence": 0.92\n    },\n    {\n      "key": "custom-sleep-hygiene",\n      "body": "Discussed routine."\n    }\n  ],\n  "uncategorized": [\n    "No placement"\n  ]\n}`;

    const result = parseStructuredResponse(response, manifest);

    expect(result.sections).toHaveLength(2);
    expect(result.sections[0]).toMatchObject({
      key: 'identification',
      title: 'Identification',
      body: 'John Smith is a 14-year-old male.',
      confidence: 0.92
    });
    expect(result.sections[0].manifestEntry).toEqual(manifest.entries[0]);

    expect(result.sections[1]).toMatchObject({
      key: 'custom-sleep-hygiene',
      title: 'Sleep Hygiene',
      body: 'Discussed routine.',
      confidence: null
    });

    expect(result.uncategorized).toEqual(['No placement']);
  });

  it('throws on malformed JSON', () => {
    expect(() => parseStructuredResponse('no json here', manifest)).toThrow('No JSON object detected');
  });

  it('throws when sections are missing', () => {
    const badResponse = '{"sections": null, "uncategorized": []}';
    expect(() => parseStructuredResponse(badResponse, manifest)).toThrow('JSON response missing sections array');
  });
});
