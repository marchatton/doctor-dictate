class SegmentSplitter {
  constructor(options = {}) {
    this.defaultMaxLength = options.maxSegmentLength || 1000;
    this.defaultOverlapSentences = options.overlapSentences || 1;
  }

  split(text, config = {}) {
    const trimmed = (text || '').trim();
    if (!trimmed) {
      return [];
    }

    const maxLength = config.maxSegmentLength || this.defaultMaxLength;
    const overlapSentences = config.overlapSentences ?? this.defaultOverlapSentences;

    if (trimmed.length <= maxLength) {
      return [this.createSegment(trimmed, 0, trimmed.length, 0)];
    }

    const sentences = this.tokenizeSentences(trimmed);
    const segments = [];
    let current = [];
    let currentLength = 0;
    let segmentIndex = 0;

    for (let i = 0; i < sentences.length; i += 1) {
      const sentence = sentences[i];
      const sentenceLength = sentence.length;

      if (currentLength + sentenceLength > maxLength && current.length > 0) {
        const segmentText = current.join(' ').trim();
        const start = segments.length === 0 ? 0 : segments[segments.length - 1].end;
        const end = start + segmentText.length;
        segments.push(this.createSegment(segmentText, start, end, segmentIndex));
        segmentIndex += 1;

        const overlap = overlapSentences > 0 ? current.slice(-overlapSentences) : [];
        current = overlap.length > 0 ? [...overlap] : [];
        currentLength = overlap.reduce((sum, value) => sum + value.length + 1, 0);
      }

      current.push(sentence);
      currentLength += sentenceLength + 1;
    }

    if (current.length > 0) {
      const segmentText = current.join(' ').trim();
      const start = segments.length === 0 ? 0 : segments[segments.length - 1].end;
      const end = start + segmentText.length;
      segments.push(this.createSegment(segmentText, start, end, segmentIndex));
    }

    return segments;
  }

  tokenizeSentences(text) {
    const sentenceRegex = /[^.!?]+[.!?"']*(?:\s+|$)/g;
    const matches = text.match(sentenceRegex);
    if (!matches) {
      return [text];
    }
    return matches.map((sentence) => sentence.trim()).filter(Boolean);
  }

  createSegment(text, start, end, index) {
    return {
      id: `segment-${index}`,
      index,
      text,
      start,
      end,
    };
  }
}

module.exports = { SegmentSplitter };
