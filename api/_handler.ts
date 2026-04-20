import { createApp } from '../server/src/app.js';

const app = createApp();
const shouldLogRequests =
  process.env.NODE_ENV !== 'production' || process.env.LOG_API_REQUESTS === 'true';

export function handleRequest(req: any, res: any) {
  const originalUrl = typeof req.url === 'string' ? req.url : '';

  if (typeof req.url === 'string' && !req.url.startsWith('/api')) {
    req.url = `/api${req.url.startsWith('/') ? req.url : `/${req.url}`}`;
  }

  const normalizedUrl = typeof req.url === 'string' ? req.url : originalUrl;
  if (shouldLogRequests) {
    console.log('[api/_handler] incoming request', {
      method: req.method,
      originalUrl,
      normalizedUrl,
    });
  }

  const originalJson = res.json?.bind(res);
  if (originalJson && shouldLogRequests) {
    res.json = (body: unknown) => {
      console.log('[api/_handler] json response', {
        method: req.method,
        normalizedUrl,
        statusCode: res.statusCode,
      });
      return originalJson(body);
    };
  }

  if (shouldLogRequests) {
    res.on?.('finish', () => {
      console.log('[api/_handler] finished request', {
        method: req.method,
        normalizedUrl,
        statusCode: res.statusCode,
      });
    });
  }

  return app(req, res);
}
