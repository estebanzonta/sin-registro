import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { configuratorService } from '../services/configurator.service.js';
import type { ConfiguratorRequest } from '../types/index.js';

export const resolveConfiguration = asyncHandler(
  async (req: Request, res: Response) => {
    const config: ConfiguratorRequest = req.body;
    const result = await configuratorService.resolveConfiguration(config);
    res.json(result);
  }
);
