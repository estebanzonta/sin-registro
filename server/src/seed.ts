import 'dotenv/config';
import { pathToFileURL } from 'url';
import { prisma } from './db.js';

export async function seedDatabase(options: { disconnect?: boolean } = {}) {
  const { disconnect = true } = options;

  try {
    console.log('Seeding database...');

    const category = await prisma.category.upsert({
      where: { slug: 'indumentaria' },
      update: { name: 'Indumentaria' },
      create: {
        name: 'Indumentaria',
        slug: 'indumentaria',
      },
    });

    const sizes = await Promise.all(
      ['S', 'M', 'L', 'XL'].map((name) =>
        prisma.size.upsert({
          where: { name },
          update: {},
          create: { name },
        })
      )
    );

    const colors = await Promise.all([
      prisma.color.upsert({
        where: { name: 'Black' },
        update: { hex: '#111111', active: true },
        create: { name: 'Black', hex: '#111111' },
      }),
      prisma.color.upsert({
        where: { name: 'White' },
        update: { hex: '#F8F8F8', active: true },
        create: { name: 'White', hex: '#F8F8F8' },
      }),
      prisma.color.upsert({
        where: { name: 'Navy' },
        update: { hex: '#12233D', active: true },
        create: { name: 'Navy', hex: '#12233D' },
      }),
    ]);

    const placements = await Promise.all([
      prisma.placement.upsert({
        where: { code: 'FRONT' },
        update: { name: 'Estampa frente', kind: 'print', surface: 'front', active: true },
        create: { code: 'FRONT', name: 'Estampa frente', kind: 'print', surface: 'front' },
      }),
      prisma.placement.upsert({
        where: { code: 'BACK' },
        update: { name: 'Estampa espalda', kind: 'print', surface: 'back', active: true },
        create: { code: 'BACK', name: 'Estampa espalda', kind: 'print', surface: 'back' },
      }),
      prisma.placement.upsert({
        where: { code: 'LF' },
        update: { name: 'Logo frente medio', kind: 'logo', surface: 'front', active: true },
        create: { code: 'LF', name: 'Logo frente medio', kind: 'logo', surface: 'front' },
      }),
      prisma.placement.upsert({
        where: { code: 'LC' },
        update: { name: 'Logo cuello espalda', kind: 'logo', surface: 'neck', active: true },
        create: { code: 'LC', name: 'Logo cuello espalda', kind: 'logo', surface: 'neck' },
      }),
      prisma.placement.upsert({
        where: { code: 'IBR' },
        update: { name: 'Logo manga', kind: 'logo', surface: 'sleeve', active: true },
        create: { code: 'IBR', name: 'Logo manga', kind: 'logo', surface: 'sleeve' },
      }),
    ]);

    const placementByCode = Object.fromEntries(placements.map((placement) => [placement.code, placement]));

    const garmentModel = await prisma.garmentModel.upsert({
      where: { slug: 'remera-oversize' },
      update: {
        categoryId: category.id,
        name: 'Remera Oversize',
        description: 'Remera oversize para estampas grandes y composiciones personalizadas.',
        basePrice: 29.99,
        frontMockupUrl: '/mockups/remera-oversize-front.png',
        backMockupUrl: '/mockups/remera-oversize-back.png',
        active: true,
      },
      create: {
        categoryId: category.id,
        name: 'Remera Oversize',
        slug: 'remera-oversize',
        description: 'Remera oversize para estampas grandes y composiciones personalizadas.',
        basePrice: 29.99,
        frontMockupUrl: '/mockups/remera-oversize-front.png',
        backMockupUrl: '/mockups/remera-oversize-back.png',
      },
    });

    for (const size of sizes) {
      await prisma.garmentModelSize.upsert({
        where: {
          garmentModelId_sizeId: {
            garmentModelId: garmentModel.id,
            sizeId: size.id,
          },
        },
        update: { active: true },
        create: {
          garmentModelId: garmentModel.id,
          sizeId: size.id,
        },
      });
    }

    for (const color of colors) {
      await prisma.garmentModelColor.upsert({
        where: {
          garmentModelId_colorId: {
            garmentModelId: garmentModel.id,
            colorId: color.id,
          },
        },
        update: { active: true },
        create: {
          garmentModelId: garmentModel.id,
          colorId: color.id,
        },
      });
    }

    for (const size of sizes) {
      for (const color of colors) {
        await prisma.blankStock.upsert({
          where: {
            garmentModelId_colorId_sizeId: {
              garmentModelId: garmentModel.id,
              colorId: color.id,
              sizeId: size.id,
            },
          },
          update: { quantity: 100 },
          create: {
            garmentModelId: garmentModel.id,
            colorId: color.id,
            sizeId: size.id,
            quantity: 100,
          },
        });
      }
    }

    await prisma.printArea.upsert({
      where: {
        garmentModelId_placementId: {
          garmentModelId: garmentModel.id,
          placementId: placementByCode.FRONT.id,
        },
      },
      update: { xPct: 30, yPct: 22, widthPct: 40, heightPct: 52, active: true },
      create: {
        garmentModelId: garmentModel.id,
        placementId: placementByCode.FRONT.id,
        xPct: 30,
        yPct: 22,
        widthPct: 40,
        heightPct: 52,
      },
    });

    await prisma.printArea.upsert({
      where: {
        garmentModelId_placementId: {
          garmentModelId: garmentModel.id,
          placementId: placementByCode.BACK.id,
        },
      },
      update: { xPct: 28, yPct: 20, widthPct: 44, heightPct: 56, active: true },
      create: {
        garmentModelId: garmentModel.id,
        placementId: placementByCode.BACK.id,
        xPct: 28,
        yPct: 20,
        widthPct: 44,
        heightPct: 56,
      },
    });

    const designCategories = await Promise.all([
      { name: 'Musiquita', slug: 'musiquita', code: 'MUS' },
      { name: 'Posters', slug: 'posters', code: 'POS' },
      { name: 'Arte', slug: 'arte', code: 'ART' },
      { name: 'Naturaleza', slug: 'naturaleza', code: 'NAT' },
      { name: 'Argentina', slug: 'argentina', code: 'ARG' },
      { name: 'Personajes', slug: 'personajes', code: 'PER' },
      { name: 'Frases', slug: 'frases', code: 'FRA' },
      { name: 'Memes', slug: 'memes', code: 'MEM' },
    ].map((item) =>
      prisma.designCategory.upsert({
        where: { slug: item.slug },
        update: { name: item.name, code: item.code, active: true },
        create: item,
      })
    ));

    const designCategoryBySlug = Object.fromEntries(designCategories.map((item) => [item.slug, item]));

    const capsuleCollection = await prisma.collection.upsert({
      where: { slug: 'capsula-mundial' },
      update: {
        name: 'Capsula Mundial',
        type: 'capsule',
        active: true,
        startsAt: new Date('2026-06-01T00:00:00Z'),
        endsAt: new Date('2026-07-31T23:59:59Z'),
      },
      create: {
        name: 'Capsula Mundial',
        slug: 'capsula-mundial',
        type: 'capsule',
        description: 'Coleccion limitada por evento',
        startsAt: new Date('2026-06-01T00:00:00Z'),
        endsAt: new Date('2026-07-31T23:59:59Z'),
      },
    });

    const seededDesigns = [
      {
        name: 'Beat Poster',
        slug: 'beat-poster',
        code: 'MUS01',
        description: 'Poster musical en alto contraste.',
        imageUrl: '/designs/beat-poster.png',
        categorySlug: 'musiquita',
        collectionId: null,
        limited: false,
        placements: ['FRONT'],
        sizes: [
          { sizeCode: 'grande', widthCm: 28, heightCm: 36, stock: 12, extraPrice: 8 },
          { sizeCode: 'mediano', widthCm: 22, heightCm: 28, stock: 16, extraPrice: 5 },
          { sizeCode: 'chico', widthCm: 16, heightCm: 20, stock: 20, extraPrice: 3 },
        ],
      },
      {
        name: 'Sur Poster',
        slug: 'sur-poster',
        code: 'POS01',
        description: 'Grafica estilo poster con look editorial.',
        imageUrl: '/designs/sur-poster.png',
        categorySlug: 'posters',
        collectionId: null,
        limited: false,
        placements: ['BACK'],
        sizes: [
          { sizeCode: 'grande', widthCm: 30, heightCm: 40, stock: 10, extraPrice: 9 },
          { sizeCode: 'mediano', widthCm: 24, heightCm: 30, stock: 14, extraPrice: 6 },
        ],
      },
      {
        name: 'Mundial 26',
        slug: 'mundial-26',
        code: 'ARG01',
        description: 'Capsula especial para futbol.',
        imageUrl: '/designs/mundial-26.png',
        categorySlug: null,
        collectionId: capsuleCollection.id,
        limited: true,
        placements: ['FRONT', 'BACK'],
        sizes: [
          { sizeCode: 'mediano', widthCm: 22, heightCm: 28, stock: 8, extraPrice: 7 },
          { sizeCode: 'chico', widthCm: 16, heightCm: 20, stock: 10, extraPrice: 4 },
        ],
      },
    ] as const;

    for (const item of seededDesigns) {
      const existingByCode = await prisma.design.findUnique({
        where: { code: item.code },
      });
      const existingBySlug = await prisma.design.findUnique({
        where: { slug: item.slug },
      });

      if (existingByCode && existingBySlug && existingByCode.id !== existingBySlug.id) {
        await prisma.designPlacement.deleteMany({
          where: { designId: existingBySlug.id },
        });
        await prisma.designTransferSize.deleteMany({
          where: { designId: existingBySlug.id },
        });
        await prisma.design.delete({
          where: { id: existingBySlug.id },
        });
      }

      const targetDesign = existingByCode || existingBySlug;

      const design = targetDesign
        ? await prisma.design.update({
            where: { id: targetDesign.id },
            data: {
              collectionId: item.collectionId,
              designCategoryId: item.categorySlug ? designCategoryBySlug[item.categorySlug].id : null,
              name: item.name,
              slug: item.slug,
              code: item.code,
              description: item.description,
              imageUrl: item.imageUrl,
              active: true,
              limited: item.limited,
            },
          })
        : await prisma.design.create({
            data: {
              collectionId: item.collectionId,
              designCategoryId: item.categorySlug ? designCategoryBySlug[item.categorySlug].id : null,
              name: item.name,
              slug: item.slug,
              code: item.code,
              description: item.description,
              imageUrl: item.imageUrl,
              limited: item.limited,
            },
          });

      for (const placementCode of item.placements) {
        await prisma.designPlacement.upsert({
          where: {
            designId_placementId: {
              designId: design.id,
              placementId: placementByCode[placementCode].id,
            },
          },
          update: {},
          create: {
            designId: design.id,
            placementId: placementByCode[placementCode].id,
          },
        });
      }

      for (const sizeOption of item.sizes) {
        await prisma.designTransferSize.upsert({
          where: {
            designId_sizeCode: {
              designId: design.id,
              sizeCode: sizeOption.sizeCode,
            },
          },
          update: {
            widthCm: sizeOption.widthCm,
            heightCm: sizeOption.heightCm,
            stock: sizeOption.stock,
            extraPrice: sizeOption.extraPrice,
            active: true,
          },
          create: {
            designId: design.id,
            sizeCode: sizeOption.sizeCode,
            widthCm: sizeOption.widthCm,
            heightCm: sizeOption.heightCm,
            stock: sizeOption.stock,
            extraPrice: sizeOption.extraPrice,
          },
        });
      }
    }

    const uploadTemplates = [
      {
        code: 'FS_01',
        slug: 'foto-simple-frente-mediano',
        name: 'Foto simple frente mediano',
        customizationType: 'photo_simple',
        description: 'Una foto simple en frente con tamano mediano.',
        requiredImageCount: 1,
        allowsText: false,
        placementCode: 'FRONT',
        sizeOptions: [{ sizeCode: 'mediano', widthCm: 22, heightCm: 28, extraPrice: 6 }],
      },
      {
        code: 'FS_02',
        slug: 'foto-simple-frente-grande',
        name: 'Foto simple frente grande',
        customizationType: 'photo_simple',
        description: 'Una foto simple en frente con tamano grande.',
        requiredImageCount: 1,
        allowsText: false,
        placementCode: 'FRONT',
        sizeOptions: [{ sizeCode: 'grande', widthCm: 28, heightCm: 36, extraPrice: 8 }],
      },
      {
        code: 'FS_03',
        slug: 'foto-simple-espalda-mediano',
        name: 'Foto simple espalda mediano',
        customizationType: 'photo_simple',
        description: 'Una foto simple en espalda con tamano mediano.',
        requiredImageCount: 1,
        allowsText: false,
        placementCode: 'BACK',
        sizeOptions: [{ sizeCode: 'mediano', widthCm: 22, heightCm: 28, extraPrice: 6 }],
      },
      {
        code: 'FS_04',
        slug: 'foto-simple-espalda-grande',
        name: 'Foto simple espalda grande',
        customizationType: 'photo_simple',
        description: 'Una foto simple en espalda con tamano grande.',
        requiredImageCount: 1,
        allowsText: false,
        placementCode: 'BACK',
        sizeOptions: [{ sizeCode: 'grande', widthCm: 30, heightCm: 40, extraPrice: 8 }],
      },
      {
        code: 'FC_01',
        slug: 'foto-collage-frente-1',
        name: 'Foto collage frente diseno 1',
        customizationType: 'photo_collage',
        description: 'Collage de 4 fotos en frente.',
        requiredImageCount: 4,
        allowsText: false,
        placementCode: 'FRONT',
        sizeOptions: [{ sizeCode: 'mediano', widthCm: 24, heightCm: 30, extraPrice: 7 }],
      },
      {
        code: 'FC_02',
        slug: 'foto-collage-frente-2',
        name: 'Foto collage frente diseno 2',
        customizationType: 'photo_collage',
        description: 'Collage de 3 fotos en frente.',
        requiredImageCount: 3,
        allowsText: false,
        placementCode: 'FRONT',
        sizeOptions: [{ sizeCode: 'mediano', widthCm: 24, heightCm: 30, extraPrice: 7 }],
      },
      {
        code: 'FC_03',
        slug: 'foto-collage-frente-3',
        name: 'Foto collage frente diseno 3',
        customizationType: 'photo_collage',
        description: 'Collage de 3 fotos en frente.',
        requiredImageCount: 3,
        allowsText: false,
        placementCode: 'FRONT',
        sizeOptions: [{ sizeCode: 'mediano', widthCm: 24, heightCm: 30, extraPrice: 7 }],
      },
      {
        code: 'FC_04',
        slug: 'foto-collage-frente-4',
        name: 'Foto collage frente diseno 4',
        customizationType: 'photo_collage',
        description: 'Collage de 2 fotos en frente.',
        requiredImageCount: 2,
        allowsText: false,
        placementCode: 'FRONT',
        sizeOptions: [{ sizeCode: 'mediano', widthCm: 24, heightCm: 30, extraPrice: 7 }],
      },
      {
        code: 'FC_05',
        slug: 'foto-collage-espalda-1',
        name: 'Foto collage espalda diseno 1',
        customizationType: 'photo_collage',
        description: 'Collage de 4 fotos en espalda.',
        requiredImageCount: 4,
        allowsText: false,
        placementCode: 'BACK',
        sizeOptions: [{ sizeCode: 'mediano', widthCm: 26, heightCm: 32, extraPrice: 7 }],
      },
      {
        code: 'FC_06',
        slug: 'foto-collage-espalda-2',
        name: 'Foto collage espalda diseno 2',
        customizationType: 'photo_collage',
        description: 'Collage de 3 fotos en espalda.',
        requiredImageCount: 3,
        allowsText: false,
        placementCode: 'BACK',
        sizeOptions: [{ sizeCode: 'mediano', widthCm: 26, heightCm: 32, extraPrice: 7 }],
      },
      {
        code: 'FC_07',
        slug: 'foto-collage-espalda-4',
        name: 'Foto collage espalda diseno 4',
        customizationType: 'photo_collage',
        description: 'Collage de 2 fotos en espalda.',
        requiredImageCount: 2,
        allowsText: false,
        placementCode: 'BACK',
        sizeOptions: [{ sizeCode: 'mediano', widthCm: 26, heightCm: 32, extraPrice: 7 }],
      },
      {
        code: 'M_01',
        slug: 'mascotas-frente-1',
        name: 'Mascotas diseno 1',
        customizationType: 'pets',
        description: 'Collage de mascotas con nombre.',
        requiredImageCount: 4,
        allowsText: true,
        textLabel: 'Nombre',
        placementCode: 'FRONT',
        sizeOptions: [{ sizeCode: 'mediano', widthCm: 24, heightCm: 30, extraPrice: 8 }],
      },
      {
        code: 'M_02',
        slug: 'mascotas-frente-2',
        name: 'Mascotas diseno 2',
        customizationType: 'pets',
        description: 'Mascota destacada con nombre.',
        requiredImageCount: 1,
        allowsText: true,
        textLabel: 'Nombre',
        placementCode: 'FRONT',
        sizeOptions: [{ sizeCode: 'mediano', widthCm: 24, heightCm: 30, extraPrice: 8 }],
      },
      {
        code: 'M_03',
        slug: 'mascotas-frente-3',
        name: 'Mascotas diseno 3',
        customizationType: 'pets',
        description: 'Collage de 5 fotos.',
        requiredImageCount: 5,
        allowsText: false,
        placementCode: 'FRONT',
        sizeOptions: [{ sizeCode: 'mediano', widthCm: 24, heightCm: 30, extraPrice: 8 }],
      },
      {
        code: 'M_04',
        slug: 'mascotas-frente-4',
        name: 'Mascotas diseno 4',
        customizationType: 'pets',
        description: 'Retrato simple de mascota.',
        requiredImageCount: 1,
        allowsText: false,
        placementCode: 'FRONT',
        sizeOptions: [{ sizeCode: 'mediano', widthCm: 24, heightCm: 30, extraPrice: 8 }],
      },
      {
        code: 'M_05',
        slug: 'mascotas-frente-5',
        name: 'Mascotas diseno 5',
        customizationType: 'pets',
        description: 'Retrato simple de mascota.',
        requiredImageCount: 1,
        allowsText: false,
        placementCode: 'FRONT',
        sizeOptions: [{ sizeCode: 'mediano', widthCm: 24, heightCm: 30, extraPrice: 8 }],
      },
      {
        code: 'M_06',
        slug: 'mascotas-simple-mediano',
        name: 'Mascotas foto simple mediano',
        customizationType: 'pets',
        description: 'Foto simple de mascota en tamano mediano.',
        requiredImageCount: 1,
        allowsText: false,
        placementCode: 'FRONT',
        sizeOptions: [{ sizeCode: 'mediano', widthCm: 22, heightCm: 28, extraPrice: 6 }],
      },
      {
        code: 'M_07',
        slug: 'mascotas-simple-grande',
        name: 'Mascotas foto simple grande',
        customizationType: 'pets',
        description: 'Foto simple de mascota en tamano grande.',
        requiredImageCount: 1,
        allowsText: false,
        placementCode: 'FRONT',
        sizeOptions: [{ sizeCode: 'grande', widthCm: 28, heightCm: 36, extraPrice: 8 }],
      },
    ] as const;

    for (const templateItem of uploadTemplates) {
      const textLabel = 'textLabel' in templateItem ? templateItem.textLabel : null;

      const template = await prisma.uploadTemplate.upsert({
        where: { code: templateItem.code },
        update: {
          name: templateItem.name,
          slug: templateItem.slug,
          customizationType: templateItem.customizationType,
          description: templateItem.description,
          requiredImageCount: templateItem.requiredImageCount,
          allowsText: templateItem.allowsText,
          textLabel,
          placementId: placementByCode[templateItem.placementCode].id,
          active: true,
        },
        create: {
          code: templateItem.code,
          slug: templateItem.slug,
          name: templateItem.name,
          customizationType: templateItem.customizationType,
          description: templateItem.description,
          requiredImageCount: templateItem.requiredImageCount,
          allowsText: templateItem.allowsText,
          textLabel,
          placementId: placementByCode[templateItem.placementCode].id,
        },
      });

      for (const sizeOption of templateItem.sizeOptions) {
        await prisma.uploadTemplateSize.upsert({
          where: {
            uploadTemplateId_sizeCode: {
              uploadTemplateId: template.id,
              sizeCode: sizeOption.sizeCode,
            },
          },
          update: {
            widthCm: sizeOption.widthCm,
            heightCm: sizeOption.heightCm,
            extraPrice: sizeOption.extraPrice,
            active: true,
          },
          create: {
            uploadTemplateId: template.id,
            sizeCode: sizeOption.sizeCode,
            widthCm: sizeOption.widthCm,
            heightCm: sizeOption.heightCm,
            extraPrice: sizeOption.extraPrice,
          },
        });
      }
    }

    console.log('Database seeded successfully');
  } catch (error) {
    console.error('Seed error:', error);
    throw error;
  } finally {
    if (disconnect) {
      await prisma.$disconnect();
    }
  }
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  seedDatabase();
}
