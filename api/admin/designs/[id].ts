import { handleParamRequest } from '../../../vercel-api/segment-handler.js';

export default function handler(req: any, res: any) {
  return handleParamRequest('/admin/designs', ['id'], req, res);
}
