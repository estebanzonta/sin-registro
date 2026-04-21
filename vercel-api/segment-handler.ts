import { handleRequest } from './handler.js';

function normalizeRouteParam(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === 'string' && item.length > 0).join('/');
  }

  return typeof value === 'string' ? value : '';
}

export function handleSegmentRequest(basePath: string, req: any, res: any) {
  const base = basePath.startsWith('/api') ? basePath : `/api${basePath.startsWith('/') ? basePath : `/${basePath}`}`;
  const route = normalizeRouteParam(req?.query?.route);
  const rawUrl = typeof req?.url === 'string' ? req.url : '';
  const queryIndex = rawUrl.indexOf('?');
  const search = queryIndex >= 0 ? rawUrl.slice(queryIndex) : '';

  if (route) {
    req.url = `${base}/${route}${search}`;
  } else if (typeof req.url === 'string' && !req.url.startsWith(base)) {
    req.url = `${base}${req.url.startsWith('/') ? req.url : `/${req.url}`}`;
  }

  return handleRequest(req, res);
}

export function handleParamRequest(basePath: string, params: string[], req: any, res: any) {
  const base = basePath.startsWith('/api') ? basePath : `/api${basePath.startsWith('/') ? basePath : `/${basePath}`}`;
  const path = params
    .map((key) => req?.query?.[key])
    .flatMap((value) => Array.isArray(value) ? value : [value])
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .join('/');
  const rawUrl = typeof req?.url === 'string' ? req.url : '';
  const queryIndex = rawUrl.indexOf('?');
  const search = queryIndex >= 0 ? rawUrl.slice(queryIndex) : '';

  req.url = path ? `${base}/${path}${search}` : `${base}${search}`;
  return handleRequest(req, res);
}
