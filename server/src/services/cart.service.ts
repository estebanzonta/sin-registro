import { prisma } from '../db.js';
import { CartItem, AddToCartRequest, UpdateCartItemRequest, CartResponse } from '../types/cart.js';
import { ConfiguratorService } from './configurator.service.js';
import { AppError } from '../middleware/errorHandler.js';

function readUploadedAssetCount(value?: string) {
  if (!value) {
    return 0;
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.length;
    }
    if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { assets?: unknown[] }).assets)) {
      return (parsed as { assets: unknown[] }).assets.length;
    }
    return 0;
  } catch {
    throw new AppError('Las imágenes personalizadas no tienen un formato válido.', 400);
  }
}

function serializeCart(items: CartItem[]): CartResponse {
  return {
    items,
    totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
    totalPrice: items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
  };
}

function mapCartItem(item: any): CartItem {
  return {
    id: item.id,
    customizationMode: item.customizationMode,
    garmentModelId: item.garmentModelId,
    colorId: item.colorId,
    sizeId: item.sizeId,
    printPlacementCode: item.printPlacementCode,
    logoPlacementCode: item.logoPlacementCode,
    designId: item.designId || undefined,
    uploadTemplateId: item.uploadTemplateId || undefined,
    customDesignUrl: item.customDesignUrl || undefined,
    customAssetUrlsJson: item.customAssetUrlsJson || undefined,
    transferSizeCode: item.transferSizeCode,
    configurationCode: item.configurationCode,
    unitPrice: item.unitPrice,
    quantity: item.quantity,
    layoutSnapshotJson: item.layoutSnapshotJson || undefined,
    configurationSnapshotJson: item.configurationSnapshotJson || undefined,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export class CartService {
  private static async getOrCreateCart(userId: string) {
    return prisma.cart.upsert({
      where: { userId },
      update: {},
      create: { userId },
      include: { items: { orderBy: { createdAt: 'asc' } } },
    });
  }

  static async getCart(userId: string): Promise<CartResponse> {
    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: { items: { orderBy: { createdAt: 'asc' } } },
    });

    if (!cart) {
      return {
        items: [],
        totalPrice: 0,
        totalItems: 0,
      };
    }

    return serializeCart(cart.items.map(mapCartItem));
  }

  static async addToCart(userId: string, request: AddToCartRequest): Promise<CartResponse> {
    const quantity = request.quantity || 1;

    if (request.customizationMode === 'user_upload') {
      const template = await prisma.uploadTemplate.findUnique({
        where: { id: request.uploadTemplateId },
        select: { id: true, requiredImageCount: true, active: true },
      });

      if (!template || !template.active) {
        throw new AppError('No encontramos la plantilla de personalizado seleccionada.', 404);
      }

      const uploadedAssetCount = readUploadedAssetCount(request.customAssetUrlsJson);
      if (uploadedAssetCount !== template.requiredImageCount) {
        throw new AppError(`Debés cargar ${template.requiredImageCount} imagen${template.requiredImageCount === 1 ? '' : 'es'} para esta personalización.`, 400);
      }
    }

    const config = await new ConfiguratorService().resolveConfiguration({
      customizationMode: request.customizationMode,
      garmentModelId: request.garmentModelId,
      colorId: request.colorId,
      sizeId: request.sizeId,
      printPlacementCode: request.printPlacementCode,
      logoPlacementCode: request.logoPlacementCode,
      designId: request.designId,
      uploadTemplateId: request.uploadTemplateId,
      transferSizeCode: request.transferSizeCode,
    });

    if (!config.valid) {
      throw new AppError('No hay stock disponible para esta configuración.', 400);
    }

    const cart = await this.getOrCreateCart(userId);

    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        customizationMode: request.customizationMode,
        garmentModelId: request.garmentModelId,
        colorId: request.colorId,
        sizeId: request.sizeId,
        designId: request.designId,
        uploadTemplateId: request.uploadTemplateId,
        customDesignUrl: request.customDesignUrl,
        customAssetUrlsJson: request.customAssetUrlsJson,
        transferSizeCode: request.transferSizeCode,
        printPlacementCode: request.printPlacementCode,
        logoPlacementCode: request.logoPlacementCode,
        configurationCode: config.configurationCode,
        unitPrice: config.price,
        quantity,
        layoutSnapshotJson: request.layoutSnapshotJson,
        configurationSnapshotJson:
          request.configurationSnapshotJson ||
          JSON.stringify({
            configurationCode: config.configurationCode,
            basePrice: config.basePrice,
            extraPrice: config.extraPrice,
            price: config.price,
            printArea: config.printArea,
            stock: config.stock,
            allowedLogoPlacements: config.allowedLogoPlacements.map((placement) => placement.code),
            selectedTransferSize: config.selectedTransferSize,
          }),
      },
    });

    return this.getCart(userId);
  }

  static async updateCartItem(userId: string, itemId: string, request: UpdateCartItemRequest): Promise<CartResponse> {
    const cart = await prisma.cart.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!cart) {
      throw new AppError('No encontramos tu carrito.', 404);
    }

    const item = await prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
    });

    if (!item) {
      throw new AppError('No encontramos ese producto en tu carrito.', 404);
    }

    if (request.quantity !== undefined && request.quantity <= 0) {
      throw new AppError('La cantidad debe ser mayor a 0.', 400);
    }

    await prisma.cartItem.update({
      where: { id: itemId },
      data: {
        quantity: request.quantity ?? item.quantity,
        logoPlacementCode: request.logoPlacementCode ?? item.logoPlacementCode,
      },
    });

    return this.getCart(userId);
  }

  static async removeFromCart(userId: string, itemId: string): Promise<CartResponse> {
    const cart = await prisma.cart.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!cart) {
      throw new AppError('No encontramos tu carrito.', 404);
    }

    const item = await prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
      select: { id: true },
    });

    if (!item) {
      throw new AppError('No encontramos ese producto en tu carrito.', 404);
    }

    await prisma.cartItem.delete({
      where: { id: itemId },
    });

    return this.getCart(userId);
  }

  static async clearCart(userId: string): Promise<CartResponse> {
    const cart = await prisma.cart.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!cart) {
      return {
        items: [],
        totalPrice: 0,
        totalItems: 0,
      };
    }

    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    return this.getCart(userId);
  }
}
