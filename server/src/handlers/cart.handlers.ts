import { AppError } from '../middleware/errorHandler.js';
import { CartService } from '../services/cart.service.js';
import { parseAddToCartRequest, parseUpdateCartItemRequest, requireIdParam } from '../validation/request-validation.js';

function requireUserId(userId: string | undefined) {
  if (!userId) {
    throw new AppError('Necesitás iniciar sesión para continuar.', 401);
  }

  return userId;
}

export async function getCartHandler(userId: string | undefined) {
  return CartService.getCart(requireUserId(userId));
}

export async function addToCartHandler(userId: string | undefined, body: unknown) {
  return CartService.addToCart(requireUserId(userId), parseAddToCartRequest(body));
}

export async function updateCartItemHandler(userId: string | undefined, itemIdParam: unknown, body: unknown) {
  const itemId = requireIdParam(itemIdParam, 'item del carrito');
  return CartService.updateCartItem(requireUserId(userId), itemId, parseUpdateCartItemRequest(body));
}

export async function removeFromCartHandler(userId: string | undefined, itemIdParam: unknown) {
  const itemId = requireIdParam(itemIdParam, 'item del carrito');
  return CartService.removeFromCart(requireUserId(userId), itemId);
}

export async function clearCartHandler(userId: string | undefined) {
  return CartService.clearCart(requireUserId(userId));
}
