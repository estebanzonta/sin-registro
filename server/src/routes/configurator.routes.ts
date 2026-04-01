import { Router } from 'express';
import { resolveConfiguration } from '../controllers/configurator.controller.js';

export const configuratorRoutes = Router();

configuratorRoutes.post('/resolve', resolveConfiguration);
