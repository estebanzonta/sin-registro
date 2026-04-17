import { createApp } from '../server/src/app.js';

const app = createApp();

export function handleRequest(req: any, res: any) {
  return app(req, res);
}
