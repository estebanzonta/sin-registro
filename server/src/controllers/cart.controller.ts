import { Request, Response, NextFunction } from 'express';
import { CartService } from '../services/cart.service.js';
import { AddToCartRequest, UpdateCartItemRequest } from '../types/cart.js';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string; role: string };
    }
  }
}

export const getCart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const cart = CartService.getCart(userId);
    res.json(cart);
  } catch (error) {
    next(error);
  }
};

export const addToCart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const request: AddToCartRequest = req.body;

    // Validation
    if (!request.garmentModelId || !request.colorId || !request.sizeId || !request.transferSizeCode || !request.printPlacementCode || !request.customizationMode) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const cart = await CartService.addToCart(userId, request);
    res.status(201).json(cart);
  } catch (error) {
    next(error);
  }
};

export const updateCartItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { itemId } = req.params;
    const request: UpdateCartItemRequest = req.body;

    const cart = CartService.updateCartItem(userId, itemId, request);
    res.json(cart);
  } catch (error) {
    next(error);
  }
};

export const removeFromCart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { itemId } = req.params;

    const cart = CartService.removeFromCart(userId, itemId);
    res.json(cart);
  } catch (error) {
    next(error);
  }
};

export const clearCart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const cart = CartService.clearCart(userId);
    res.json(cart);
  } catch (error) {
    next(error);
  }
};
