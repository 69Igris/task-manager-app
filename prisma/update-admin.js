const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Updating maninder@company.com to admin role...');

  const updated = await prisma.user.updateMany({
    where: {
      email: 'maninder@company.com',
    },
    data: {
      role: 'admin',
    },
  });

  console.log(`✅ Updated ${updated.count} user(s)`);

  // Update all other users to 'worker' role if they don't have maninder's email
  const updatedWorkers = await prisma.user.updateMany({
    where: {
      email: { not: 'maninder@company.com' },
    },
    data: {
      role: 'worker',
    },
  });

  console.log(`✅ Updated ${updatedWorkers.count} user(s) to worker role`);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
