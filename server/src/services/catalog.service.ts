import { prisma } from '../db.js';
import type { CatalogInitResponse } from '../types/index.js';

export class CatalogService {
  private isCollectionAvailable(collection: { startsAt: Date | null; endsAt: Date | null; active: boolean } | null) {
    if (!collection) {
      return true;
    }

    const now = new Date();
    if (!collection.active) {
      return false;
    }
    if (collection.startsAt && collection.startsAt > now) {
      return false;
    }
    if (collection.endsAt && collection.endsAt < now) {
      return false;
    }
    return true;
  }

  async getCatalogInit(): Promise<CatalogInitResponse> {
    const [categories, colors, sizes, placements, designCategories, collections, fixedDesigns, uploadTemplates, brandLogos] = await Promise.all([
      prisma.category.findMany({
        include: {
          garmentModels: {
            where: { active: true },
            include: {
              sizes: { include: { size: true } },
              colors: { include: { color: true } },
              printAreas: { include: { placement: true } },
              category: true,
            },
          },
        },
      }),
      prisma.color.findMany({ where: { active: true } }),
      prisma.size.findMany({ orderBy: { name: 'asc' } }),
      prisma.placement.findMany({ where: { active: true }, orderBy: { code: 'asc' } }),
      prisma.designCategory.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
      prisma.collection.findMany({
        where: { active: true },
        include: {
          designs: {
            where: { active: true },
            include: {
              designCategory: true,
              collection: true,
              transferSizes: { where: { active: true }, orderBy: { extraPrice: 'asc' } },
              placements: { include: { placement: true } },
            },
            orderBy: { sortOrder: 'asc' },
          },
        },
        orderBy: [{ type: 'asc' }, { name: 'asc' }],
      }),
      prisma.design.findMany({
        where: {
          active: true,
          collectionId: null,
        },
        include: {
          designCategory: true,
          collection: true,
          transferSizes: { where: { active: true }, orderBy: { extraPrice: 'asc' } },
          placements: { include: { placement: true } },
        },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
      prisma.uploadTemplate.findMany({
        where: { active: true },
        include: {
          placement: true,
          sizeOptions: { where: { active: true }, orderBy: { extraPrice: 'asc' } },
        },
        orderBy: [{ customizationType: 'asc' }, { sortOrder: 'asc' }, { code: 'asc' }],
      }),
      prisma.brandLogo.findMany({
        where: { active: true },
        include: {
          placements: {
            include: { placement: true },
          },
          colors: {
            include: { color: true },
          },
        },
        orderBy: [{ name: 'asc' }],
      }),
    ]);

    const visibleCollections = collections
      .filter((collection) => this.isCollectionAvailable(collection))
      .map((collection) => ({
        ...collection,
        designs: collection.designs.filter((design) => this.isCollectionAvailable(design.collection)),
      }));

    const fixedDesignCollection =
      fixedDesigns.length > 0
        ? [
            {
              id: 'fixed-catalog',
              name: 'Catálogo fijo',
              slug: 'catalogo-fijo',
              type: 'fixed',
              description: 'Diseños permanentes por categoría.',
              active: true,
              designs: fixedDesigns,
            },
          ]
        : [];

    return {
      categories,
      colors,
      sizes,
      placements,
      designCategories,
      collections: [...fixedDesignCollection, ...visibleCollections],
      uploadTemplates,
      brandLogos,
    };
  }

  async getDesigns() {
    const designs = await prisma.design.findMany({
      where: { active: true },
      include: {
        designCategory: true,
        collection: true,
        transferSizes: { where: { active: true }, orderBy: { extraPrice: 'asc' } },
        placements: { include: { placement: true } },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return designs.filter((design) => this.isCollectionAvailable(design.collection));
  }

  async getGarmentModel(id: string) {
    return prisma.garmentModel.findUnique({
      where: { id },
      include: {
        category: true,
        sizes: { include: { size: true } },
        colors: { include: { color: true } },
        printAreas: { include: { placement: true } },
      },
    });
  }
}

export const catalogService = new CatalogService();
