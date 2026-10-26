/**
 * Anthropic Claude provider (Messages API with client-side tools).
 */

import Anthropic from '@anthropic-ai/sdk';
import { ProviderError } from './errors';

let cachedClient = null;

function getClient() {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    throw new ProviderError('The AI assistant is not configured (missing ANTHROPIC_API_KEY).', 'not_configured');
  }
  // SDK-level retries are off; the orchestrator owns the retry budget.
  cachedClient ||= new Anthropic({ maxRetries: 0 });
  return cachedClient;
}

function toProviderError(error) {
  if (error instanceof ProviderError) return error;
  if (error instanceof Anthropic.APIUserAbortError) return new ProviderError('The request was cancelled.', 'timeout');
  if (error instanceof Anthropic.APIConnectionTimeoutError) return new ProviderError('The AI provider timed out.', 'timeout', true);
  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
    return new ProviderError('The AI provider rejected the credentials.', 'auth');
  }
  if (error instanceof Anthropic.RateLimitError) return new ProviderError('The AI provider is rate limiting requests.', 'rate_limited', true);
  if (error instanceof Anthropic.BadRequestError) return new ProviderError('The AI provider rejected the request.', 'bad_request');
  if (error instanceof Anthropic.InternalServerError) return new ProviderError('The AI provider is unavailable.', 'unavailable', true);
  if (error instanceof Anthropic.APIConnectionError) return new ProviderError('Could not reach the AI provider.', 'unavailable', true);
  if (error instanceof Anthropic.APIError) {
    const retryable = error.status === 529 || error.status >= 500;
    return new ProviderError('The AI provider returned an error.', retryable ? 'unavailable' : 'unknown', retryable);
  }
  return new ProviderError('Unexpected AI provider failure.', 'unknown');
}

export function createAnthropicProvider(cfg) {
  return {
    name: 'anthropic',
    model: cfg.model,

    startTurn({ system, tools, history, userMessage }) {
      const client = getClient();
      const messages = [
        ...history.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content: userMessage },
      ];
      const params = {
        model: cfg.model,
        max_tokens: cfg.maxOutputTokens,
        // The system prompt is static, so tools + system form a cacheable prefix.
        system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
        tools: tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.inputSchema })),
        output_config: { effort: cfg.effort },
      };
      const useFallback = cfg.refusalFallback === 'default';

      return {
        async next(toolResults = [], { signal } = {}) {
          if (toolResults.length) {
            messages.push({
              role: 'user',
              content: toolResults.map((r) => ({
                type: 'tool_result', tool_use_id: r.id, content: r.content, is_error: r.isError,
              })),
            });
          }

          let response;
          try {
            const request = { ...params, messages };
            response = useFallback
              ? await client.beta.messages.create(
                { ...request, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' },
                { signal, timeout: cfg.requestTimeoutMs }
              )
              : await client.messages.create(request, { signal, timeout: cfg.requestTimeoutMs });
          } catch (error) {
            // Drop the tool results we just appended so a retry resends them once.
            if (toolResults.length) messages.pop();
            throw toProviderError(error);
          }

          // Keep the full assistant content (thinking, fallback and tool_use
          // blocks) so the next request continues the same turn unchanged.
          messages.push({ role: 'assistant', content: response.content });

          const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
          const toolCalls = response.content
            .filter((b) => b.type === 'tool_use')
            .map((b) => ({ id: b.id, name: b.name, input: b.input }));

          return {
            text,
            toolCalls,
            stopReason: response.stop_reason,
            usage: {
              inputTokens: response.usage?.input_tokens ?? 0,
              outputTokens: response.usage?.output_tokens ?? 0,
              cacheReadTokens: response.usage?.cache_read_input_tokens ?? 0,
            },
          };
        },
      };
    },
  };
}
