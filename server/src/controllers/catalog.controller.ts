import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { catalogService } from '../services/catalog.service.js';

export const getCatalogInit = asyncHandler(async (req: Request, res: Response) => {
  const data = await catalogService.getCatalogInit();
  res.json(data);
});

export const getDesigns = asyncHandler(async (req: Request, res: Response) => {
  const designs = await catalogService.getDesigns();
  res.json(designs);
});

export const getGarmentModel = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const model = await catalogService.getGarmentModel(id);
  res.json(model);
});
