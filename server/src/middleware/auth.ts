import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { readRequiredEnv } from '../config/required-env.js';
import type { JWTPayload } from '../types/index.js';
import { AppError } from './errorHandler.js';

const JWT_SECRET = readRequiredEnv('JWT_SECRET');

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export const verifyAuth = (req: Request, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError('Necesitás iniciar sesión para continuar.', 401));
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;

    req.user = decoded;
    next();
  } catch (err) {
    if (err instanceof jwt.JsonWebTokenError) {
      return next(new AppError('Tu sesión no es válida. Ingresá nuevamente.', 401));
    }
    if (err instanceof jwt.TokenExpiredError) {
      return next(new AppError('Tu sesión venció. Ingresá nuevamente.', 401));
    }
    return next(err);
  }
};

export const verifyAdmin = (req: Request, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError('Necesitás iniciar sesión para continuar.', 401));
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;

    if (decoded.role !== 'admin') {
      return next(new AppError('No tenés permisos para acceder a esta sección.', 403));
    }

    req.user = decoded;
    next();
  } catch (err) {
    if (err instanceof jwt.JsonWebTokenError) {
      return next(new AppError('Tu sesión no es válida. Ingresá nuevamente.', 401));
    }
    if (err instanceof jwt.TokenExpiredError) {
      return next(new AppError('Tu sesión venció. Ingresá nuevamente.', 401));
    }
    return next(err);
  }
};
