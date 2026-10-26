/**
 * Groq provider (OpenAI-compatible Chat Completions with function calling).
 */

import { ProviderError } from './errors';

const ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

const STOP_REASONS = {
  stop: 'end_turn',
  tool_calls: 'tool_use',
  length: 'max_tokens',
  content_filter: 'refusal',
};

function parseArguments(raw) {
  if (raw && typeof raw === 'object') return raw;
  try {
    const parsed = JSON.parse(raw || '{}');
    return parsed && typeof parsed === 'object' ? parsed : { _unparseable_arguments: String(raw) };
  } catch {
    // Surfaces as a validation error the model can read and correct.
    return { _unparseable_arguments: String(raw).slice(0, 200) };
  }
}

async function toProviderError(res) {
  let body = null;
  try { body = await res.json(); } catch { /* non-JSON error body */ }
  const code = body?.error?.code;
  if (res.status === 401 || res.status === 403) return new ProviderError('The AI provider rejected the credentials.', 'auth');
  if (res.status === 429) return new ProviderError('The AI provider is rate limiting requests.', 'rate_limited', true);
  // The model produced a malformed tool call; a fresh attempt usually succeeds.
  if (res.status === 400 && code === 'tool_use_failed') {
    return new ProviderError('The model produced an invalid tool call.', 'unavailable', true);
  }
  if (res.status === 400 || res.status === 404 || res.status === 422) {
    return new ProviderError('The AI provider rejected the request.', 'bad_request');
  }
  if (res.status >= 500) return new ProviderError('The AI provider is unavailable.', 'unavailable', true);
  return new ProviderError('The AI provider returned an error.', 'unknown');
}

export function createGroqProvider(cfg, { fetchImpl = globalThis.fetch } = {}) {
  return {
    name: 'groq',
    model: cfg.model,

    startTurn({ system, tools, history, userMessage }) {
      const apiKey = process.env.GROQ_API_KEY;
      if (!apiKey) throw new ProviderError('The AI assistant is not configured (missing GROQ_API_KEY).', 'not_configured');

      const messages = [
        { role: 'system', content: system },
        ...history.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content: userMessage },
      ];
      const toolDefs = tools.map((t) => ({
        type: 'function',
        function: { name: t.name, description: t.description, parameters: t.inputSchema },
      }));
      const toolNames = new Map();

      return {
        async next(toolResults = [], { signal } = {}) {
          const appended = toolResults.map((r) => ({
            role: 'tool', tool_call_id: r.id, name: toolNames.get(r.id) || 'tool', content: r.content,
          }));
          messages.push(...appended);

          const timeout = AbortSignal.timeout(cfg.requestTimeoutMs);
          let res;
          try {
            res = await fetchImpl(ENDPOINT, {
              method: 'POST',
              headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
              body: JSON.stringify({
                model: cfg.model,
                messages,
                tools: toolDefs,
                tool_choice: 'auto',
                max_completion_tokens: cfg.maxOutputTokens,
                temperature: 0.2,
              }),
              signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
            });
          } catch (error) {
            messages.splice(messages.length - appended.length, appended.length);
            if (error?.name === 'TimeoutError') throw new ProviderError('The AI provider timed out.', 'timeout', true);
            if (error?.name === 'AbortError') throw new ProviderError('The request was cancelled.', 'timeout');
            throw new ProviderError('Could not reach the AI provider.', 'unavailable', true);
          }

          if (!res.ok) {
            // Drop the tool results we just appended so a retry resends them once.
            messages.splice(messages.length - appended.length, appended.length);
            throw await toProviderError(res);
          }

          const data = await res.json();
          const choice = data.choices?.[0];
          const message = choice?.message || {};
          const rawCalls = Array.isArray(message.tool_calls) ? message.tool_calls : [];

          // Echo only the fields the API accepts back (drops e.g. `reasoning`).
          messages.push({
            role: 'assistant',
            content: message.content ?? null,
            ...(rawCalls.length ? { tool_calls: rawCalls } : {}),
          });

          const toolCalls = rawCalls.map((c) => {
            toolNames.set(c.id, c.function?.name);
            return { id: c.id, name: c.function?.name, input: parseArguments(c.function?.arguments) };
          });

          return {
            text: (message.content || '').trim(),
            toolCalls,
            stopReason: toolCalls.length ? 'tool_use' : STOP_REASONS[choice?.finish_reason] || 'end_turn',
            usage: {
              inputTokens: data.usage?.prompt_tokens ?? 0,
              outputTokens: data.usage?.completion_tokens ?? 0,
              cacheReadTokens: 0,
            },
          };
        },
      };
    },
  };
}
