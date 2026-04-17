import type { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import type { ErrorResponse } from '../types/index.js';

export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
  }
}

export const errorHandler = (
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  let statusCode = err instanceof AppError ? err.statusCode : 500;
  let message = err.message || 'Ocurrió un error inesperado.';

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      statusCode = 409;
      const modelName = typeof err.meta?.modelName === 'string' ? err.meta.modelName : '';
      const target = Array.isArray(err.meta?.target) ? err.meta.target.map(String) : [];

      if (modelName === 'Size' && target.includes('name')) {
        message = 'Ya existe un talle con ese nombre.';
      } else if (modelName === 'Color' && target.includes('name')) {
        message = 'Ya existe un color con ese nombre.';
      } else if (modelName === 'Category' && (target.includes('name') || target.includes('slug'))) {
        message = 'Ya existe una categoria con esos datos.';
      } else if (modelName === 'GarmentModel' && (target.includes('name') || target.includes('slug'))) {
        message = 'Ya existe una indumentaria con ese nombre o slug.';
      } else if (modelName === 'Collection' && (target.includes('name') || target.includes('slug'))) {
        message = 'Ya existe una coleccion con esos datos.';
      } else if (modelName === 'DesignCategory' && (target.includes('name') || target.includes('slug') || target.includes('code'))) {
        message = 'Ya existe una categoria de diseno con esos datos.';
      } else if (modelName === 'Design' && (target.includes('name') || target.includes('slug') || target.includes('code'))) {
        message = 'Ya existe un diseno con esos datos.';
      } else if (modelName === 'BrandLogo' && (target.includes('name') || target.includes('slug') || target.includes('code'))) {
        message = 'Ya existe un logo con esos datos.';
      } else {
        message = 'Ya existe un registro con esos datos.';
      }
    } else if (err.code === 'P2025') {
      statusCode = 404;
      message = 'No encontramos el registro solicitado.';
    }
  }

  const errorResponse: ErrorResponse = {
    error: err.name,
    message,
    statusCode,
    timestamp: new Date(),
  };

  console.error(`[${statusCode}] ${message}`, err);

  res.status(statusCode).json(errorResponse);
};

export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
