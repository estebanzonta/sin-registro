import jwt from 'jsonwebtoken';
import { getCatalogInitHandler, getDesignsHandler, getGarmentModelHandler } from '../handlers/catalog.handlers.js';
import { resolveConfigurationHandler } from '../handlers/configurator.handlers.js';
import { loginHandler, meHandler, registerHandler } from '../handlers/auth.handlers.js';
import { addToCartHandler, clearCartHandler, getCartHandler, removeFromCartHandler, updateCartItemHandler } from '../handlers/cart.handlers.js';
import { createOrderHandler, getAllOrdersHandler, getOrderHandler, getUserOrdersHandler, updateOrderStatusHandler } from '../handlers/order.handlers.js';
import { AppError } from '../middleware/errorHandler.js';
import { errorResponse, jsonResponse } from './respond.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';

function readBearerUserId(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return undefined;
  }

  try {
    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET) as { id?: string };
    return decoded.id;
  } catch {
    throw new AppError('Tu sesión no es válida. Ingresá nuevamente.', 401);
  }
}

export async function handlePublicApi(request: Request) {
  try {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '');

    if (request.method === 'GET' && path.endsWith('/api/catalog/init')) {
      return jsonResponse(await getCatalogInitHandler());
    }

    if (request.method === 'GET' && path.endsWith('/api/catalog/designs')) {
      return jsonResponse(await getDesignsHandler());
    }

    const garmentModelMatch = path.match(/\/api\/catalog\/garment-models\/([^/]+)$/);
    if (request.method === 'GET' && garmentModelMatch) {
      return jsonResponse(await getGarmentModelHandler(garmentModelMatch[1]));
    }

    if (request.method === 'POST' && path.endsWith('/api/configurator/resolve')) {
      return jsonResponse(await resolveConfigurationHandler(await request.json()));
    }

    if (request.method === 'POST' && path.endsWith('/api/auth/register')) {
      return jsonResponse(await registerHandler(await request.json()), { status: 201 });
    }

    if (request.method === 'POST' && path.endsWith('/api/auth/login')) {
      return jsonResponse(await loginHandler(await request.json()));
    }

    if (request.method === 'GET' && path.endsWith('/api/auth/me')) {
      return jsonResponse(await meHandler(readBearerUserId(request)));
    }

    if (request.method === 'GET' && path.endsWith('/api/cart')) {
      return jsonResponse(await getCartHandler(readBearerUserId(request)));
    }

    if (request.method === 'DELETE' && path.endsWith('/api/cart')) {
      return jsonResponse(await clearCartHandler(readBearerUserId(request)));
    }

    if (request.method === 'POST' && path.endsWith('/api/cart/items')) {
      return jsonResponse(await addToCartHandler(readBearerUserId(request), await request.json()), { status: 201 });
    }

    const cartItemMatch = path.match(/\/api\/cart\/items\/([^/]+)$/);
    if (cartItemMatch && request.method === 'PATCH') {
      return jsonResponse(await updateCartItemHandler(readBearerUserId(request), cartItemMatch[1], await request.json()));
    }

    if (cartItemMatch && request.method === 'DELETE') {
      return jsonResponse(await removeFromCartHandler(readBearerUserId(request), cartItemMatch[1]));
    }

    if (request.method === 'POST' && path.endsWith('/api/orders')) {
      return jsonResponse(await createOrderHandler(readBearerUserId(request), await request.json()), { status: 201 });
    }

    if (request.method === 'GET' && path.endsWith('/api/orders/my-orders')) {
      return jsonResponse(await getUserOrdersHandler(readBearerUserId(request), Object.fromEntries(url.searchParams.entries())));
    }

    if (request.method === 'GET' && path.endsWith('/api/orders/admin/all')) {
      const userId = readBearerUserId(request);
      const me = await meHandler(userId);
      if (me.role !== 'admin') {
        throw new AppError('No tenés permisos para acceder a esta sección.', 403);
      }
      return jsonResponse(await getAllOrdersHandler(Object.fromEntries(url.searchParams.entries())));
    }

    const orderStatusMatch = path.match(/\/api\/orders\/([^/]+)\/status$/);
    if (orderStatusMatch && request.method === 'PATCH') {
      const userId = readBearerUserId(request);
      const me = await meHandler(userId);
      if (me.role !== 'admin') {
        throw new AppError('No tenés permisos para acceder a esta sección.', 403);
      }
      return jsonResponse(await updateOrderStatusHandler(orderStatusMatch[1], await request.json()));
    }

    const orderMatch = path.match(/\/api\/orders\/([^/]+)$/);
    if (orderMatch && request.method === 'GET') {
      const userId = readBearerUserId(request);
      const me = await meHandler(userId);
      return jsonResponse(await getOrderHandler(userId, me.role, orderMatch[1]));
    }

    return jsonResponse({ error: 'Not found', statusCode: 404 }, { status: 404 });
  } catch (error) {
    return errorResponse(error);
  }
}
