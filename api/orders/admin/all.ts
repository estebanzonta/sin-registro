import { handleRequest } from '../../../vercel-api/handler.js';

export default function handler(req: any, res: any) {
  return handleRequest(req, res);
}
