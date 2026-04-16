import type { Request, Response, NextFunction } from 'express';
import { addToCartHandler, clearCartHandler, getCartHandler, removeFromCartHandler, updateCartItemHandler } from '../handlers/cart.handlers.js';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string; role: string };
    }
  }
}

export const getCart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cart = await getCartHandler(req.user?.id);
    res.json(cart);
  } catch (error) {
    next(error);
  }
};

export const addToCart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cart = await addToCartHandler(req.user?.id, req.body);
    res.status(201).json(cart);
  } catch (error) {
    next(error);
  }
};

export const updateCartItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cart = await updateCartItemHandler(req.user?.id, req.params.itemId, req.body);
    res.json(cart);
  } catch (error) {
    next(error);
  }
};

export const removeFromCart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cart = await removeFromCartHandler(req.user?.id, req.params.itemId);
    res.json(cart);
  } catch (error) {
    next(error);
  }
};

export const clearCart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cart = await clearCartHandler(req.user?.id);
    res.json(cart);
  } catch (error) {
    next(error);
  }
};
