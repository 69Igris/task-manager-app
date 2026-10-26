import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { signAccessToken } from '@/lib/jwt';
import { getAiConfig } from '@/lib/ai/config';
import { todayIn, addDays, isoToDueDate } from '@/lib/ai/dates';

export const hasDb = Boolean(process.env.TEST_DATABASE_URL);

export { prisma };

export async function resetDb() {
  await prisma.agentProposal.deleteMany();
  await prisma.agentConversation.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
}

let counter = 0;
export async function createUser(name = `User ${++counter}`) {
  const email = `${name.toLowerCase().replace(/\W+/g, '.')}.${Date.now()}.${counter++}@test.local`;
  return prisma.user.create({
    data: { name, email, passwordHash: await bcrypt.hash('Test123!', 4) },
    select: { id: true, name: true, email: true },
  });
}

export const today = () => todayIn('UTC');
export const dueIn = (days) => isoToDueDate(addDays(today(), days));

export async function createTaskFor(user, overrides = {}) {
  return prisma.task.create({
    data: {
      equipment: 'L36',
      area: 'Rack bar-01',
      title: 'A task',
      priority: 'medium',
      status: 'pending',
      assignedTo: [user.id],
      createdBy: user.id,
      ...overrides,
    },
  });
}

export function makeCtx(user, cfgOverrides = {}) {
  const now = new Date();
  const cfg = { ...getAiConfig(), ...cfgOverrides };
  return { prisma, user, cfg, now, today: todayIn(cfg.timezone, now) };
}

export function authHeader(user) {
  return { authorization: `Bearer ${signAccessToken(user.id)}` };
}

export function jsonRequest(url, { method = 'POST', body, headers = {} } = {}) {
  return new Request(`http://localhost${url}`, {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
