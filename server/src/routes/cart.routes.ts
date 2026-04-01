import { Router } from 'express';
import { verifyAuth } from '../middleware/auth.js';
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
} from '../controllers/cart.controller.js';

export const cartRoutes = Router();

// Protect all cart routes
cartRoutes.use(verifyAuth);

// Get cart
cartRoutes.get('/', getCart);

// Add item to cart
cartRoutes.post('/items', addToCart);

// Update cart item
cartRoutes.patch('/items/:itemId', updateCartItem);

// Remove item from cart
cartRoutes.delete('/items/:itemId', removeFromCart);

// Clear cart
cartRoutes.delete('/', clearCart);
