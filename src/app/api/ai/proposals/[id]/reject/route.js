import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAiConfig } from '@/lib/ai/config';
import { aiError, guardAiRequest } from '@/lib/ai/http';
import { ProposalError, rejectProposal, serializeProposal } from '@/lib/ai/proposals';

// POST /api/ai/proposals/[id]/reject - Cancel a pending proposal
export async function POST(request, { params }) {
  const guard = await guardAiRequest(request, { scope: 'ai-approve', limit: 30 });
  if (guard.response) return guard.response;
  const { id } = await params;
  try {
    const { proposal, duplicate } = await rejectProposal(prisma, guard.user, id, { cfg: getAiConfig() });
    return NextResponse.json({ proposal: serializeProposal(proposal), duplicate });
  } catch (error) {
    if (error instanceof ProposalError) {
      return aiError(error.code, error.message, error.status, { proposal: serializeProposal(error.proposal) });
    }
    console.error('[ai] reject failed:', error.message);
    return aiError('internal_error', 'Failed to cancel the proposal.', 500);
  }
}
