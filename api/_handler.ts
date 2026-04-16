import { createApp } from '../server/src/app.js';

const app = createApp();

export function handleRequest(req: any, res: any) {
  if (typeof req.url === 'string' && req.url.startsWith('/api/')) {
    req.url = req.url.slice(4) || '/';
  } else if (req.url === '/api') {
    req.url = '/';
  }

  return app(req, res);
}
