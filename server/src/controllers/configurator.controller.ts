import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { resolveConfigurationHandler } from '../handlers/configurator.handlers.js';

export const resolveConfiguration = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await resolveConfigurationHandler(req.body);
    res.json(result);
  }
);
