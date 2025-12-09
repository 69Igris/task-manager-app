import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123456', 10);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@taskapp.com' },
    update: {},
    create: {
      email: 'admin@taskapp.com',
      name: 'Admin User',
      passwordHash: adminPassword,
      role: 'admin',
    },
  });

  console.log('Created admin user:', { id: admin.id, email: admin.email, role: admin.role });

  // Create sample supervisor
  const supervisorPassword = await bcrypt.hash('supervisor123', 10);
  
  const supervisor = await prisma.user.upsert({
    where: { email: 'supervisor@taskapp.com' },
    update: {},
    create: {
      email: 'supervisor@taskapp.com',
      name: 'Supervisor User',
      passwordHash: supervisorPassword,
      role: 'supervisor',
    },
  });

  console.log('Created supervisor user:', { id: supervisor.id, email: supervisor.email, role: supervisor.role });

  // Create sample manager
  const managerPassword = await bcrypt.hash('manager123', 10);
  
  const manager = await prisma.user.upsert({
    where: { email: 'manager@taskapp.com' },
    update: {},
    create: {
      email: 'manager@taskapp.com',
      name: 'Manager User',
      passwordHash: managerPassword,
      role: 'manager',
    },
  });

  console.log('Created manager user:', { id: manager.id, email: manager.email, role: manager.role });

  // Create sample worker
  const workerPassword = await bcrypt.hash('worker123', 10);
  
  const worker = await prisma.user.upsert({
    where: { email: 'worker@taskapp.com' },
    update: {},
    create: {
      email: 'worker@taskapp.com',
      name: 'Worker User',
      passwordHash: workerPassword,
      role: 'worker',
    },
  });

  console.log('Created worker user:', { id: worker.id, email: worker.email, role: worker.role });

  console.log('\n✅ Seed completed successfully!');
  console.log('\nTest credentials:');
  console.log('Admin: admin@taskapp.com / admin123456');
  console.log('Supervisor: supervisor@taskapp.com / supervisor123');
  console.log('Manager: manager@taskapp.com / manager123');
  console.log('Worker: worker@taskapp.com / worker123');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
