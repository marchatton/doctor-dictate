describe('OllamaClient', () => {
  let OllamaClient;

  beforeEach(() => {
    jest.resetModules();
    ({ OllamaClient } = require('../OllamaClient'));
  });

  it('ensures model exists via cached list', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          models: [
            { name: 'qwen2.5:1.5b' },
            { name: 'tinyllama:1.1b' },
          ],
        }),
      });

    const client = new OllamaClient({ fetchImpl: fetchMock });
    await client.ensureModel('qwen2.5:1.5b');
    await client.ensureModel('tinyllama:1.1b');

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('throws helpful error when model missing', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ models: [] }) });
    const client = new OllamaClient({ fetchImpl: fetchMock });

    await expect(client.ensureModel('qwen2.5:3b')).rejects.toThrow(/ollama pull qwen2.5:3b/i);
  });
});
