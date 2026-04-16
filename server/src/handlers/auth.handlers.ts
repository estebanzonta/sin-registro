import { prisma } from '../db.js';
import { AppError } from '../middleware/errorHandler.js';
import { authService } from '../services/auth.service.js';
import { parseAuthRequest } from '../validation/request-validation.js';

export async function registerHandler(body: unknown) {
  const { email, password } = parseAuthRequest(body);
  return authService.register({ email, password });
}

export async function loginHandler(body: unknown) {
  const { email, password } = parseAuthRequest(body);
  return authService.login({ email, password });
}

export async function meHandler(userId: string | undefined) {
  if (!userId) {
    throw new AppError('Necesitás iniciar sesión para continuar.', 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError('No encontramos tu usuario.', 404);
  }

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };
}
