const { SectionManifestBuilder } = require('../section-manifest-builder');
const { TemplateLoader } = require('../medical-prompt-v7');

const template = TemplateLoader.load('medicine-management');

describe('SectionManifestBuilder', () => {
  it('preserves dictation order and classifies known vs unknown sections', () => {
    const builder = new SectionManifestBuilder(template);
    const text = [
      'Identification: John Smith is seen for follow-up.',
      'CC: Follow-up appointment.',
      'Sleep Hygiene: Patient describes a consistent bedtime routine.',
      'Plan: Continue current therapy schedule.'
    ].join('\n');

    const manifest = builder.build(text);

    expect(manifest.entries.map(entry => entry.title)).toEqual([
      'Identification',
      'CC',
      'Sleep Hygiene',
      'Plan'
    ]);

    expect(manifest.entries[0]).toMatchObject({
      id: 'identification',
      type: 'known',
      order: 0
    });

    expect(manifest.entries[2]).toMatchObject({
      id: null,
      type: 'smart',
      title: 'Sleep Hygiene'
    });

    expect(manifest.entries[0].range.end).toBe(manifest.entries[1].range.start);
    expect(manifest.entries[1].lineRange.start).toBe(2);

    expect(manifest.summary).toMatchObject({
      totalDetected: 4,
      knownCount: 3,
      unknownCount: 1
    });

    expect(manifest.summary.missingRequired).toEqual(expect.arrayContaining(['problem-list']));
  });

  it('provides a fallback entry when no sections are detected', () => {
    const builder = new SectionManifestBuilder(template);
    const text = 'Free-form dictation without explicit sections.';

    const manifest = builder.build(text);

    expect(manifest.entries).toHaveLength(1);
    expect(manifest.entries[0]).toMatchObject({
      type: 'unsectioned',
      key: 'custom-unsectioned'
    });
    expect(manifest.entries[0].range).toEqual({ start: 0, end: text.length });
    expect(manifest.summary.hasFallback).toBe(true);
  });
});
