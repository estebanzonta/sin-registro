import type { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { getCatalogInitHandler, getDesignsHandler, getGarmentModelHandler } from '../handlers/catalog.handlers.js';

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
