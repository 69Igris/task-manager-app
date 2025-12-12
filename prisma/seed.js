const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data
  await prisma.event.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  // Create users
  const hashedPassword = await bcrypt.hash('Test123!', 10);

  const maninder = await prisma.user.create({
    data: {
      email: 'maninder@company.com',
      name: 'Maninder',
      passwordHash: hashedPassword,
    },
  });

  const john = await prisma.user.create({
    data: {
      email: 'john@company.com',
      name: 'John Doe',
      passwordHash: hashedPassword,
    },
  });

  const sarah = await prisma.user.create({
    data: {
      email: 'sarah@company.com',
      name: 'Sarah Smith',
      passwordHash: hashedPassword,
    },
  });

  console.log('✅ Created users');

  // Create tasks (matching the screenshot example)
  await prisma.task.create({
    data: {
      equipment: 'L36',
      area: 'RACKBAR-1',
      title: 'Machine main door not working',
      status: 'pending',
      priority: 'high',
      assignedTo: [maninder.id],
      createdBy: john.id,
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
    },
  });

  await prisma.task.create({
    data: {
      equipment: 'L28',
      area: 'PINION-01',
      title: 'Induction hardning machine not work',
      status: 'pending',
      priority: 'high',
      assignedTo: [maninder.id, john.id], // Assigned to 2 people
      createdBy: john.id,
      createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), // 6 days ago
    },
  });

  await prisma.task.create({
    data: {
      equipment: 'N11',
      area: 'RACKBAR-5',
      title: 'Part present sensor not working',
      status: 'pending',
      priority: 'medium',
      assignedTo: [sarah.id],
      createdBy: maninder.id,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    },
  });

  await prisma.task.create({
    data: {
      equipment: 'N01',
      area: 'Laser Marking',
      title: 'Door damage mail send to maker san',
      status: 'in-progress',
      priority: 'low',
      assignedTo: [john.id],
      createdBy: sarah.id,
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    },
  });

  await prisma.task.create({
    data: {
      equipment: 'L15',
      area: 'Assembly Line',
      title: 'Conveyor belt alignment issue',
      status: 'completed',
      priority: 'medium',
      assignedTo: [john.id],
      createdBy: maninder.id,
      completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
  });

  console.log('✅ Created tasks');

  // Create upcoming events
  await prisma.event.create({
    data: {
      title: 'Annual Safety Audit',
      description: 'Yearly safety compliance audit by external auditors',
      eventDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      createdBy: maninder.id,
    },
  });

  await prisma.event.create({
    data: {
      title: 'Equipment Maintenance Shutdown',
      description: 'Scheduled maintenance for all production equipment',
      eventDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      createdBy: john.id,
    },
  });

  await prisma.event.create({
    data: {
      title: 'Team Meeting',
      description: 'Monthly production team meeting',
      eventDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      createdBy: maninder.id,
    },
  });

  console.log('✅ Created events');

  console.log('\n🎉 Seeding completed successfully!');
  console.log('\n📧 Test credentials:');
  console.log('Email: maninder@company.com | Password: Test123!');
  console.log('Email: john@company.com | Password: Test123!');
  console.log('Email: sarah@company.com | Password: Test123!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
