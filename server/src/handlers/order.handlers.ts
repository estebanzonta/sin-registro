import { AppError } from '../middleware/errorHandler.js';
import { OrderService } from '../services/order.service.js';
import { parseCreateOrderRequest, parsePagination, parseUpdateOrderStatusRequest, requireIdParam } from '../validation/request-validation.js';

function requireUserId(userId: string | undefined) {
  if (!userId) {
    throw new AppError('Necesitás iniciar sesión para continuar.', 401);
  }

  return userId;
}

export async function createOrderHandler(userId: string | undefined, body: unknown) {
  return OrderService.createOrder(requireUserId(userId), parseCreateOrderRequest(body));
}

export async function getOrderHandler(userId: string | undefined, role: string | undefined, orderIdParam: unknown) {
  const order = await OrderService.getOrderById(requireIdParam(orderIdParam, 'pedido'));
  const resolvedUserId = requireUserId(userId);

  if (order.userId !== resolvedUserId && role !== 'admin') {
    throw new AppError('No tenés permisos para ver ese pedido.', 403);
  }

  return order;
}

export async function getUserOrdersHandler(userId: string | undefined, query: Record<string, unknown>) {
  const { page, limit } = parsePagination(query);
  return OrderService.getUserOrders(requireUserId(userId), page, limit);
}

export async function getAllOrdersHandler(query: Record<string, unknown>) {
  const { page, limit } = parsePagination(query);
  return OrderService.getAllOrders(page, limit);
}

export async function updateOrderStatusHandler(orderIdParam: unknown, body: unknown) {
  return OrderService.updateOrderStatus(
    requireIdParam(orderIdParam, 'pedido'),
    parseUpdateOrderStatusRequest(body)
  );
}
