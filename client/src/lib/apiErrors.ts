import axios from 'axios';

const MESSAGE_MAP: Array<[RegExp, string]> = [
  [/invalid token/i, 'Tu sesion vencio. Ingresa nuevamente para continuar.'],
  [/token expired/i, 'Tu sesion vencio. Ingresa nuevamente para continuar.'],
  [/invalid or expired token/i, 'Tu sesion vencio. Ingresa nuevamente para continuar.'],
  [/missing or invalid authorization header/i, 'Necesitas iniciar sesion para continuar.'],
  [/unauthorized/i, 'Necesitas iniciar sesion para continuar.'],
  [/not authenticated/i, 'Necesitas iniciar sesion para continuar.'],
  [/email and password are required/i, 'Completa email y contrasena.'],
  [/invalid email format/i, 'Ingresa un email valido.'],
  [/password must be at least 6 characters/i, 'La contrasena debe tener al menos 6 caracteres.'],
  [/user with this email already exists/i, 'Ya existe una cuenta con ese email.'],
  [/invalid email or password/i, 'Email o contrasena incorrectos.'],
  [/admin access required/i, 'No tenes permisos para acceder a esa seccion.'],
  [/blank stock not found/i, 'No hay stock disponible para esa combinacion de prenda, color y talle.'],
  [/no hay stock disponible para esta configuracion/i, 'No hay stock disponible para esta configuracion.'],
  [/design is not available for the selected print placement/i, 'Ese diseno no esta disponible en la cara seleccionada.'],
  [/upload template is not valid for the selected print placement/i, 'La plantilla elegida no esta disponible en la cara seleccionada.'],
  [/transfer size is not available/i, 'El tamano de estampa elegido no esta disponible para esta configuracion.'],
  [/print area not configured/i, 'Esta prenda todavia no esta lista para esa ubicacion de estampa.'],
  [/logo placement is not valid/i, 'La ubicacion del logo no es compatible con la cara elegida.'],
  [/missing required fields/i, 'Faltan completar datos obligatorios.'],
  [/order must contain at least one item/i, 'El pedido debe incluir al menos un producto.'],
  [/order item is not producible/i, 'Uno de los productos del carrito ya no se puede producir con la configuracion actual.'],
  [/payload too large/i, 'El archivo es demasiado grande. Proba con una imagen mas liviana.'],
  [/request entity too large/i, 'El archivo es demasiado grande. Proba con una imagen mas liviana.'],
  [/entity too large/i, 'El archivo es demasiado grande. Proba con una imagen mas liviana.'],
  [/file too large/i, 'El archivo es demasiado grande. Proba con una imagen mas liviana.'],
  [/ya existe un talle con ese nombre/i, 'Ese talle ya existe.'],
  [/ya existe un color con ese nombre/i, 'Ese color ya existe.'],
  [/ya existe una categor[ií]a con esos datos/i, 'Esa categoria ya existe.'],
  [/ya existe una indumentaria con ese nombre o slug/i, 'Ya existe una indumentaria con ese nombre o slug.'],
  [/ya existe una colecci[oó]n con esos datos/i, 'Esa coleccion ya existe.'],
  [/ya existe una categor[ií]a de dise[ñn]o con esos datos/i, 'Esa categoria de diseno ya existe.'],
  [/ya existe un dise[ñn]o con esos datos/i, 'Ese diseno ya existe.'],
  [/ya existe un logo con esos datos/i, 'Ese logo ya existe.'],
  [/ya existe un registro con esos datos/i, 'Ese valor ya existe. Revisa el nombre o codigo e intenta nuevamente.'],
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
