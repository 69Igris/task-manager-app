import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAiConfig } from '@/lib/ai/config';
import { aiError, guardAiRequest, readJsonBody, zodMessage } from '@/lib/ai/http';
import { ProposalError, approveProposal, serializeProposal } from '@/lib/ai/proposals';

const schema = z.object({
  actionIds: z.array(z.string().regex(/^a\d{1,3}$/)).max(50).optional(),
}).strict();

// POST /api/ai/proposals/[id]/approve - Execute an approved proposal (idempotent)
export async function POST(request, { params }) {
  const guard = await guardAiRequest(request, { scope: 'ai-approve', limit: 30 });
  if (guard.response) return guard.response;
  const { body, response } = await readJsonBody(request, 4096);
  if (response) return response;
  const parsed = schema.safeParse(body);
  if (!parsed.success) return aiError('invalid_request', zodMessage(parsed.error), 400);

  const { id } = await params;
  try {
    const { proposal, duplicate } = await approveProposal(prisma, guard.user, id, { actionIds: parsed.data.actionIds, cfg: getAiConfig() });
    return NextResponse.json({ proposal: serializeProposal(proposal), duplicate });
  } catch (error) {
    if (error instanceof ProposalError) {
      return aiError(error.code, error.message, error.status, { proposal: serializeProposal(error.proposal) });
    }
    console.error('[ai] approve failed:', error.message);
    return aiError('internal_error', 'Failed to execute the proposal.', 500);
  }
}
