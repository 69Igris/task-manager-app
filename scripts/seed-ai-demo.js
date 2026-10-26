/**
 * Seed a small sprint for demonstrating the AI assistant.
 *
 * Additive and re-runnable: it creates two demo users if they don't exist and
 * replaces only the tasks those users created in the "Auth" project. Nothing
 * else in the database is touched.
 *
 *   node scripts/seed-ai-demo.js
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();
const PROJECT = 'Auth';

function day(offset) {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + offset);
  return d;
}

async function demoUser(email, name) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing;
  return prisma.user.create({ data: { email, name, passwordHash: await bcrypt.hash('Test123!', 10) } });
}

async function main() {
  const priya = await demoUser('priya.demo@taskforge.local', 'Priya Demo');
  const sam = await demoUser('sam.demo@taskforge.local', 'Sam Demo');

  await prisma.task.deleteMany({ where: { equipment: PROJECT, createdBy: { in: [priya.id, sam.id] } } });

  const tasks = [
    { title: 'Fix login form validation', area: 'Frontend', priority: 'high', status: 'in-progress', dueDate: day(-2), assignedTo: [priya.id] },
    { title: 'Implement refresh token rotation', area: 'Backend', priority: 'high', status: 'pending', dueDate: day(1), assignedTo: [sam.id] },
    { title: 'Add password reset email', area: 'Backend', priority: 'medium', status: 'pending', dueDate: day(4), assignedTo: [sam.id] },
    { title: 'Design account lockout policy', area: 'Security', priority: 'medium', status: 'pending', dueDate: null, assignedTo: [priya.id] },
    { title: 'Set up OAuth provider sandbox', area: 'Backend', priority: 'low', status: 'pending', dueDate: day(9), assignedTo: [sam.id, priya.id] },
    { title: 'Write session middleware', area: 'Backend', priority: 'high', status: 'completed', dueDate: day(-4), completedAt: day(-1), assignedTo: [priya.id] },
  ];

  const created = [];
  for (const t of tasks) {
    created.push(await prisma.task.create({ data: { ...t, equipment: PROJECT, createdBy: priya.id } }));
  }

  await prisma.comment.create({
    data: { taskId: created[1].id, authorId: sam.id, content: 'Blocked until the security team signs off on token lifetimes.' },
  });

  console.log(`Seeded ${created.length} "${PROJECT}" tasks. Log in as priya.demo@taskforge.local / Test123!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
