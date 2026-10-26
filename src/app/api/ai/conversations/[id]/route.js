import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { aiError, guardAiRequest } from '@/lib/ai/http';
import { getOwnedConversation, serializeConversation } from '@/lib/ai/conversations';
import { serializeProposal } from '@/lib/ai/proposals';

// GET /api/ai/conversations/[id] - A conversation with its proposals (owner only)
export async function GET(request, { params }) {
  const guard = await guardAiRequest(request, { scope: 'ai-read', limit: 120 });
  if (guard.response) return guard.response;
  const { id } = await params;
  try {
    const conversation = await getOwnedConversation(prisma, guard.user.id, id);
    if (!conversation) return aiError('not_found', 'Conversation not found.', 404);
    const proposals = await prisma.agentProposal.findMany({
      where: { conversationId: conversation.id, userId: guard.user.id },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json({
      conversation: serializeConversation(conversation),
      proposals: proposals.map(serializeProposal),
    });
  } catch (error) {
    console.error('[ai] get conversation failed:', error.message);
    return aiError('internal_error', 'Failed to load the conversation.', 500);
  }
}

// DELETE /api/ai/conversations/[id] - Delete the user's own conversation history
export async function DELETE(request, { params }) {
  const guard = await guardAiRequest(request, { scope: 'ai-read', limit: 120 });
  if (guard.response) return guard.response;
  const { id } = await params;
  try {
    const conversation = await getOwnedConversation(prisma, guard.user.id, id);
    if (!conversation) return aiError('not_found', 'Conversation not found.', 404);
    // Pending proposals from this conversation can no longer be approved.
    await prisma.agentProposal.updateMany({
      where: { conversationId: conversation.id, userId: guard.user.id, status: 'pending' },
      data: { status: 'cancelled', decidedAt: new Date() },
    });
    await prisma.agentConversation.delete({ where: { id: conversation.id } });
    return NextResponse.json({ message: 'Conversation deleted' });
  } catch (error) {
    console.error('[ai] delete conversation failed:', error.message);
    return aiError('internal_error', 'Failed to delete the conversation.', 500);
  }
}
