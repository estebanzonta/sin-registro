import { catalogService } from '../services/catalog.service.js';
import { requireIdParam } from '../validation/request-validation.js';

export async function getCatalogInitHandler() {
  return catalogService.getCatalogInit();
}

export async function getDesignsHandler() {
  return catalogService.getDesigns();
}

export async function getGarmentModelHandler(idParam: unknown) {
  const id = requireIdParam(idParam, 'modelo de prenda');
  return catalogService.getGarmentModel(id);
}
