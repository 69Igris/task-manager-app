/**
 * Conversation memory: bounded, owner-scoped chat history. Only user prompts
 * and the assistant's final replies are kept — never tool output — so the agent
 * has to re-read the database for current task state.
 */

const OBJECT_ID = /^[a-f0-9]{24}$/i;

export async function getOwnedConversation(prisma, userId, conversationId) {
  if (!conversationId || !OBJECT_ID.test(conversationId)) return null;
  // Filtering on userId means other users' conversations are indistinguishable from missing ones.
  return prisma.agentConversation.findFirst({ where: { id: conversationId, userId } });
}

export async function createConversation(prisma, userId, firstMessage) {
  const title = firstMessage.replace(/\s+/g, ' ').trim().slice(0, 80) || 'New conversation';
  return prisma.agentConversation.create({ data: { userId, title, messages: [] } });
}

/** The last `limit` messages, starting with a user message, for the model. */
export function historyForModel(conversation, limit) {
  const messages = (conversation?.messages || []).slice(-limit);
  while (messages.length && messages[0].role !== 'user') messages.shift();
  return messages.map((m) => ({ role: m.role, content: m.content }));
}

/** A previous reply to the same client message id, for retried requests. */
export function findReplyToClientMessage(conversation, clientMessageId) {
  if (!conversation || !clientMessageId) return null;
  const msgs = conversation.messages || [];
  const idx = msgs.findIndex((m) => m.role === 'user' && m.clientMessageId === clientMessageId);
  if (idx === -1) return null;
  return msgs.slice(idx + 1).find((m) => m.role === 'assistant') || null;
}

export async function appendMessages(prisma, conversation, newMessages, { maxStored, project }) {
  const messages = [...(conversation.messages || []), ...newMessages].slice(-maxStored);
  return prisma.agentConversation.update({
    where: { id: conversation.id },
    data: { messages, ...(project !== undefined ? { project } : {}) },
  });
}

export function serializeConversation(conversation) {
  return {
    id: conversation.id,
    title: conversation.title,
    project: conversation.project,
    updatedAt: conversation.updatedAt,
    messages: (conversation.messages || []).map((m) => ({
      role: m.role, content: m.content, proposalId: m.proposalId || null, createdAt: m.createdAt,
    })),
  };
}
