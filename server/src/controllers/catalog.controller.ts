import type { Request, Response } from 'express';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { getCatalogInitHandler, getDesignsHandler, getGarmentModelHandler } from '../handlers/catalog.handlers.js';
import { StorageService } from '../services/storage.service.js';

export const getCatalogInit = asyncHandler(async (_req: Request, res: Response) => {
  const data = await getCatalogInitHandler();
  res.json(data);
});

export const getDesigns = asyncHandler(async (_req: Request, res: Response) => {
  const designs = await getDesignsHandler();
  res.json(designs);
});

export const getGarmentModel = asyncHandler(async (req: Request, res: Response) => {
  const model = await getGarmentModelHandler(req.params.id);
  res.json(model);
});

export const getUploadedAsset = asyncHandler(async (req: Request, res: Response) => {
  const folder = String(req.params.folder || '').replace(/[^a-z0-9-_]/gi, '').toLowerCase();
  const filename = String(req.params.filename || '').trim();

  if (!folder || !filename || filename.includes('/') || filename.includes('\\')) {
    throw new AppError('No encontramos el archivo solicitado.', 404);
  }

  const asset = await StorageService.readAsset(folder, filename);
  res.setHeader('Content-Type', asset.contentType);
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.send(asset.buffer);
});
