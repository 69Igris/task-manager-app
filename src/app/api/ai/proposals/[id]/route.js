import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { aiError, guardAiRequest } from '@/lib/ai/http';
import { getOwnedProposal, serializeProposal } from '@/lib/ai/proposals';

// GET /api/ai/proposals/[id] - A proposal and its results (owner only)
export async function GET(request, { params }) {
  const guard = await guardAiRequest(request, { scope: 'ai-read', limit: 120 });
  if (guard.response) return guard.response;
  const { id } = await params;
  const proposal = await getOwnedProposal(prisma, guard.user.id, id);
  if (!proposal) return aiError('not_found', 'Proposal not found.', 404);
  return NextResponse.json({ proposal: serializeProposal(proposal) });
}
