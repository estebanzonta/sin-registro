import { Request, Response } from 'express';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { loginHandler, meHandler, registerHandler } from '../handlers/auth.handlers.js';

export const register = asyncHandler(async (req: Request, res: Response) => {
  try {
    const result = await registerHandler(req.body);
    res.status(201).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'No se pudo crear la cuenta.';
    throw new AppError(message, 400);
  }
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  try {
    const result = await loginHandler(req.body);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'No se pudo iniciar sesión.';
    throw new AppError(message, 401);
  }
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await meHandler(req.user?.id);
  res.json(user);
});
