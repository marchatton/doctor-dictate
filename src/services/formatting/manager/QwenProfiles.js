const DEFAULT_QWEN_PROFILES = {
  'qwen2.5:0.5b': {
    label: 'Qwen2.5 0.5B',
    maxSegmentLength: 900,
    overlapSentences: 1,
    timeout: 35000,
    options: {
      temperature: 0.2,
      num_ctx: 3072,
      num_predict: 700,
      top_p: 0.92,
      repeat_penalty: 1.05,
    },
  },
  'qwen2.5:1.5b': {
    label: 'Qwen2.5 1.5B',
    maxSegmentLength: 1200,
    overlapSentences: 2,
    timeout: 45000,
    options: {
      temperature: 0.2,
      num_ctx: 4096,
      num_predict: 1000,
      top_p: 0.95,
      repeat_penalty: 1.1,
    },
  },
  'qwen2.5:3b': {
    label: 'Qwen2.5 3B',
    maxSegmentLength: 1500,
    overlapSentences: 2,
    timeout: 55000,
    options: {
      temperature: 0.25,
      num_ctx: 6144,
      num_predict: 1400,
      top_p: 0.95,
      repeat_penalty: 1.1,
    },
  },
};

function resolveQwenProfile(model) {
  const key = (model || '').trim();
  const profile = DEFAULT_QWEN_PROFILES[key];
  if (profile) {
    return {
      model: key,
      ...profile,
    };
  }

  const fallbackModel = 'qwen2.5:1.5b';
  return {
    model: fallbackModel,
    ...DEFAULT_QWEN_PROFILES[fallbackModel],
  };
}

function listQwenProfiles() {
  return Object.entries(DEFAULT_QWEN_PROFILES).map(([model, profile]) => ({
    model,
    ...profile,
  }));
}

module.exports = {
  DEFAULT_QWEN_PROFILES,
  resolveQwenProfile,
  listQwenProfiles,
};
