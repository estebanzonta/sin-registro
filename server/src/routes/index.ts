import { Router, type Express } from 'express';
import { authRoutes } from './auth.routes.js';
import { catalogRoutes } from './catalog.routes.js';
import { configuratorRoutes } from './configurator.routes.js';
import { adminRoutes } from './admin.routes.js';
import { cartRoutes } from './cart.routes.js';
import { orderRoutes } from './order.routes.js';

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
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
  });

  app.use('/api', createApiRouter());

  app.use((req, res) => {
    res.status(404).json({ error: 'Not found', statusCode: 404 });
  });
}
