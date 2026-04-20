import { prisma } from '../db.js';
import { normalizeAssetUrl } from './storage.service.js';
import type { CatalogInitResponse } from '../types/index.js';
import { logTiming, nowMs } from '../utils/timing.js';

const CATALOG_CACHE_TTL_MS = 60 * 1000;

let catalogInitCache: {
  value: CatalogInitResponse;
  expiresAt: number;
} | null = null;
let catalogInitInFlight: Promise<CatalogInitResponse> | null = null;

export class CatalogService {
  private normalizeGarmentModel<T extends {
    frontMockupUrl?: string | null;
    backMockupUrl?: string | null;
    colors?: Array<{ frontMockupUrl?: string | null; backMockupUrl?: string | null }>;
  }>(model: T) {
    return {
      ...model,
      frontMockupUrl: normalizeAssetUrl(model.frontMockupUrl),
      backMockupUrl: normalizeAssetUrl(model.backMockupUrl),
      colors: model.colors?.map((item) => ({
        ...item,
        frontMockupUrl: normalizeAssetUrl(item.frontMockupUrl),
        backMockupUrl: normalizeAssetUrl(item.backMockupUrl),
      })),
    };
  }

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
    const startedAt = nowMs();
    const now = Date.now();

    if (catalogInitCache && catalogInitCache.expiresAt > now) {
      const totalMs = nowMs() - startedAt;
      logTiming('catalog.init', [
        { label: 'cache-hit', durationMs: totalMs },
        { label: 'total', durationMs: totalMs },
      ], { source: 'memory-cache' });
      return catalogInitCache.value;
    }

    if (catalogInitInFlight) {
      const result = await catalogInitInFlight;
      const totalMs = nowMs() - startedAt;
      logTiming('catalog.init', [
        { label: 'await-inflight', durationMs: totalMs },
        { label: 'total', durationMs: totalMs },
      ], { source: 'shared-promise' });
      return result;
    }

    catalogInitInFlight = this.loadCatalogInit();

    try {
      const result = await catalogInitInFlight;
      const totalMs = nowMs() - startedAt;
      catalogInitCache = {
        value: result,
        expiresAt: Date.now() + CATALOG_CACHE_TTL_MS,
      };
      logTiming('catalog.init', [
        { label: 'load', durationMs: totalMs },
        { label: 'total', durationMs: totalMs },
      ], { source: 'database' });
      return result;
    } finally {
      catalogInitInFlight = null;
    }
  }

  invalidateCatalogInitCache() {
    catalogInitCache = null;
    catalogInitInFlight = null;
  }

  private async loadCatalogInit(): Promise<CatalogInitResponse> {
    const queryStartedAt = nowMs();
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
    const queryMs = nowMs() - queryStartedAt;

    const transformStartedAt = nowMs();
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
    const transformMs = nowMs() - transformStartedAt;

    const response = {
      categories: categories.map((category) => ({
        ...category,
        garmentModels: category.garmentModels.map((model) => this.normalizeGarmentModel(model)),
      })),
      colors,
      sizes,
      placements,
      designCategories,
      collections: [...fixedDesignCollection, ...visibleCollections],
      uploadTemplates,
      brandLogos,
    };

    logTiming('catalog.init.load', [
      { label: 'queries', durationMs: queryMs },
      { label: 'transform', durationMs: transformMs },
      { label: 'total', durationMs: queryMs + transformMs },
    ], {
      categoryCount: response.categories.length,
      collectionCount: response.collections.length,
      uploadTemplateCount: response.uploadTemplates.length,
      brandLogoCount: response.brandLogos.length,
    });

    return response;
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
    const model = await prisma.garmentModel.findUnique({
      where: { id },
      include: {
        category: true,
        sizes: { include: { size: true } },
        colors: { include: { color: true } },
        printAreas: { include: { placement: true } },
      },
    });

    return model ? this.normalizeGarmentModel(model) : null;
  }
}

export const catalogService = new CatalogService();
