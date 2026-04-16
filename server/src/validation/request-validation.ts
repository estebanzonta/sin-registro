import { AppError } from '../middleware/errorHandler.js';
import type { AddToCartRequest, UpdateCartItemRequest } from '../types/cart.js';
import type { AuthRequest, ConfiguratorRequest, CustomizationMode, TransferSizeCode } from '../types/index.js';
import type { CreateOrderRequest, OrderItemData, UpdateOrderStatusRequest } from '../types/order.js';

const VALID_CUSTOMIZATION_MODES: CustomizationMode[] = ['brand_design', 'user_upload'];
const VALID_TRANSFER_SIZES: TransferSizeCode[] = ['chico', 'mediano', 'grande'];
const VALID_PRINT_PLACEMENTS = ['FRONT', 'BACK'];
const VALID_ORDER_STATUSES: UpdateOrderStatusRequest['status'][] = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

function asNonEmptyString(value: unknown, message: string) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new AppError(message, 400);
  }

  return value.trim();
}

export function requireIdParam(value: unknown, label: string) {
  return asNonEmptyString(value, `Falta el identificador de ${label}.`);
}

export function parseAuthRequest(body: unknown): AuthRequest {
  const payload = (body || {}) as Record<string, unknown>;

  return {
    email: asNonEmptyString(payload.email, 'Completá email y contraseña.'),
    password: asNonEmptyString(payload.password, 'Completá email y contraseña.'),
  };
}

export function parseConfiguratorRequest(body: unknown): ConfiguratorRequest {
  const payload = (body || {}) as Record<string, unknown>;
  const customizationMode = asNonEmptyString(payload.customizationMode, 'Falta el modo de personalización.') as CustomizationMode;

  if (!VALID_CUSTOMIZATION_MODES.includes(customizationMode)) {
    throw new AppError('El modo de personalización no es válido.', 400);
  }

  const printPlacementCode = asNonEmptyString(payload.printPlacementCode, 'Falta la cara de impresión.');
  if (!VALID_PRINT_PLACEMENTS.includes(printPlacementCode)) {
    throw new AppError('La cara de impresión no es válida.', 400);
  }

  const transferSizeCode = asNonEmptyString(payload.transferSizeCode, 'Falta el tamaño de estampa.') as TransferSizeCode;
  if (!VALID_TRANSFER_SIZES.includes(transferSizeCode)) {
    throw new AppError('El tamaño de estampa no es válido.', 400);
  }

  const request: ConfiguratorRequest = {
    customizationMode,
    garmentModelId: asNonEmptyString(payload.garmentModelId, 'Falta la prenda.'),
    sizeId: asNonEmptyString(payload.sizeId, 'Falta el talle.'),
    colorId: asNonEmptyString(payload.colorId, 'Falta el color.'),
    printPlacementCode,
    logoPlacementCode: asNonEmptyString(payload.logoPlacementCode, 'Falta la ubicación del logo.'),
    transferSizeCode,
  };

  if (customizationMode === 'brand_design') {
    request.designId = asNonEmptyString(payload.designId, 'Falta el diseño de la marca.');
  } else {
    request.uploadTemplateId = asNonEmptyString(payload.uploadTemplateId, 'Falta la plantilla de personalizado.');
  }

  return request;
}

export function parseAddToCartRequest(body: unknown): AddToCartRequest {
  const payload = parseConfiguratorRequest(body) as AddToCartRequest;
  const source = (body || {}) as Record<string, unknown>;
  const quantityValue = source.quantity;

  if (quantityValue !== undefined) {
    const quantity = Number(quantityValue);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new AppError('La cantidad debe ser un entero mayor a 0.', 400);
    }
    payload.quantity = quantity;
  }

  if (typeof source.customDesignUrl === 'string' && source.customDesignUrl.trim()) {
    payload.customDesignUrl = source.customDesignUrl.trim();
  }
  if (typeof source.customAssetUrlsJson === 'string' && source.customAssetUrlsJson.trim()) {
    payload.customAssetUrlsJson = source.customAssetUrlsJson;
  }
  if (typeof source.layoutSnapshotJson === 'string' && source.layoutSnapshotJson.trim()) {
    payload.layoutSnapshotJson = source.layoutSnapshotJson;
  }
  if (typeof source.configurationSnapshotJson === 'string' && source.configurationSnapshotJson.trim()) {
    payload.configurationSnapshotJson = source.configurationSnapshotJson;
  }

  return payload;
}

export function parseUpdateCartItemRequest(body: unknown): UpdateCartItemRequest {
  const payload = (body || {}) as Record<string, unknown>;
  const request: UpdateCartItemRequest = {};

  if (payload.quantity !== undefined) {
    const quantity = Number(payload.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new AppError('La cantidad debe ser un entero mayor a 0.', 400);
    }
    request.quantity = quantity;
  }

  if (payload.logoPlacementCode !== undefined) {
    request.logoPlacementCode = asNonEmptyString(payload.logoPlacementCode, 'La ubicación del logo no es válida.');
  }

  if (request.quantity === undefined && request.logoPlacementCode === undefined) {
    throw new AppError('No hay cambios válidos para actualizar el producto del carrito.', 400);
  }

  return request;
}

function parseOrderItem(body: unknown): OrderItemData {
  const payload = (body || {}) as Record<string, unknown>;
  const base = parseConfiguratorRequest(payload) as OrderItemData;

  if (payload.quantity !== undefined) {
    const quantity = Number(payload.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new AppError('La cantidad del producto debe ser un entero mayor a 0.', 400);
    }
    base.quantity = quantity;
  }

  if (typeof payload.customDesignUrl === 'string' && payload.customDesignUrl.trim()) {
    base.customDesignUrl = payload.customDesignUrl.trim();
  }
  if (payload.customAssetUrls !== undefined) {
    base.customAssetUrls = payload.customAssetUrls as OrderItemData['customAssetUrls'];
  }
  if (typeof payload.configurationSnapshotJson === 'string' && payload.configurationSnapshotJson.trim()) {
    base.configurationSnapshotJson = payload.configurationSnapshotJson;
  }
  if (payload.layoutSnapshot && typeof payload.layoutSnapshot === 'object') {
    base.layoutSnapshot = payload.layoutSnapshot as OrderItemData['layoutSnapshot'];
  }

  return base;
}

export function parseCreateOrderRequest(body: unknown): CreateOrderRequest {
  const payload = (body || {}) as Record<string, unknown>;
  const request: CreateOrderRequest = {
    customerName: asNonEmptyString(payload.customerName, 'Completá nombre y email para confirmar el pedido.'),
    customerEmail: asNonEmptyString(payload.customerEmail, 'Completá nombre y email para confirmar el pedido.'),
  };

  if (payload.items !== undefined) {
    if (!Array.isArray(payload.items)) {
      throw new AppError('Los productos del pedido no tienen un formato válido.', 400);
    }
    request.items = payload.items.map((item) => parseOrderItem(item));
  }

  return request;
}

export function parseUpdateOrderStatusRequest(body: unknown): UpdateOrderStatusRequest {
  const payload = (body || {}) as Record<string, unknown>;
  const status = asNonEmptyString(payload.status, 'Falta el estado del pedido.') as UpdateOrderStatusRequest['status'];

  if (!VALID_ORDER_STATUSES.includes(status)) {
    throw new AppError('El estado del pedido no es válido.', 400);
  }

  return { status };
}

export function parsePagination(query: Record<string, unknown>) {
  const page = Math.max(1, Number.parseInt(String(query.page || '1'), 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(String(query.limit || '10'), 10) || 10));
  return { page, limit };
}
