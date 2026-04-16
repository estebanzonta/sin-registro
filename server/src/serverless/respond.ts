import { AppError } from '../middleware/errorHandler.js';

export function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
}

export function errorResponse(error: unknown) {
  if (error instanceof AppError) {
    return jsonResponse(
      {
        error: error.name,
        message: error.message,
        statusCode: error.statusCode,
        timestamp: new Date(),
      },
      { status: error.statusCode }
    );
  }

  const message = error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
  return jsonResponse(
    {
      error: 'Error',
      message,
      statusCode: 500,
      timestamp: new Date(),
    },
    { status: 500 }
  );
}
