import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

// Handle disconnect on process exit
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
