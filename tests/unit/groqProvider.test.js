import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createGroqProvider } from '@/lib/ai/providers/groq';
import { ProviderError } from '@/lib/ai/providers/errors';
import { getProvider, isProviderConfigured } from '@/lib/ai/providers';

const cfg = { provider: 'groq', model: 'llama-3.3-70b-versatile', maxOutputTokens: 8192, requestTimeoutMs: 5000 };
const tools = [{ name: 'list_tasks', description: 'List tasks', inputSchema: { type: 'object', properties: {}, additionalProperties: false } }];

function mockFetch(responses) {
  const requests = [];
  const fetchImpl = async (url, init) => {
    requests.push({ url, init, body: JSON.parse(init.body) });
    const r = responses[Math.min(requests.length - 1, responses.length - 1)];
    if (r instanceof Error) throw r;
    return { ok: r.status === undefined || r.status < 400, status: r.status ?? 200, json: async () => r.body };
  };
  return { fetchImpl, requests };
}

const completion = (message, finish = 'stop', usage = { prompt_tokens: 10, completion_tokens: 5 }) => ({
  body: { choices: [{ message: { role: 'assistant', ...message }, finish_reason: finish }], usage },
});

describe('Groq provider', () => {
  const saved = process.env.GROQ_API_KEY;
  beforeEach(() => { process.env.GROQ_API_KEY = 'test-key'; });
  afterEach(() => { process.env.GROQ_API_KEY = saved; });

  it('is registered and reports configuration from GROQ_API_KEY', () => {
    expect(getProvider(cfg).name).toBe('groq');
    expect(isProviderConfigured(cfg)).toBe(true);
    delete process.env.GROQ_API_KEY;
    expect(isProviderConfigured(cfg)).toBe(false);
    expect(() => createGroqProvider(cfg).startTurn({ system: 's', tools, history: [], userMessage: 'hi' }))
      .toThrow(expect.objectContaining({ code: 'not_configured' }));
  });

  it('sends an OpenAI-style request and maps tool calls back', async () => {
    const { fetchImpl, requests } = mockFetch([
      completion({ content: null, tool_calls: [{ id: 'call_1', type: 'function', function: { name: 'list_tasks', arguments: '{"status":"open"}' } }] }, 'tool_calls'),
      completion({ content: 'Here you go.' }),
    ]);
    const turn = createGroqProvider(cfg, { fetchImpl }).startTurn({
      system: 'SYSTEM', tools, history: [{ role: 'user', content: 'earlier' }, { role: 'assistant', content: 'reply' }], userMessage: 'now',
    });

    const first = await turn.next();
    expect(first).toMatchObject({ stopReason: 'tool_use', toolCalls: [{ id: 'call_1', name: 'list_tasks', input: { status: 'open' } }] });
    expect(first.usage).toMatchObject({ inputTokens: 10, outputTokens: 5 });

    const req = requests[0];
    expect(req.url).toBe('https://api.groq.com/openai/v1/chat/completions');
    expect(req.init.headers.authorization).toBe('Bearer test-key');
    expect(req.body).toMatchObject({ model: 'llama-3.3-70b-versatile', tool_choice: 'auto', max_completion_tokens: 8192 });
    expect(req.body.messages.map((m) => m.role)).toEqual(['system', 'user', 'assistant', 'user']);
    expect(req.body.tools[0]).toEqual({ type: 'function', function: { name: 'list_tasks', description: 'List tasks', parameters: tools[0].inputSchema } });

    const second = await turn.next([{ id: 'call_1', content: '{"tasks":[]}', isError: false }]);
    expect(second).toMatchObject({ text: 'Here you go.', stopReason: 'end_turn', toolCalls: [] });
    const msgs = requests[1].body.messages;
    expect(msgs.at(-2)).toMatchObject({ role: 'assistant', tool_calls: [{ id: 'call_1' }] });
    expect(msgs.at(-1)).toEqual({ role: 'tool', tool_call_id: 'call_1', name: 'list_tasks', content: '{"tasks":[]}' });
  });

  it('turns malformed tool arguments into something validation will reject', async () => {
    const { fetchImpl } = mockFetch([completion({ tool_calls: [{ id: 'c', type: 'function', function: { name: 'list_tasks', arguments: '{bad json' } }] }, 'tool_calls')]);
    const res = await createGroqProvider(cfg, { fetchImpl }).startTurn({ system: 's', tools, history: [], userMessage: 'x' }).next();
    expect(res.toolCalls[0].input).toEqual({ _unparseable_arguments: '{bad json' });
  });

  it('maps finish reasons', async () => {
    for (const [finish, expected] of [['length', 'max_tokens'], ['content_filter', 'refusal'], ['stop', 'end_turn']]) {
      const { fetchImpl } = mockFetch([completion({ content: 'x' }, finish)]);
      const res = await createGroqProvider(cfg, { fetchImpl }).startTurn({ system: 's', tools, history: [], userMessage: 'x' }).next();
      expect(res.stopReason).toBe(expected);
    }
  });

  it.each([
    [{ status: 401, body: { error: { message: 'bad key' } } }, 'auth', false],
    [{ status: 429, body: { error: { message: 'slow down' } } }, 'rate_limited', true],
    [{ status: 400, body: { error: { code: 'tool_use_failed', message: 'x' } } }, 'unavailable', true],
    [{ status: 400, body: { error: { code: 'invalid_request_error' } } }, 'bad_request', false],
    [{ status: 503, body: {} }, 'unavailable', true],
  ])('maps HTTP errors to ProviderError (%#)', async (response, code, retryable) => {
    const { fetchImpl } = mockFetch([response]);
    const err = await createGroqProvider(cfg, { fetchImpl }).startTurn({ system: 's', tools, history: [], userMessage: 'x' }).next().catch((e) => e);
    expect(err).toBeInstanceOf(ProviderError);
    expect(err).toMatchObject({ code, retryable });
  });

  it('does not duplicate tool results when a failed request is retried', async () => {
    const { fetchImpl, requests } = mockFetch([
      completion({ tool_calls: [{ id: 'c1', type: 'function', function: { name: 'list_tasks', arguments: '{}' } }] }, 'tool_calls'),
      { status: 503, body: {} },
      completion({ content: 'done' }),
    ]);
    const turn = createGroqProvider(cfg, { fetchImpl }).startTurn({ system: 's', tools, history: [], userMessage: 'x' });
    await turn.next();
    const results = [{ id: 'c1', content: '{}', isError: false }];
    await expect(turn.next(results)).rejects.toBeInstanceOf(ProviderError);
    await turn.next(results);
    expect(requests[2].body.messages.filter((m) => m.role === 'tool')).toHaveLength(1);
  });

  it('reports network failures as retryable', async () => {
    const { fetchImpl } = mockFetch([new TypeError('fetch failed')]);
    const err = await createGroqProvider(cfg, { fetchImpl }).startTurn({ system: 's', tools, history: [], userMessage: 'x' }).next().catch((e) => e);
    expect(err).toMatchObject({ code: 'unavailable', retryable: true });
  });
});
