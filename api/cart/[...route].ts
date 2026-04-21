import { handleSegmentRequest } from '../_segment_handler.js';

export default function handler(req: any, res: any) {
  return handleSegmentRequest('/cart', req, res);
}
