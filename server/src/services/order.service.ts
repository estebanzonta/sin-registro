import { prisma } from '../db.js';
import { ConfiguratorService } from './configurator.service.js';
import type {
  CreateOrderRequest,
  OrderItemData,
  OrderResponse,
  UpdateOrderStatusRequest,
  UploadedCustomizationPayload,
} from '../types/order.js';
import { AppError } from '../middleware/errorHandler.js';
import { catalogService } from './catalog.service.js';

export class OrderService {
  private static buildConfigurationSnapshot(config: Awaited<ReturnType<ConfiguratorService['resolveConfiguration']>>) {
    return JSON.stringify({
      configurationCode: config.configurationCode,
      availableLogoPlacements: config.allowedLogoPlacements.map((placement) => placement.code),
      selectedTransferSize: config.selectedTransferSize,
      printArea: config.printArea,
    });
  }

  private static async reserveStock(
    tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
    item: {
      quantity: number;
      customizationMode: OrderItemData['customizationMode'];
      garmentModelId: string;
      colorId: string;
      sizeId: string;
      designId?: string;
      transferSizeCode?: OrderItemData['transferSizeCode'];
    }
  ) {
    const blankStockUpdate = await tx.blankStock.updateMany({
      where: {
        garmentModelId: item.garmentModelId,
        colorId: item.colorId,
        sizeId: item.sizeId,
        quantity: { gte: item.quantity },
      },
      data: {
        quantity: { decrement: item.quantity },
      },
    });

    if (blankStockUpdate.count !== 1) {
      throw new AppError('Uno de los productos del carrito ya no tiene stock o dejÃ³ de estar disponible.', 400);
    }

    if (item.customizationMode !== 'brand_design' || !item.designId || !item.transferSizeCode) {
      return;
    }

    const transferStockUpdate = await tx.designTransferSize.updateMany({
      where: {
        designId: item.designId,
        sizeCode: item.transferSizeCode,
        active: true,
        stock: { gte: item.quantity },
      },
      data: {
        stock: { decrement: item.quantity },
      },
    });

    if (transferStockUpdate.count !== 1) {
      throw new AppError('Uno de los productos del carrito ya no tiene stock o dejÃ³ de estar disponible.', 400);
    }
  }

  private static validateCustomerEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private static normalizeCustomPayload(value: OrderItemData['customAssetUrls']) {
    if (!value) {
      return null;
    }

    if (Array.isArray(value)) {
      const payload: UploadedCustomizationPayload = { assets: value };
      return payload;
    }

    return value;
  }

  private static readUploadedAssetCount(value: OrderItemData['customAssetUrls']) {
    if (!value) {
      return 0;
    }

    if (Array.isArray(value)) {
      return value.length;
    }

    return Array.isArray(value.assets) ? value.assets.length : 0;
  }

  private static async getRequestItems(userId: string, request: CreateOrderRequest) {
    if (request.items?.length) {
      return request.items;
    }

    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: { items: { orderBy: { createdAt: 'asc' } } },
    });

    if (!cart || !cart.items.length) {
      throw new AppError('Tu carrito está vacío.', 400);
    }

    return cart.items.map((item) => ({
      customizationMode: item.customizationMode as OrderItemData['customizationMode'],
      garmentModelId: item.garmentModelId,
      colorId: item.colorId,
      sizeId: item.sizeId,
      printPlacementCode: item.printPlacementCode,
      logoPlacementCode: item.logoPlacementCode,
      transferSizeCode: item.transferSizeCode as OrderItemData['transferSizeCode'],
      designId: item.designId || undefined,
      uploadTemplateId: item.uploadTemplateId || undefined,
      customDesignUrl: item.customDesignUrl || undefined,
      customAssetUrls: item.customAssetUrlsJson ? JSON.parse(item.customAssetUrlsJson) : undefined,
      quantity: item.quantity,
      configurationCode: item.configurationCode,
      layoutSnapshot: item.layoutSnapshotJson ? JSON.parse(item.layoutSnapshotJson) : undefined,
      configurationSnapshotJson: item.configurationSnapshotJson || undefined,
    }));
  }

  static async createOrder(userId: string, request: CreateOrderRequest): Promise<OrderResponse> {
    if (!request.customerName.trim()) {
      throw new AppError('Completá el nombre para el pedido.', 400);
    }

    if (!this.validateCustomerEmail(request.customerEmail)) {
      throw new AppError('Ingresá un email válido para el pedido.', 400);
    }

    const sourceItems = await this.getRequestItems(userId, request);

    const validatedItems = await Promise.all(
      sourceItems.map(async (item) => {
        const quantity = item.quantity || 1;

        if (item.customizationMode === 'user_upload') {
          const template = await prisma.uploadTemplate.findUnique({
            where: { id: item.uploadTemplateId },
            select: { id: true, requiredImageCount: true, active: true },
          });

          if (!template || !template.active) {
            throw new AppError('No encontramos la plantilla de personalizado seleccionada.', 404);
          }

          const uploadedAssetCount = this.readUploadedAssetCount(item.customAssetUrls);
          if (uploadedAssetCount !== template.requiredImageCount) {
            throw new AppError(`Debés cargar ${template.requiredImageCount} imagen${template.requiredImageCount === 1 ? '' : 'es'} para esta personalización.`, 400);
          }
        }

        const config = await new ConfiguratorService().resolveConfiguration({
          customizationMode: item.customizationMode,
          garmentModelId: item.garmentModelId,
          sizeId: item.sizeId,
          colorId: item.colorId,
          printPlacementCode: item.printPlacementCode,
          logoPlacementCode: item.logoPlacementCode,
          designId: item.designId,
          uploadTemplateId: item.uploadTemplateId,
          transferSizeCode: item.transferSizeCode,
          quantity,
        });

        if (!config.valid) {
          throw new AppError('Uno de los productos del carrito ya no tiene stock o dejó de estar disponible.', 400);
        }

        return {
          quantity,
          unitPrice: config.price,
          data: {
            customizationMode: item.customizationMode,
            configurationCode: config.configurationCode,
            garmentModelId: item.garmentModelId,
            colorId: item.colorId,
            sizeId: item.sizeId,
            designId: item.designId,
            uploadTemplateId: item.uploadTemplateId,
            customDesignUrl: item.customDesignUrl,
            customAssetUrlsJson: item.customAssetUrls ? JSON.stringify(this.normalizeCustomPayload(item.customAssetUrls)) : null,
            transferSizeCode: item.transferSizeCode,
            mainPlacement: item.printPlacementCode,
            printPlacementCode: item.printPlacementCode,
            logoPlacement: item.logoPlacementCode,
            logoPlacementCode: item.logoPlacementCode,
            unitPrice: config.price,
            layoutSnapshotJson: item.layoutSnapshot ? JSON.stringify(item.layoutSnapshot) : null,
            configurationSnapshotJson: item.configurationSnapshotJson || this.buildConfigurationSnapshot(config),
          },
          reservation: {
            customizationMode: item.customizationMode,
            garmentModelId: item.garmentModelId,
            colorId: item.colorId,
            sizeId: item.sizeId,
            designId: item.designId,
            transferSizeCode: item.transferSizeCode,
          },
        };
      })
    );

    const totalPrice = validatedItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

    const order = await prisma.$transaction(async (tx) => {
      for (const item of validatedItems) {
        await this.reserveStock(tx, {
          quantity: item.quantity,
          ...item.reservation,
        });
      }

      const createdOrder = await tx.order.create({
        data: {
          userId,
          customerName: request.customerName.trim(),
          customerEmail: request.customerEmail.trim(),
          totalPrice,
          status: 'pending',
          items: {
            create: validatedItems.map((item) => item.data),
          },
        },
        include: {
          items: true,
        },
      });

      const cart = await tx.cart.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (cart) {
        await tx.cartItem.deleteMany({
          where: { cartId: cart.id },
        });
      }

      return createdOrder;
    });

    catalogService.invalidateCatalogInitCache();
    return this.formatOrderResponse(order);
  }

  static async getOrderById(orderId: string): Promise<OrderResponse> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      throw new AppError('No encontramos ese pedido.', 404);
    }

    return this.formatOrderResponse(order);
  }

  static async getUserOrders(userId: string, page: number = 1, limit: number = 10): Promise<{ orders: OrderResponse[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: { userId },
        include: { items: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.order.count({ where: { userId } }),
    ]);

    return {
      orders: orders.map((order) => this.formatOrderResponse(order)),
      total,
      page,
      limit,
    };
  }

  static async updateOrderStatus(orderId: string, request: UpdateOrderStatusRequest): Promise<OrderResponse> {
    const order = await prisma.order.update({
      where: { id: orderId },
      data: { status: request.status },
      include: { items: true },
    });

    return this.formatOrderResponse(order);
  }

  static async getAllOrders(page: number = 1, limit: number = 10): Promise<{ orders: OrderResponse[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        include: { items: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.order.count(),
    ]);

    return {
      orders: orders.map((order) => this.formatOrderResponse(order)),
      total,
      page,
      limit,
    };
  }

  private static formatOrderResponse(order: any): OrderResponse {
    return {
      id: order.id,
      userId: order.userId,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      totalPrice: order.totalPrice,
      status: order.status,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      items: order.items.map((item: any) => ({
        id: item.id,
        orderId: item.orderId,
        customizationMode: item.customizationMode,
        configurationCode: item.configurationCode,
        garmentModelId: item.garmentModelId,
        colorId: item.colorId,
        sizeId: item.sizeId,
        designId: item.designId,
        uploadTemplateId: item.uploadTemplateId,
        customDesignUrl: item.customDesignUrl,
        customAssetUrlsJson: item.customAssetUrlsJson,
        transferSizeCode: item.transferSizeCode,
        printPlacementCode: item.printPlacementCode,
        logoPlacementCode: item.logoPlacementCode,
        unitPrice: item.unitPrice,
        layoutSnapshotJson: item.layoutSnapshotJson,
        configurationSnapshotJson: item.configurationSnapshotJson,
      })),
    };
  }
}
