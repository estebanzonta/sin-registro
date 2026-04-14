import { v4 as uuidv4 } from 'uuid';
import { CartItem, Cart, AddToCartRequest, UpdateCartItemRequest, CartResponse } from '../types/cart.js';
import { ConfiguratorService } from './configurator.service.js';
import { AppError } from '../middleware/errorHandler.js';

// In-memory storage for carts (keyed by userId)
// In production, this should move to persistent storage
const carts = new Map<string, Cart>();

export class CartService {
  /**
   * Get user's cart
   */
  static getCart(userId: string): CartResponse {
    const cart = carts.get(userId);
    if (!cart) {
      return {
        items: [],
        totalPrice: 0,
        totalItems: 0,
      };
    }
    return cart;
  }

  /**
   * Add item to cart
   */
  static async addToCart(userId: string, request: AddToCartRequest): Promise<CartResponse> {
    let cart = carts.get(userId);
    if (!cart) {
      cart = { items: [], totalPrice: 0, totalItems: 0 };
    }

    const quantity = request.quantity || 1;
    const itemId = uuidv4();
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

    const cartItem: CartItem = {
      id: itemId,
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
    };

    cart.items.push(cartItem);
    this.recalculateCart(cart);
    carts.set(userId, cart);

    return cart;
  }

  /**
   * Update cart item
   */
  static updateCartItem(userId: string, itemId: string, request: UpdateCartItemRequest): CartResponse {
    const cart = carts.get(userId);
    if (!cart) {
      throw new Error('Cart not found');
    }

    const item = cart.items.find(i => i.id === itemId);
    if (!item) {
      throw new Error('Item not found in cart');
    }

    if (request.quantity !== undefined) {
      if (request.quantity <= 0) {
        throw new Error('Quantity must be greater than 0');
      }
      item.quantity = request.quantity;
    }

    if (request.logoPlacementCode !== undefined) {
      item.logoPlacementCode = request.logoPlacementCode;
    }

    this.recalculateCart(cart);
    carts.set(userId, cart);

    return cart;
  }

  /**
   * Remove item from cart
   */
  static removeFromCart(userId: string, itemId: string): CartResponse {
    const cart = carts.get(userId);
    if (!cart) {
      throw new Error('Cart not found');
    }

    cart.items = cart.items.filter(i => i.id !== itemId);
    this.recalculateCart(cart);
    carts.set(userId, cart);

    return cart;
  }

  /**
   * Clear cart
   */
  static clearCart(userId: string): CartResponse {
    carts.set(userId, { items: [], totalPrice: 0, totalItems: 0 });
    return carts.get(userId)!;
  }

  /**
   * Recalculate cart totals
   */
  private static recalculateCart(cart: Cart): void {
    cart.totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    cart.totalPrice = cart.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  }
}
