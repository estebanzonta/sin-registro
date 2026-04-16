import type { Request, Response, NextFunction } from 'express';
import { createOrderHandler, getAllOrdersHandler, getOrderHandler, getUserOrdersHandler, updateOrderStatusHandler } from '../handlers/order.handlers.js';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string; role: string };
    }
  }
}

export const createOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await createOrderHandler(req.user?.id, req.body);
    res.status(201).json(order);
  } catch (error) {
    next(error);
  }
};

export const getOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await getOrderHandler(req.user?.id, req.user?.role, req.params.orderId);
    res.json(order);
  } catch (error) {
    next(error);
  }
};

export const getUserOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await getUserOrdersHandler(req.user?.id, req.query as Record<string, unknown>);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getAllOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await getAllOrdersHandler(req.query as Record<string, unknown>);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const updateOrderStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await updateOrderStatusHandler(req.params.orderId, req.body);
    res.json(order);
  } catch (error) {
    next(error);
  }
};
