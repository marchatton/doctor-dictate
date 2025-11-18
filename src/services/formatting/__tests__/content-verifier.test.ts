import type { SectionManifest } from '../../../types/medical';
import { ContentVerifier } from '../content-verifier';

describe('ContentVerifier verifyStructuredNote', () => {
  const verifier = new ContentVerifier();

  const manifest: SectionManifest = {
    entries: [
      {
        key: 'identification',
        title: 'Identification',
        contentRange: { start: 0, end: 80 },
      },
      {
        key: 'problem-list',
        title: 'Problem List',
        contentRange: { start: 81, end: 200 },
      },
    ],
  };

  const dictation = 'Identification: John Smith is a 14-year-old male with ADHD. Problem list: ADHD partial control.';

  it('flags missing and extra sections', () => {
    const markdown = '### Identification\nJohn Smith is a 14-year-old male.\n\n### Extra Section\nSpurious content.';
    const structured = { sections: [{ key: 'identification', body: 'John Smith is a 14-year-old male.' }] };

    const report = verifier.verifyStructuredNote({ dictationText: dictation, manifest, markdown, structured });

    expect(report.isValid).toBe(false);
    expect(report.missingSections).toEqual(['Problem List']);
    expect(report.extraSections).toEqual(['Extra Section']);
  });

  it('detects low coverage within section bodies', () => {
    const markdown = '### Identification\nJohn Smith is a 14-year-old male.\n\n### Problem List\n1. ADHD';
    const structured = {
      sections: [
        { key: 'identification', body: 'John Smith is a 14-year-old male.' },
        { key: 'problem-list', body: 'ADHD' },
      ],
    };

    const report = verifier.verifyStructuredNote({ dictationText: dictation, manifest, markdown, structured });

    expect(report.isValid).toBe(false);
    const coverageKeys = report.coverageIssues.map((issue) => issue.key);
    expect(coverageKeys).toContain('problem-list');
  });
});
