import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAiConfig } from '@/lib/ai/config';
import { getProvider } from '@/lib/ai/providers';
import { ChatError, chatRequestSchema, handleChat } from '@/lib/ai/chat';
import { aiError, guardAiRequest, readJsonBody, zodMessage } from '@/lib/ai/http';

export const runtime = 'nodejs';
export const maxDuration = 120;

// POST /api/ai/chat - Send a message to the AI assistant
export async function POST(request) {
  const cfg = getAiConfig();
  const guard = await guardAiRequest(request, { scope: 'ai-chat', limit: cfg.rateLimitPerMinute });
  if (guard.response) return guard.response;

  const { body, response } = await readJsonBody(request, cfg.maxMessageChars * 4 + 1024);
  if (response) return response;
  const parsed = chatRequestSchema(cfg).safeParse(body);
  if (!parsed.success) return aiError('invalid_request', zodMessage(parsed.error), 400);

  try {
    const provider = getProvider(cfg);
    const result = await handleChat({ prisma, user: guard.user, provider, cfg, input: parsed.data });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ChatError) {
      return aiError(error.code, error.message, error.status, { executedActions: error.executedActions || [] });
    }
    if (error?.code === 'not_configured') return aiError('provider_not_configured', error.message, 503);
    console.error('[ai] chat route error:', error.message);
    return aiError('internal_error', 'The assistant hit an unexpected error.', 500);
  }
}
