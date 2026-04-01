import 'dotenv/config';
import { prisma } from './db.js';

async function main() {
  const counts = {
    users: await prisma.user.count(),
    orders: await prisma.order.count(),
    garmentModels: await prisma.garmentModel.count(),
    designs: await prisma.design.count(),
    uploadTemplates: await prisma.uploadTemplate.count(),
    categories: await prisma.category.count(),
  };

  console.log(JSON.stringify(counts, null, 2));
}

main()
  .catch((error) => {
    console.error('Check dev data counts error:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
