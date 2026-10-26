import { NextResponse } from 'next/server';
import { getAiConfig } from '@/lib/ai/config';
import { todayIn } from '@/lib/ai/dates';
import { guardAiRequest } from '@/lib/ai/http';
import { isProviderConfigured, requiredKeyFor } from '@/lib/ai/providers';

// GET /api/ai/status - Whether the assistant is configured, and its policy
export async function GET(request) {
  const guard = await guardAiRequest(request, { scope: 'ai-read', limit: 120 });
  if (guard.response) return guard.response;
  const cfg = getAiConfig();
  const configured = isProviderConfigured(cfg);
  return NextResponse.json({
    configured,
    provider: cfg.provider,
    requiredKey: requiredKeyFor(cfg),
    model: cfg.model,
    approvalMode: cfg.approvalMode,
    timezone: cfg.timezone,
    today: todayIn(cfg.timezone),
  });
}
