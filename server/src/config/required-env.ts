import { AppError } from '../middleware/errorHandler.js';

export function readRequiredEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new AppError(`Falta la variable de entorno ${name}.`, 500);
  }

  return value;
}
