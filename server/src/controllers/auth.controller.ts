import { Request, Response } from 'express';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { authService } from '../services/auth.service.js';
import { prisma } from '../db.js';
import type { AuthRequest } from '../types/index.js';

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as AuthRequest;

  if (!email || !password) {
    throw new AppError('Email and password are required', 400);
  }

  try {
    const result = await authService.register({ email, password });
    res.status(201).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Registration failed';
    throw new AppError(message, 400);
  }
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as AuthRequest;

  if (!email || !password) {
    throw new AppError('Email and password are required', 400);
  }

  try {
    const result = await authService.login({ email, password });
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Login failed';
    throw new AppError(message, 401);
  }
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  // This route requires auth middleware
  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  res.json({
    id: user.id,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  });
});
