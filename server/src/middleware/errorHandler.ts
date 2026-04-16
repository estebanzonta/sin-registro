import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ErrorResponse } from '../types/index.js';

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
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = err instanceof AppError ? err.statusCode : 500;
  let message = err.message || 'Ocurrió un error inesperado.';

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      statusCode = 409;
      message = 'Ya existe un registro con esos datos.';
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
