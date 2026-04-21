import type { Request, Response } from 'express';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { prisma } from '../db.js';
import { catalogService } from '../services/catalog.service.js';
import { StorageService } from '../services/storage.service.js';
import { normalizeGarmentModelAssets } from '../services/garment-model-assets.js';
import { parseBlankStockPayload, parseBrandLogoPayload, parseCollectionPayload, parseDesignPayload, parseGarmentModelPayload, parseNamedEntityPayload, parsePrintAreaPayload, parseUploadAssetRequest, parseUploadTemplatePayload, parseUserRolePayload } from '../validation/admin-validation.js';

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseImageDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/);
  if (!match) {
    throw new AppError('La imagen enviada no tiene un formato válido.', 400);
  }

  const extension = match[1] === 'image/jpeg' ? 'jpg' : match[1].split('/')[1];

  return {
    contentType: match[1],
    extension,
    buffer: Buffer.from(match[2], 'base64'),
  };
}

function invalidateCatalogCache() {
  catalogService.invalidateCatalogInitCache();
}

function buildBlankStockKey(colorId: string, sizeId: string) {
  return `${colorId}:${sizeId}`;
}

export const getGarmentModels = asyncHandler(async (_req: Request, res: Response) => {
  const models = await prisma.garmentModel.findMany({
    include: {
      category: true,
      sizes: { include: { size: true } },
      colors: { include: { color: true } },
      printAreas: { include: { placement: true } },
    },
  });
  res.json(models.map(normalizeGarmentModelAssets));
});

export const createGarmentModel = asyncHandler(async (req: Request, res: Response) => {
  const { categoryId, name, slug, description, basePrice, frontMockupUrl, backMockupUrl, sizeIds, colorIds, colorMockups } = parseGarmentModelPayload(req.body, 'create');

  const model = await prisma.$transaction(async (tx) => {
    const createdModel = await tx.garmentModel.create({
      data: {
        categoryId: categoryId as string,
        name,
        slug,
        description,
        basePrice: Number(basePrice),
        frontMockupUrl,
        backMockupUrl,
      },
    });

    await tx.garmentModelSize.createMany({
      data: sizeIds.map((sizeId: string) => ({
        garmentModelId: createdModel.id,
        sizeId,
      })),
      skipDuplicates: true,
    });

    await tx.garmentModelColor.createMany({
      data: colorIds.map((colorId: string) => {
        const colorMockup = Array.isArray(colorMockups) ? colorMockups.find((item: any) => item?.colorId === colorId) : null;
        return {
          garmentModelId: createdModel.id,
          colorId,
          frontMockupUrl: colorMockup?.frontMockupUrl || null,
          backMockupUrl: colorMockup?.backMockupUrl || null,
        };
      }),
      skipDuplicates: true,
    });

    await tx.blankStock.createMany({
      data: colorIds.flatMap((colorId: string) =>
        sizeIds.map((sizeId: string) => ({
          garmentModelId: createdModel.id,
          colorId,
          sizeId,
          quantity: 0,
        }))
      ),
      skipDuplicates: true,
    });

    return tx.garmentModel.findUniqueOrThrow({
      where: { id: createdModel.id },
      include: {
        category: true,
        sizes: { include: { size: true } },
        colors: { include: { color: true } },
        printAreas: { include: { placement: true } },
      },
    });
  });

  invalidateCatalogCache();
  res.status(201).json(normalizeGarmentModelAssets(model));
});

export const updateGarmentModel = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, slug, description, basePrice, frontMockupUrl, backMockupUrl, active, sizeIds, colorIds, colorMockups } = parseGarmentModelPayload(req.body, 'update');

  const model = await prisma.$transaction(async (tx) => {
    await tx.garmentModel.update({
      where: { id },
      data: {
        name,
        slug,
        description,
        basePrice,
        frontMockupUrl,
        backMockupUrl,
        active,
      },
    });

    if (Array.isArray(sizeIds)) {
      await tx.garmentModelSize.deleteMany({
        where: { garmentModelId: id },
      });
      await tx.garmentModelSize.createMany({
        data: sizeIds.map((sizeId: string) => ({
          garmentModelId: id,
          sizeId,
        })),
        skipDuplicates: true,
      });
    }

    if (Array.isArray(colorIds)) {
      await tx.garmentModelColor.deleteMany({
        where: { garmentModelId: id },
      });
      await tx.garmentModelColor.createMany({
        data: colorIds.map((colorId: string) => {
          const colorMockup = Array.isArray(colorMockups) ? colorMockups.find((item: any) => item?.colorId === colorId) : null;
          return {
            garmentModelId: id,
            colorId,
            frontMockupUrl: colorMockup?.frontMockupUrl || null,
            backMockupUrl: colorMockup?.backMockupUrl || null,
          };
        }),
        skipDuplicates: true,
      });
    }

    if (Array.isArray(sizeIds) || Array.isArray(colorIds)) {
      const nextSizeIds = Array.isArray(sizeIds)
        ? sizeIds
        : (await tx.garmentModelSize.findMany({ where: { garmentModelId: id }, select: { sizeId: true } })).map((item) => item.sizeId);
      const nextColorIds = Array.isArray(colorIds)
        ? colorIds
        : (await tx.garmentModelColor.findMany({ where: { garmentModelId: id }, select: { colorId: true } })).map((item) => item.colorId);

      const existingBlankStock = await tx.blankStock.findMany({
        where: { garmentModelId: id },
        select: { id: true, colorId: true, sizeId: true },
      });
      const nextBlankStockKeys = new Set(
        nextColorIds.flatMap((colorId: string) => nextSizeIds.map((sizeId: string) => buildBlankStockKey(colorId, sizeId)))
      );
      const blankStockIdsToDelete = existingBlankStock
        .filter((item) => !nextBlankStockKeys.has(buildBlankStockKey(item.colorId, item.sizeId)))
        .map((item) => item.id);

      if (blankStockIdsToDelete.length) {
        await tx.blankStock.deleteMany({
          where: { id: { in: blankStockIdsToDelete } },
        });
      }

      const existingBlankStockKeys = new Set(existingBlankStock.map((item) => buildBlankStockKey(item.colorId, item.sizeId)));
      const blankStockToCreate = nextColorIds.flatMap((colorId: string) =>
        nextSizeIds
          .filter((sizeId: string) => !existingBlankStockKeys.has(buildBlankStockKey(colorId, sizeId)))
          .map((sizeId: string) => ({
            garmentModelId: id,
            colorId,
            sizeId,
            quantity: 0,
          }))
      );

      if (blankStockToCreate.length) {
        await tx.blankStock.createMany({
          data: blankStockToCreate,
          skipDuplicates: true,
        });
      }
    }

    return tx.garmentModel.findUniqueOrThrow({
      where: { id },
      include: {
        category: true,
        sizes: { include: { size: true } },
        colors: { include: { color: true } },
        printAreas: { include: { placement: true } },
      },
    });
  });

  invalidateCatalogCache();
  res.json(normalizeGarmentModelAssets(model));
});

export const deleteGarmentModel = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const orderItemsCount = await prisma.orderItem.count({
    where: { garmentModelId: id },
  });

  if (orderItemsCount > 0) {
    const model = await prisma.garmentModel.update({
      where: { id },
      data: { active: false },
    });

    invalidateCatalogCache();
    res.json({
      ...model,
      message: 'El modelo tiene pedidos asociados. Se desactivó en lugar de eliminarse.',
    });
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.cartItem.deleteMany({
      where: { garmentModelId: id },
    });
    await tx.blankStock.deleteMany({
      where: { garmentModelId: id },
    });
    await tx.printArea.deleteMany({
      where: { garmentModelId: id },
    });
    await tx.garmentModelSize.deleteMany({
      where: { garmentModelId: id },
    });
    await tx.garmentModelColor.deleteMany({
      where: { garmentModelId: id },
    });
    await tx.garmentModel.delete({
      where: { id },
    });
  });

  invalidateCatalogCache();
  res.json({ message: 'Modelo de prenda eliminado.' });
});

export const getDesigns = asyncHandler(async (_req: Request, res: Response) => {
  const designs = await prisma.design.findMany({
    include: {
      collection: true,
      designCategory: true,
      transferSizes: true,
      placements: { include: { placement: true } },
    },
  });
  res.json(designs);
});

async function resolveDesignRelations(collectionId: string | null, designCategoryId: string | null) {
  const collection = collectionId
    ? await prisma.collection.findUnique({
        where: { id: collectionId },
      })
    : null;

  if (collectionId && !collection) {
    throw new AppError('No encontramos esa colección.', 404);
  }

  if (collection && collection.type !== 'capsule') {
    throw new AppError('Solo las colecciones cápsula pueden asignarse a diseños.', 400);
  }

  const designCategory = designCategoryId
    ? await prisma.designCategory.findUnique({
        where: { id: designCategoryId },
      })
    : null;

  if (designCategoryId && !designCategory) {
    throw new AppError('No encontramos esa categoría de diseño.', 404);
  }

  return {
    collection,
    designCategory,
  };
}

export const createDesign = asyncHandler(async (req: Request, res: Response) => {
  const { collectionId, designCategoryId, name, slug, code, description, imageUrl, placementCodes, transferSizes } =
    parseDesignPayload(req.body);

  const { collection, designCategory } = await resolveDesignRelations(collectionId, designCategoryId);

  if (!collection && !designCategory) {
    throw new AppError('Los diseños fijos deben tener una categoría.', 400);
  }

  if (collection && designCategory) {
    throw new AppError('Los diseños cápsula no pueden asignarse a una categoría.', 400);
  }

  const placementRecords = Array.isArray(placementCodes)
    ? await prisma.placement.findMany({ where: { code: { in: placementCodes } } })
    : [];

  if (!transferSizes.length) {
    throw new AppError('Debés configurar al menos un tamaño de transfer.', 400);
  }

  const design = await prisma.design.create({
    data: {
      collection: collection ? { connect: { id: collection.id } } : undefined,
      designCategory: designCategory ? { connect: { id: designCategory.id } } : undefined,
      name,
      slug,
      code,
      description,
      imageUrl,
      limited: Boolean(collection),
      placements: placementRecords.length
        ? {
            create: placementRecords.map((placement) => ({
              placement: { connect: { id: placement.id } },
            })),
          }
        : undefined,
      transferSizes: Array.isArray(transferSizes)
        ? {
            create: transferSizes.map((item: any) => ({
              sizeCode: item.sizeCode,
              widthCm: Number(item.widthCm),
              heightCm: Number(item.heightCm),
              stock: Number(item.stock ?? 0),
              extraPrice: Number(item.extraPrice ?? 0),
            })),
          }
        : undefined,
    },
    include: {
      collection: true,
      designCategory: true,
      transferSizes: true,
      placements: { include: { placement: true } },
    },
  });

  invalidateCatalogCache();
  res.status(201).json(design);
});

export const updateDesign = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { collectionId, designCategoryId, name, slug, code, description, imageUrl, active, placementCodes, transferSizes } =
    parseDesignPayload(req.body);

  const { collection, designCategory } = await resolveDesignRelations(collectionId, designCategoryId);

  if (!collection && !designCategory) {
    throw new AppError('Los diseños fijos deben tener una categoría.', 400);
  }

  if (collection && designCategory) {
    throw new AppError('Los diseños cápsula no pueden asignarse a una categoría.', 400);
  }

  const existingDesign = await prisma.design.findUnique({
    where: { id },
    include: {
      placements: { include: { placement: true } },
      transferSizes: true,
    },
  });

  if (!existingDesign) {
    throw new AppError('No encontramos ese diseño.', 404);
  }

  const nextPlacementCodes = placementCodes.length
    ? placementCodes
    : existingDesign.placements.map((item) => item.placement.code).filter(Boolean);
  const nextTransferSizes = transferSizes.length
    ? transferSizes
    : existingDesign.transferSizes.map((item) => ({
        sizeCode: item.sizeCode,
        widthCm: item.widthCm,
        heightCm: item.heightCm,
        stock: item.stock,
        extraPrice: item.extraPrice,
      }));

  const placementRecords = await prisma.placement.findMany({ where: { code: { in: nextPlacementCodes } } });

  if (!nextTransferSizes.length) {
    throw new AppError('Debés configurar al menos un tamaño de transfer.', 400);
  }

  const designMutations = [
    prisma.design.update({
      where: { id },
      data: {
        collection: collection ? { connect: { id: collection.id } } : { disconnect: true },
        designCategory: designCategory ? { connect: { id: designCategory.id } } : { disconnect: true },
        name,
        slug,
        code,
        description,
        imageUrl,
        limited: Boolean(collection),
        active: active === undefined ? undefined : Boolean(active),
      },
    }),
    prisma.designPlacement.deleteMany({
      where: { designId: id },
    }),
    prisma.designTransferSize.deleteMany({
      where: { designId: id },
    }),
    ...(placementRecords.length
      ? [
          prisma.designPlacement.createMany({
            data: placementRecords.map((placement) => ({
              designId: id,
              placementId: placement.id,
            })),
            skipDuplicates: true,
          }),
        ]
      : []),
    prisma.designTransferSize.createMany({
      data: nextTransferSizes.map((item) => ({
        designId: id,
        sizeCode: item.sizeCode,
        widthCm: item.widthCm,
        heightCm: item.heightCm,
        stock: item.stock,
        extraPrice: item.extraPrice,
      })),
      skipDuplicates: true,
    }),
  ];

  await prisma.$transaction(designMutations);

  const design = await prisma.design.findUniqueOrThrow({
    where: { id },
    include: {
      collection: true,
      designCategory: true,
      transferSizes: true,
      placements: { include: { placement: true } },
    },
  });

  invalidateCatalogCache();
  res.json(design);
});

export const deleteDesign = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const orderItemsCount = await prisma.orderItem.count({
    where: { designId: id },
  });
  const cartItemsCount = await prisma.cartItem.count({
    where: { designId: id },
  });

  if (orderItemsCount > 0 || cartItemsCount > 0) {
    const design = await prisma.design.update({
      where: { id },
      data: { active: false },
    });

    invalidateCatalogCache();
    res.json({
      ...design,
      message: 'El diseño tiene pedidos asociados. Se desactivó en lugar de eliminarse.',
    });
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.designPlacement.deleteMany({
      where: { designId: id },
    });

    await tx.designTransferSize.deleteMany({
      where: { designId: id },
    });

    await tx.design.delete({
      where: { id },
    });

    invalidateCatalogCache();
  });

  res.json({ message: 'Diseño eliminado.' });
});

export const getBlankStock = asyncHandler(async (_req: Request, res: Response) => {
  const stock = await prisma.blankStock.findMany();
  const garmentModelIds = Array.from(new Set(stock.map((item) => item.garmentModelId).filter(Boolean)));
  const colorIds = Array.from(new Set(stock.map((item) => item.colorId).filter(Boolean)));
  const sizeIds = Array.from(new Set(stock.map((item) => item.sizeId).filter(Boolean)));

  const [garmentModels, colors, sizes] = await Promise.all([
    garmentModelIds.length
      ? prisma.garmentModel.findMany({
          where: { id: { in: garmentModelIds } },
          select: { id: true, name: true, active: true },
        })
      : Promise.resolve([]),
    colorIds.length
      ? prisma.color.findMany({
          where: { id: { in: colorIds } },
          select: { id: true, name: true, hex: true, active: true },
        })
      : Promise.resolve([]),
    sizeIds.length
      ? prisma.size.findMany({
          where: { id: { in: sizeIds } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
  ]);

  const garmentModelMap = new Map(garmentModels.map((item) => [item.id, item]));
  const colorMap = new Map(colors.map((item) => [item.id, item]));
  const sizeMap = new Map(sizes.map((item) => [item.id, item]));

  const normalizedStock = stock
    .map((item) => ({
      ...item,
      garmentModel: garmentModelMap.get(item.garmentModelId) ?? null,
      color: colorMap.get(item.colorId) ?? null,
      size: sizeMap.get(item.sizeId) ?? null,
    }))
    .sort((left, right) => {
      const garmentCompare = (left.garmentModel?.name || '').localeCompare(right.garmentModel?.name || '');
      if (garmentCompare !== 0) return garmentCompare;
      const colorCompare = (left.color?.name || '').localeCompare(right.color?.name || '');
      if (colorCompare !== 0) return colorCompare;
      return (left.size?.name || '').localeCompare(right.size?.name || '');
    });

  res.json(normalizedStock);
});

export const getUsers = asyncHandler(async (_req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    include: {
      _count: {
        select: {
          orders: true,
        },
      },
    },
    orderBy: [{ createdAt: 'desc' }],
  });

  res.json(
    users.map(({ password, _count, ...user }) => ({
      ...user,
      orderCount: _count.orders,
    }))
  );
});

export const updateUserRole = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { role } = parseUserRolePayload(req.body, req.user?.id, id);

  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user) {
    throw new AppError('No encontramos ese usuario.', 404);
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: { role },
    include: {
      _count: {
        select: {
          orders: true,
        },
      },
    },
  });

  const { password, _count, ...safeUser } = updatedUser;

  res.json({
    ...safeUser,
    orderCount: _count.orders,
  });
});

export const updateBlankStock = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { quantity } = parseBlankStockPayload(req.body);

  const record = await prisma.blankStock.update({
    where: { id },
    data: { quantity },
  });

  invalidateCatalogCache();
  res.json(record);
});

export const getCollections = asyncHandler(async (_req: Request, res: Response) => {
  const collections = await prisma.collection.findMany({
    include: { designs: true },
  });
  res.json(collections);
});

export const createGarmentCategory = asyncHandler(async (req: Request, res: Response) => {
  const { name, slug } = parseNamedEntityPayload(req.body);

  const category = await prisma.category.create({
    data: {
      name,
      slug: slug || slugify(name),
    },
  });

  invalidateCatalogCache();
  res.status(201).json(category);
});

export const createSize = asyncHandler(async (req: Request, res: Response) => {
  const { name } = parseNamedEntityPayload(req.body);

  const size = await prisma.size.create({
    data: {
      name: String(name).toUpperCase(),
    },
  });

  invalidateCatalogCache();
  res.status(201).json(size);
});

export const createColor = asyncHandler(async (req: Request, res: Response) => {
  const { name, hex } = parseNamedEntityPayload(req.body, false, true);

  const color = await prisma.color.create({
    data: {
      name,
      hex: hex as string,
    },
  });

  invalidateCatalogCache();
  res.status(201).json(color);
});

export const deleteColor = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const [garmentModelColorCount, blankStockCount, orderItemCount, brandLogoColorCount, cartItemCount] = await Promise.all([
    prisma.garmentModelColor.count({ where: { colorId: id } }),
    prisma.blankStock.count({ where: { colorId: id } }),
    prisma.orderItem.count({ where: { colorId: id } }),
    prisma.brandLogoColor.count({ where: { colorId: id } }),
    prisma.cartItem.count({ where: { colorId: id } }),
  ]);

  const hasReferences =
    garmentModelColorCount > 0 ||
    blankStockCount > 0 ||
    orderItemCount > 0 ||
    brandLogoColorCount > 0 ||
    cartItemCount > 0;

  if (hasReferences) {
    const color = await prisma.color.update({
      where: { id },
      data: { active: false },
    });

    res.json({
      ...color,
      message: 'El color tiene relaciones asociadas. Se desactivó en lugar de eliminarse.',
    });
    return;
  }

  await prisma.color.delete({
    where: { id },
  });

  invalidateCatalogCache();
  res.json({ message: 'Color eliminado.' });
});

export const createDesignCategory = asyncHandler(async (req: Request, res: Response) => {
  const { name, slug, code } = parseNamedEntityPayload(req.body, true);

  const category = await prisma.designCategory.create({
    data: {
      name,
      slug: slug || slugify(name),
      code: String(code).toUpperCase(),
    },
  });

  invalidateCatalogCache();
  res.status(201).json(category);
});

export const createCollection = asyncHandler(async (req: Request, res: Response) => {
  const { name, slug, type, description, startsAt, endsAt } = parseCollectionPayload(req.body);

  const collection = await prisma.collection.create({
    data: {
      name,
      slug: slug || slugify(name),
      type,
      description,
      startsAt,
      endsAt,
    },
  });

  invalidateCatalogCache();
  res.status(201).json(collection);
});

export const uploadAsset = asyncHandler(async (req: Request, res: Response) => {
  const { dataUrl, filename, folder } = parseUploadAssetRequest(req.body);

  const { extension, buffer, contentType } = parseImageDataUrl(String(dataUrl));
  const baseName = slugify(String(filename || `asset-${Date.now()}`)) || `asset-${Date.now()}`;
  const finalName = `${baseName}.${extension}`;
  const result = await StorageService.uploadAsset(folder, finalName, buffer, contentType);

  res.status(201).json({
    url: result.url,
    filename: result.filename,
  });
});

export const getPlacements = asyncHandler(async (_req: Request, res: Response) => {
  const placements = await prisma.placement.findMany({
    orderBy: [{ kind: 'asc' }, { code: 'asc' }],
  });

  res.json(placements);
});

export const getBrandLogos = asyncHandler(async (_req: Request, res: Response) => {
  const logos = await prisma.brandLogo.findMany({
    include: {
      placements: {
        include: { placement: true },
      },
      colors: {
        include: { color: true },
      },
    },
    orderBy: [{ name: 'asc' }],
  });

  res.json(logos);
});

async function resolveLogoPlacements(placementCodes: unknown) {
  const logoPlacements = Array.isArray(placementCodes)
    ? await prisma.placement.findMany({
        where: {
          code: { in: placementCodes.filter((item: unknown): item is string => typeof item === 'string' && Boolean(item.trim())) },
          kind: 'logo',
          active: true,
        },
      })
    : [];

  if (!logoPlacements.length) {
    throw new AppError('Debés seleccionar al menos una ubicación permitida para el logo.', 400);
  }

  return logoPlacements;
}

async function resolveLogoColors(colorIds: unknown) {
  const ids = Array.isArray(colorIds)
    ? colorIds.filter((item: unknown): item is string => typeof item === 'string' && Boolean(item.trim()))
    : [];

  if (!ids.length) {
    throw new AppError('Debés seleccionar al menos un color permitido para el logo.', 400);
  }

  const colors = await prisma.color.findMany({
    where: {
      id: { in: ids },
      active: true,
    },
  });

  if (!colors.length) {
    throw new AppError('Necesitás al menos un color activo válido para el logo.', 400);
  }

  return colors;
}

export const createBrandLogo = asyncHandler(async (req: Request, res: Response) => {
  const { name, slug, code, imageUrl, widthCm, heightCm, active, placementCodes, colorIds } = parseBrandLogoPayload(req.body);

  const logoPlacements = await resolveLogoPlacements(placementCodes);
  const logoColors = await resolveLogoColors(colorIds);

  const logo = await prisma.brandLogo.create({
    data: {
      name,
      slug: slug || slugify(name),
      code: String(code).toUpperCase(),
      imageUrl,
      widthCm: Number(widthCm),
      heightCm: Number(heightCm),
      active,
      placements: {
        create: logoPlacements.map((placement) => ({
          placement: { connect: { id: placement.id } },
        })),
      },
      colors: {
        create: logoColors.map((color) => ({
          color: { connect: { id: color.id } },
        })),
      },
    },
    include: {
      placements: {
        include: { placement: true },
      },
      colors: {
        include: { color: true },
      },
    },
  });

  invalidateCatalogCache();
  res.status(201).json(logo);
});

export const updateBrandLogo = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, slug, code, imageUrl, widthCm, heightCm, active, placementCodes, colorIds } = parseBrandLogoPayload(req.body);

  const logoPlacements = await resolveLogoPlacements(placementCodes);
  const logoColors = await resolveLogoColors(colorIds);

  const logo = await prisma.$transaction(async (tx) => {
    await tx.brandLogoPlacement.deleteMany({
      where: { brandLogoId: id },
    });
    await tx.brandLogoColor.deleteMany({
      where: { brandLogoId: id },
    });

    await tx.brandLogo.update({
      where: { id },
      data: {
        name,
        slug: slug || slugify(name),
        code,
        imageUrl,
        widthCm,
        heightCm,
        active,
        placements: {
          create: logoPlacements.map((placement) => ({
            placement: { connect: { id: placement.id } },
          })),
        },
        colors: {
          create: logoColors.map((color) => ({
            color: { connect: { id: color.id } },
          })),
        },
      },
    });

    return tx.brandLogo.findUniqueOrThrow({
      where: { id },
      include: {
        placements: {
          include: { placement: true },
        },
        colors: {
          include: { color: true },
        },
      },
    });
  });

  invalidateCatalogCache();
  res.json(logo);
});

export const deleteBrandLogo = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  await prisma.$transaction(async (tx) => {
    await tx.brandLogoPlacement.deleteMany({
      where: { brandLogoId: id },
    });
    await tx.brandLogoColor.deleteMany({
      where: { brandLogoId: id },
    });
    await tx.brandLogo.delete({
      where: { id },
    });
  });

  invalidateCatalogCache();
  res.json({ message: 'Logo eliminado.' });
});

export const bootstrapPlacements = asyncHandler(async (_req: Request, res: Response) => {
  const defaults = [
    { code: 'FRONT', name: 'Estampa frente', kind: 'print', surface: 'front' },
    { code: 'BACK', name: 'Estampa espalda', kind: 'print', surface: 'back' },
    { code: 'LF', name: 'Logo frente medio', kind: 'logo', surface: 'front' },
    { code: 'LC', name: 'Logo cuello espalda', kind: 'logo', surface: 'neck' },
    { code: 'IBR', name: 'Logo manga', kind: 'logo', surface: 'sleeve' },
  ] as const;

  await Promise.all(
    defaults.map((item) =>
      prisma.placement.upsert({
        where: { code: item.code },
        update: {
          name: item.name,
          kind: item.kind,
          surface: item.surface,
          active: true,
        },
        create: item,
      })
    )
  );

  const placements = await prisma.placement.findMany({
    orderBy: [{ kind: 'asc' }, { code: 'asc' }],
  });

  invalidateCatalogCache();
  res.status(201).json(placements);
});

export const getPrintAreas = asyncHandler(async (_req: Request, res: Response) => {
  const printAreas = await prisma.printArea.findMany({
    include: {
      garmentModel: true,
      placement: true,
    },
    orderBy: [{ garmentModelId: 'asc' }, { placementId: 'asc' }],
  });

  res.json(printAreas);
});

export const createPrintArea = asyncHandler(async (req: Request, res: Response) => {
  const { garmentModelId, placementCode, xPct, yPct, widthPct, heightPct, active } = parsePrintAreaPayload(req.body);

  const placement = await prisma.placement.findFirst({
    where: {
      code: placementCode,
      kind: 'print',
    },
  });

  if (!placement) {
    throw new AppError('No encontramos esa ubicación de impresión.', 404);
  }

  const printArea = await prisma.printArea.upsert({
    where: {
      garmentModelId_placementId: {
        garmentModelId,
        placementId: placement.id,
      },
    },
    update: {
      xPct,
      yPct,
      widthPct,
      heightPct,
      active,
    },
    create: {
      garmentModelId,
      placementId: placement.id,
      xPct,
      yPct,
      widthPct,
      heightPct,
      active,
    },
    include: {
      garmentModel: true,
      placement: true,
    },
  });

  invalidateCatalogCache();
  res.status(201).json(printArea);
});

export const getUploadTemplates = asyncHandler(async (_req: Request, res: Response) => {
  const templates = await prisma.uploadTemplate.findMany({
    include: {
      placement: true,
      sizeOptions: true,
    },
    orderBy: [{ customizationType: 'asc' }, { sortOrder: 'asc' }, { code: 'asc' }],
  });

  res.json(templates);
});

export const createUploadTemplate = asyncHandler(async (req: Request, res: Response) => {
  const {
    code,
    slug,
    name,
    customizationType,
    description,
    requiredImageCount,
    allowsText,
    textLabel,
    placementCode,
    previewImageUrl,
    sortOrder,
    sizeOptions,
  } = parseUploadTemplatePayload(req.body);

  const placement = await prisma.placement.findFirst({
    where: {
      code: placementCode,
      kind: 'print',
    },
  });

  if (!placement) {
    throw new AppError('No encontramos esa ubicación de impresión.', 404);
  }

  const template = await prisma.uploadTemplate.create({
    data: {
      code,
      slug: slug || slugify(code),
      name,
      customizationType,
      description,
      requiredImageCount,
      allowsText: Boolean(allowsText),
      textLabel,
      sortOrder,
      placement: { connect: { id: placement.id } },
      previewImageUrl: previewImageUrl || null,
      sizeOptions: Array.isArray(sizeOptions)
        ? {
          create: sizeOptions.map((item: any) => ({
            sizeCode: item.sizeCode,
            widthCm: item.widthCm,
            heightCm: item.heightCm,
            extraPrice: item.extraPrice,
          })),
          }
        : undefined,
    },
    include: {
      placement: true,
      sizeOptions: true,
    },
  });

  invalidateCatalogCache();
  res.status(201).json(template);
});

