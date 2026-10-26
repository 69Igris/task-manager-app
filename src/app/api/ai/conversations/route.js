import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { aiError, guardAiRequest } from '@/lib/ai/http';

// GET /api/ai/conversations - The current user's recent assistant conversations
export async function GET(request) {
  const guard = await guardAiRequest(request, { scope: 'ai-read', limit: 120 });
  if (guard.response) return guard.response;
  try {
    const conversations = await prisma.agentConversation.findMany({
      where: { userId: guard.user.id },
      select: { id: true, title: true, project: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: 30,
    });
    return NextResponse.json({ conversations });
  } catch (error) {
    console.error('[ai] list conversations failed:', error.message);
    return aiError('internal_error', 'Failed to load conversations.', 500);
  }
}
