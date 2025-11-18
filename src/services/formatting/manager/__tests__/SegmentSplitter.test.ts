import { SegmentSplitter } from '../SegmentSplitter';

describe('SegmentSplitter', () => {
  it('splits long text into overlapping segments', () => {
    const splitter = new SegmentSplitter();
    const text = 'Sentence one. Sentence two is longer. Sentence three final.';
    const segments = splitter.split(text, { maxSegmentLength: 25, overlapSentences: 1 });

    expect(segments.length).toBeGreaterThan(1);
    expect(segments[0].text).toMatch(/Sentence one/);
    expect(segments[1].text).toMatch(/Sentence two/);
    expect(segments[1].start).toBeGreaterThanOrEqual(segments[0].start);
  });

  it('returns single segment when text short', () => {
    const splitter = new SegmentSplitter();
    const segments = splitter.split('Short text.', { maxSegmentLength: 100 });
    expect(segments).toHaveLength(1);
    expect(segments[0].text).toBe('Short text.');
  });
});
