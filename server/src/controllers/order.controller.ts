import { Request, Response, NextFunction } from 'express';
import { OrderService } from '../services/order.service.js';
import { CreateOrderRequest, UpdateOrderStatusRequest } from '../types/order.js';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string; role: string };
    }
  }
}

export const createOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Necesitás iniciar sesión para continuar.' });
    }

    const request: CreateOrderRequest = req.body;

    // Validation
    if (!request.customerName || !request.customerEmail || !request.items || request.items.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const order = await OrderService.createOrder(userId, request);
    res.status(201).json(order);
  } catch (error) {
    next(error);
  }
};

export const getOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Necesitás iniciar sesión para continuar.' });
    }

    const { orderId } = req.params;

    // Get order and verify ownership
    const order = await OrderService.getOrderById(orderId);
    if (order.userId !== userId && req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    res.json(order);
  } catch (error) {
    next(error);
  }
};

export const getUserOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Necesitás iniciar sesión para continuar.' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await OrderService.getUserOrders(userId, page, limit);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getAllOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // This controller assumes authorization is checked by middleware
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await OrderService.getAllOrders(page, limit);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const updateOrderStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orderId } = req.params;
    const request: UpdateOrderStatusRequest = req.body;

    if (!request.status) {
      return res.status(400).json({ error: 'Missing status field' });
    }

    const order = await OrderService.updateOrderStatus(orderId, request);
    res.json(order);
  } catch (error) {
    next(error);
  }
};
