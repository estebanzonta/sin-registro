import 'dotenv/config';
import bcryptjs from 'bcryptjs';
import { pathToFileURL } from 'url';
import { prisma } from './db.js';

export async function createAdminUser(options: { disconnect?: boolean } = {}) {
  const { disconnect = true } = options;

  try {
    const hashedPassword = await bcryptjs.hash('admin123456', 10);

    const admin = await prisma.user.upsert({
      where: { email: 'admin@example.com' },
      update: {},
      create: {
        email: 'admin@example.com',
        password: hashedPassword,
        role: 'admin',
      },
    });

    console.log('Admin user created or already exists:', admin.email);
  } catch (error) {
    console.error('Create admin error:', error);
    throw error;
  } finally {
    if (disconnect) {
      await prisma.$disconnect();
    }
  }
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  createAdminUser();
}
