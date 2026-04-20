import express from 'express';
import cors from 'cors';
import { AppError } from './middleware/errorHandler.js';
import { isProductionRuntime, resolveCorsOrigins } from './config/runtime-env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { registerAppRoutes } from './routes/index.js';
import { formatTimingHeader, nowMs, readSlowRequestThresholdMs, shouldLogTiming } from './utils/timing.js';

export function createApp() {
  const app = express();
  const corsOrigins = resolveCorsOrigins();
  const slowRequestThresholdMs = readSlowRequestThresholdMs();

  if (!corsOrigins.length) {
    if (isProductionRuntime()) {
      throw new AppError('Falta configurar CORS_ORIGIN y no pudimos inferir el dominio publico.', 500);
    }

    corsOrigins.push('http://localhost:5173');
  }

  app.use(cors({
    origin: corsOrigins,
    credentials: true,
  }));
  app.use((req, res, next) => {
    const startedAt = nowMs();
    const originalEnd = res.end.bind(res);

    res.end = ((...args: Parameters<typeof res.end>) => {
      const totalMs = nowMs() - startedAt;
      if (!res.headersSent) {
        res.setHeader('Server-Timing', formatTimingHeader([{ label: 'app', durationMs: totalMs }]));
      }

      if (shouldLogTiming() || totalMs >= slowRequestThresholdMs) {
        console.log('[perf] request', {
          method: req.method,
          path: req.originalUrl || req.url,
          statusCode: res.statusCode,
          durationMs: Math.round(totalMs * 10) / 10,
        });
      }

      return originalEnd(...args);
    }) as typeof res.end;

    next();
  });
  app.use(express.json({ limit: '15mb' }));

  registerAppRoutes(app);

  app.use(errorHandler);

  return app;
}
