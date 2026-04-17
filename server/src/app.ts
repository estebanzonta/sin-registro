import express from 'express';
import cors from 'cors';
import { AppError } from './middleware/errorHandler.js';
import { isProductionRuntime, readCommaSeparatedEnv } from './config/runtime-env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { registerAppRoutes } from './routes/index.js';

export function createApp() {
  const app = express();
  const corsOrigins = readCommaSeparatedEnv('CORS_ORIGIN');

  if (!corsOrigins.length) {
    if (isProductionRuntime()) {
      throw new AppError('Falta configurar CORS_ORIGIN para produccion.', 500);
    }

    corsOrigins.push('http://localhost:5173');
  }

  app.use(cors({
    origin: corsOrigins,
    credentials: true,
  }));
  app.use(express.json({ limit: '15mb' }));

  registerAppRoutes(app);

  app.use(errorHandler);

  return app;
}
