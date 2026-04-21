import { handleSegmentRequest } from '../../vercel-api/segment-handler.js';

export default function handler(req: any, res: any) {
  return handleSegmentRequest('/admin', req, res);
}
