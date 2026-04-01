import { prisma } from '../db.js';
import { ConfiguratorService } from './configurator.service.js';
import { CreateOrderRequest, OrderResponse, UpdateOrderStatusRequest, UploadedCustomizationPayload } from '../types/order.js';

export class OrderService {
  private static normalizeCustomPayload(value: CreateOrderRequest['items'][number]['customAssetUrls']) {
    if (!value) {
      return null;
    }

    if (Array.isArray(value)) {
      const payload: UploadedCustomizationPayload = { assets: value };
      return payload;
    }

    return value;
  }

  static async createOrder(userId: string, request: CreateOrderRequest): Promise<OrderResponse> {
    if (!request.items || request.items.length === 0) {
      throw new Error('Order must contain at least one item');
    }

    const validatedItems = await Promise.all(
      request.items.map(async (item) => {
        const quantity = item.quantity || 1;
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
        });

        if (!config.valid) {
          throw new Error('Order item is not producible');
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
            configurationSnapshotJson: item.configurationSnapshotJson || JSON.stringify({
              configurationCode: config.configurationCode,
              availableLogoPlacements: config.allowedLogoPlacements.map((placement) => placement.code),
              selectedTransferSize: config.selectedTransferSize,
              printArea: config.printArea,
            }),
          },
        };
      })
    );

    const totalPrice = validatedItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

    const order = await prisma.order.create({
      data: {
        userId,
        customerName: request.customerName,
        customerEmail: request.customerEmail,
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

    return this.formatOrderResponse(order);
  }

  static async getOrderById(orderId: string): Promise<OrderResponse> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      throw new Error('Order not found');
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
