import { Router } from 'express';
import { verifyAuth, verifyAdmin } from '../middleware/auth.js';
import {
  createOrder,
  getOrder,
  getUserOrders,
  getAllOrders,
  updateOrderStatus,
} from '../controllers/order.controller.js';

export const orderRoutes = Router();

// User order routes (protected)
orderRoutes.post('/', verifyAuth, createOrder);
orderRoutes.get('/my-orders', verifyAuth, getUserOrders);
orderRoutes.get('/:orderId', verifyAuth, getOrder);

// Admin order routes
orderRoutes.get('/admin/all', verifyAdmin, getAllOrders);
orderRoutes.patch('/:orderId/status', verifyAdmin, updateOrderStatus);
