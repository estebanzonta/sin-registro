import { handleRequest } from '../_handler.js';

export default function handler(req: any, res: any) {
  if (typeof req.url === 'string' && !req.url.startsWith('/api/cart')) {
    req.url = `/api/cart${req.url.startsWith('/') ? req.url : `/${req.url}`}`;
  }
  return handleRequest(req, res);
}
