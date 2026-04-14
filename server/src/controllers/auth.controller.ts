import { Request, Response } from 'express';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { authService } from '../services/auth.service.js';
import { prisma } from '../db.js';
import type { AuthRequest } from '../types/index.js';

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as AuthRequest;

  if (!email || !password) {
    throw new AppError('Completá email y contraseña.', 400);
  }

  try {
    const result = await authService.register({ email, password });
    res.status(201).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'No se pudo crear la cuenta.';
    throw new AppError(message, 400);
  }
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as AuthRequest;

  if (!email || !password) {
    throw new AppError('Completá email y contraseña.', 400);
  }

  try {
    const result = await authService.login({ email, password });
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'No se pudo iniciar sesión.';
    throw new AppError(message, 401);
  }
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  // This route requires auth middleware
  if (!req.user) {
    throw new AppError('Necesitás iniciar sesión para continuar.', 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
  });

  if (!user) {
    throw new AppError('No encontramos tu usuario.', 404);
  }

  res.json({
    id: user.id,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  });
});
