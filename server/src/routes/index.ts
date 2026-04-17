import { Router, type Express } from 'express';
import { authRoutes } from './auth.routes.js';
import { catalogRoutes } from './catalog.routes.js';
import { configuratorRoutes } from './configurator.routes.js';
import { adminRoutes } from './admin.routes.js';
import { cartRoutes } from './cart.routes.js';
import { orderRoutes } from './order.routes.js';
import { getUploadedAsset } from '../controllers/catalog.controller.js';

export function createApiRouter() {
  const router = Router();

  router.use('/auth', authRoutes);
  router.use('/catalog', catalogRoutes);
  router.use('/configurator', configuratorRoutes);
  router.use('/cart', cartRoutes);
  router.use('/orders', orderRoutes);
  router.use('/admin', adminRoutes);

  return router;
}

export function registerAppRoutes(app: Express) {
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
  });
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
  });
  app.get('/api/assets/:folder/:filename', getUploadedAsset);

  app.use('/api', createApiRouter());

  app.use((_req, res) => {
    console.warn('[routes] not found', {
      method: _req.method,
      path: _req.path,
      originalUrl: _req.originalUrl,
    });
    res.status(404).json({
      error: 'Not found',
      statusCode: 404,
      path: _req.path,
      originalUrl: _req.originalUrl,
      method: _req.method,
    });
  });
}
