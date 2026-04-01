import { prisma } from './db.js';

async function getTestData() {
  try {
    const garmentModel = await prisma.garmentModel.findUnique({
      where: { slug: 'classic-tshirt' },
      include: { colors: true, sizes: true },
    });

    const colors = await prisma.color.findMany();
    const sizes = await prisma.size.findMany();

    console.log('=== GARMENT MODEL ===');
    console.log(`ID: ${garmentModel?.id}`);
    console.log(`Name: ${garmentModel?.name}`);

    console.log('\n=== COLORS ===');
    colors.forEach(c => console.log(`${c.name}: ${c.id}`));

    console.log('\n=== SIZES ===');
    sizes.forEach(s => console.log(`${s.name}: ${s.id}`));

    console.log('\n=== COPY THIS FOR ORDER TEST ===');
    console.log(`garmentModelId: ${garmentModel?.id}`);
    console.log(`colorId: ${colors[0]?.id}`);
    console.log(`sizeId: ${sizes[0]?.id}`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getTestData();
