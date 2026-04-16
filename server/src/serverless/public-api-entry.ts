import { handlePublicApi } from './public-api.js';

export default async function handler(request: Request) {
  return handlePublicApi(request);
}
