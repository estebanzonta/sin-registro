import express from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/errorHandler.js';
import { registerAppRoutes } from './routes/index.js';

export function createApp() {
  const app = express();

  app.use(cors({
    origin: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(','),
    credentials: true,
  }));
  app.use(express.json({ limit: '15mb' }));

  registerAppRoutes(app);

  app.use(errorHandler);

  return app;
}
