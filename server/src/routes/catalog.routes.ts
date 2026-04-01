import { Router } from 'express';
import {
  getCatalogInit,
  getDesigns,
  getGarmentModel,
} from '../controllers/catalog.controller.js';

export const catalogRoutes = Router();

catalogRoutes.get('/init', getCatalogInit);
catalogRoutes.get('/designs', getDesigns);
catalogRoutes.get('/garment-models/:id', getGarmentModel);
