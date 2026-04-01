import { Router } from 'express';
import { verifyAdmin } from '../middleware/auth.js';
import {
  getGarmentModels,
  createGarmentModel,
  updateGarmentModel,
  deleteGarmentModel,
  getDesigns,
  createDesign,
  updateDesign,
  deleteDesign,
  getBlankStock,
  updateBlankStock,
  getUsers,
  updateUserRole,
  getCollections,
  createCollection,
  createGarmentCategory,
  createSize,
  createColor,
  createDesignCategory,
  uploadAsset,
  getPlacements,
  getBrandLogos,
  createBrandLogo,
  updateBrandLogo,
  deleteBrandLogo,
  bootstrapPlacements,
  getPrintAreas,
  createPrintArea,
  getUploadTemplates,
  createUploadTemplate,
} from '../controllers/admin.controller.js';

export const adminRoutes = Router();

// Protect all admin routes
adminRoutes.use(verifyAdmin);

// Garment Models
adminRoutes.get('/garment-models', getGarmentModels);
adminRoutes.post('/garment-models', createGarmentModel);
adminRoutes.patch('/garment-models/:id', updateGarmentModel);
adminRoutes.delete('/garment-models/:id', deleteGarmentModel);

// Designs
adminRoutes.get('/designs', getDesigns);
adminRoutes.post('/designs', createDesign);
adminRoutes.patch('/designs/:id', updateDesign);
adminRoutes.delete('/designs/:id', deleteDesign);

// Blank Stock
adminRoutes.get('/blank-stock', getBlankStock);
adminRoutes.patch('/blank-stock/:id', updateBlankStock);

// Users
adminRoutes.get('/users', getUsers);
adminRoutes.patch('/users/:id/role', updateUserRole);

// Collections
adminRoutes.get('/collections', getCollections);
adminRoutes.post('/collections', createCollection);
adminRoutes.post('/garment-categories', createGarmentCategory);
adminRoutes.post('/sizes', createSize);
adminRoutes.post('/colors', createColor);
adminRoutes.post('/design-categories', createDesignCategory);
adminRoutes.post('/assets/upload', uploadAsset);

// Production config
adminRoutes.get('/placements', getPlacements);
adminRoutes.get('/brand-logos', getBrandLogos);
adminRoutes.post('/brand-logos', createBrandLogo);
adminRoutes.patch('/brand-logos/:id', updateBrandLogo);
adminRoutes.delete('/brand-logos/:id', deleteBrandLogo);
adminRoutes.post('/placements/bootstrap', bootstrapPlacements);
adminRoutes.get('/print-areas', getPrintAreas);
adminRoutes.post('/print-areas', createPrintArea);
adminRoutes.get('/upload-templates', getUploadTemplates);
adminRoutes.post('/upload-templates', createUploadTemplate);
