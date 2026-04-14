import axios from 'axios';

const MESSAGE_MAP: Array<[RegExp, string]> = [
  [/invalid token/i, 'Tu sesión venció. Ingresá nuevamente para continuar.'],
  [/token expired/i, 'Tu sesión venció. Ingresá nuevamente para continuar.'],
  [/invalid or expired token/i, 'Tu sesión venció. Ingresá nuevamente para continuar.'],
  [/missing or invalid authorization header/i, 'Necesitás iniciar sesión para continuar.'],
  [/unauthorized/i, 'Necesitás iniciar sesión para continuar.'],
  [/not authenticated/i, 'Necesitás iniciar sesión para continuar.'],
  [/email and password are required/i, 'Completá email y contraseña.'],
  [/invalid email format/i, 'Ingresá un email válido.'],
  [/password must be at least 6 characters/i, 'La contraseña debe tener al menos 6 caracteres.'],
  [/user with this email already exists/i, 'Ya existe una cuenta con ese email.'],
  [/invalid email or password/i, 'Email o contraseña incorrectos.'],
  [/admin access required/i, 'No tenés permisos para acceder a esa sección.'],
  [/blank stock not found/i, 'No hay stock disponible para esa combinación de prenda, color y talle.'],
  [/no hay stock disponible para esta configuración/i, 'No hay stock disponible para esta configuración.'],
  [/design is not available for the selected print placement/i, 'Ese diseño no está disponible en la cara seleccionada.'],
  [/upload template is not valid for the selected print placement/i, 'La plantilla elegida no está disponible en la cara seleccionada.'],
  [/transfer size is not available/i, 'El tamaño de estampa elegido no está disponible para esta configuración.'],
  [/print area not configured/i, 'Esta prenda todavía no está lista para esa ubicación de estampa.'],
  [/logo placement is not valid/i, 'La ubicación del logo no es compatible con la cara elegida.'],
  [/missing required fields/i, 'Faltan completar datos obligatorios.'],
  [/order must contain at least one item/i, 'El pedido debe incluir al menos un producto.'],
  [/order item is not producible/i, 'Uno de los productos del carrito ya no se puede producir con la configuración actual.'],
];

export function isAuthError(error: unknown) {
  if (!axios.isAxiosError(error)) return false;
  const status = error.response?.status;
  const message = String(error.response?.data?.message || error.response?.data?.error || '');
  return status === 401 || /invalid token|token expired|unauthorized|not authenticated/i.test(message);
}

export function readFriendlyApiError(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const rawMessage = error.response?.data?.message || error.response?.data?.error;
    if (typeof rawMessage === 'string' && rawMessage.trim()) {
      const mapped = MESSAGE_MAP.find(([pattern]) => pattern.test(rawMessage));
      return mapped?.[1] || rawMessage;
    }
  }

  if (error instanceof Error && error.message.trim()) {
    const mapped = MESSAGE_MAP.find(([pattern]) => pattern.test(error.message));
    return mapped?.[1] || error.message;
  }

  return fallback;
}
