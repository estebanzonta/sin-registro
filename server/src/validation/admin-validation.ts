import { AppError } from '../middleware/errorHandler.js';

function asNonEmptyString(value: unknown, message: string) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new AppError(message, 400);
  }

  return value.trim();
}

function asNumber(value: unknown, message: string) {
  const number = Number(value);
  if (Number.isNaN(number)) {
    throw new AppError(message, 400);
  }
  return number;
}

function parseStringArray(value: unknown) {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
        .map((item) => item.trim())
    : [];
}

export function parseUploadAssetRequest(body: unknown) {
  const payload = (body || {}) as Record<string, unknown>;
  const folder = asNonEmptyString(payload.folder, 'Faltan el archivo o la carpeta de destino.')
    .replace(/[^a-z0-9-_]/gi, '')
    .toLowerCase();

  if (!folder) {
    throw new AppError('La carpeta de destino no es válida.', 400);
  }

  return {
    dataUrl: asNonEmptyString(payload.dataUrl, 'Faltan el archivo o la carpeta de destino.'),
    filename: typeof payload.filename === 'string' ? payload.filename.trim() : '',
    folder,
  };
}

export function parseBrandLogoPayload(body: unknown) {
  const payload = (body || {}) as Record<string, unknown>;
  const name = asNonEmptyString(payload.name, 'Faltan datos obligatorios del logo.');
  const code = asNonEmptyString(payload.code, 'Faltan datos obligatorios del logo.').toUpperCase();
  const imageUrl = asNonEmptyString(payload.imageUrl, 'Faltan datos obligatorios del logo.');
  const widthCm = asNumber(payload.widthCm, 'Las medidas del logo no son válidas.');
  const heightCm = asNumber(payload.heightCm, 'Las medidas del logo no son válidas.');

  if (widthCm <= 0 || heightCm <= 0) {
    throw new AppError('Las medidas del logo deben ser mayores a 0.', 400);
  }

  return {
    name,
    slug: typeof payload.slug === 'string' ? payload.slug.trim() : '',
    code,
    imageUrl,
    widthCm,
    heightCm,
    active: payload.active === undefined ? true : Boolean(payload.active),
    placementCodes: Array.isArray(payload.placementCodes) ? payload.placementCodes : [],
    colorIds: Array.isArray(payload.colorIds) ? payload.colorIds : [],
  };
}

export function parsePrintAreaPayload(body: unknown) {
  const payload = (body || {}) as Record<string, unknown>;
  const xPct = asNumber(payload.xPct, 'La posición del área de impresión no es válida.');
  const yPct = asNumber(payload.yPct, 'La posición del área de impresión no es válida.');
  const widthPct = asNumber(payload.widthPct, 'El tamaño del área de impresión no es válido.');
  const heightPct = asNumber(payload.heightPct, 'El tamaño del área de impresión no es válido.');

  if (widthPct <= 0 || heightPct <= 0) {
    throw new AppError('El tamaño del área de impresión debe ser mayor a 0.', 400);
  }

  return {
    garmentModelId: asNonEmptyString(payload.garmentModelId, 'Faltan datos obligatorios del área de impresión.'),
    placementCode: asNonEmptyString(payload.placementCode, 'Faltan datos obligatorios del área de impresión.'),
    xPct,
    yPct,
    widthPct,
    heightPct,
    active: payload.active === undefined ? true : Boolean(payload.active),
  };
}

export function parseGarmentModelPayload(body: unknown, mode: 'create' | 'update') {
  const payload = (body || {}) as Record<string, unknown>;
  const sizeIds = parseStringArray(payload.sizeIds);
  const colorIds = parseStringArray(payload.colorIds);
  const basePrice = asNumber(payload.basePrice, 'El precio base no es válido.');

  if (mode === 'create') {
    if (!sizeIds.length) {
      throw new AppError('Debés seleccionar al menos un talle.', 400);
    }
    if (!colorIds.length) {
      throw new AppError('Debés seleccionar al menos un color.', 400);
    }
  }

  return {
    categoryId:
      mode === 'create'
        ? asNonEmptyString(payload.categoryId, 'Faltan datos obligatorios del modelo.')
        : typeof payload.categoryId === 'string'
          ? payload.categoryId.trim()
          : undefined,
    name: asNonEmptyString(payload.name, 'Faltan datos obligatorios del modelo.'),
    slug: asNonEmptyString(payload.slug, 'Faltan datos obligatorios del modelo.'),
    description: typeof payload.description === 'string' ? payload.description.trim() : '',
    basePrice,
    frontMockupUrl: typeof payload.frontMockupUrl === 'string' ? payload.frontMockupUrl.trim() : null,
    backMockupUrl: typeof payload.backMockupUrl === 'string' ? payload.backMockupUrl.trim() : null,
    active: payload.active === undefined ? true : Boolean(payload.active),
    sizeIds,
    colorIds,
    colorMockups: Array.isArray(payload.colorMockups) ? payload.colorMockups : [],
  };
}

export function parseUploadTemplatePayload(body: unknown) {
  const payload = (body || {}) as Record<string, unknown>;
  const requiredImageCount = asNumber(payload.requiredImageCount, 'La cantidad requerida de imágenes no es válida.');
  const sortOrder = payload.sortOrder === undefined ? 0 : asNumber(payload.sortOrder, 'El orden del template no es válido.');

  if (!Number.isInteger(requiredImageCount) || requiredImageCount < 0) {
    throw new AppError('La cantidad requerida de imágenes debe ser un entero válido.', 400);
  }

  const sizeOptions = Array.isArray(payload.sizeOptions)
    ? payload.sizeOptions.map((item, index) => {
        const row = (item || {}) as Record<string, unknown>;
        const sizeCode = asNonEmptyString(row.sizeCode, `Falta el código del tamaño en la variante ${index + 1}.`);
        const widthCm = asNumber(row.widthCm, `El ancho de la variante ${index + 1} no es válido.`);
        const heightCm = asNumber(row.heightCm, `El alto de la variante ${index + 1} no es válido.`);
        const extraPrice = row.extraPrice === undefined ? 0 : asNumber(row.extraPrice, `El precio extra de la variante ${index + 1} no es válido.`);

        if (widthCm <= 0 || heightCm <= 0) {
          throw new AppError(`Las medidas de la variante ${index + 1} deben ser mayores a 0.`, 400);
        }

        return {
          sizeCode,
          widthCm,
          heightCm,
          extraPrice,
        };
      })
    : [];

  return {
    code: asNonEmptyString(payload.code, 'Faltan datos obligatorios del template.'),
    slug: typeof payload.slug === 'string' ? payload.slug.trim() : '',
    name: asNonEmptyString(payload.name, 'Faltan datos obligatorios del template.'),
    customizationType: asNonEmptyString(payload.customizationType, 'Faltan datos obligatorios del template.'),
    description: typeof payload.description === 'string' ? payload.description.trim() : '',
    requiredImageCount,
    allowsText: Boolean(payload.allowsText),
    textLabel: typeof payload.textLabel === 'string' ? payload.textLabel.trim() : '',
    placementCode: asNonEmptyString(payload.placementCode, 'Faltan datos obligatorios del template.'),
    previewImageUrl: typeof payload.previewImageUrl === 'string' ? payload.previewImageUrl.trim() : '',
    sortOrder,
    sizeOptions,
  };
}

export function parseDesignPayload(body: unknown) {
  const payload = (body || {}) as Record<string, unknown>;
  const transferSizes = Array.isArray(payload.transferSizes)
    ? payload.transferSizes
        .filter((item) => item && typeof item === 'object')
        .map((item, index) => {
          const row = item as Record<string, unknown>;
          const sizeCode = asNonEmptyString(row.sizeCode, `Falta el código de tamaño en la variante ${index + 1}.`).toLowerCase();
          const widthCm = asNumber(row.widthCm, `El ancho de la variante ${index + 1} no es válido.`);
          const heightCm = asNumber(row.heightCm, `El alto de la variante ${index + 1} no es válido.`);
          const stock = row.stock === undefined ? 0 : asNumber(row.stock, `El stock de la variante ${index + 1} no es válido.`);
          const extraPrice = row.extraPrice === undefined ? 0 : asNumber(row.extraPrice, `El precio extra de la variante ${index + 1} no es válido.`);

          if (widthCm <= 0 || heightCm <= 0) {
            throw new AppError(`Las medidas de la variante ${index + 1} deben ser mayores a 0.`, 400);
          }

          if (!Number.isInteger(stock) || stock < 0) {
            throw new AppError(`El stock de la variante ${index + 1} debe ser un entero mayor o igual a 0.`, 400);
          }

          return {
            sizeCode,
            widthCm,
            heightCm,
            stock,
            extraPrice,
          };
        })
    : [];

  return {
    collectionId: typeof payload.collectionId === 'string' && payload.collectionId.trim() ? payload.collectionId.trim() : null,
    designCategoryId: typeof payload.designCategoryId === 'string' && payload.designCategoryId.trim() ? payload.designCategoryId.trim() : null,
    name: asNonEmptyString(payload.name, 'Faltan datos obligatorios del diseño.'),
    slug: asNonEmptyString(payload.slug, 'Faltan datos obligatorios del diseño.'),
    code: asNonEmptyString(payload.code, 'Faltan datos obligatorios del diseño.').toUpperCase(),
    description: typeof payload.description === 'string' && payload.description.trim() ? payload.description.trim() : null,
    imageUrl: asNonEmptyString(payload.imageUrl, 'Faltan datos obligatorios del diseño.'),
    active: payload.active === undefined ? undefined : Boolean(payload.active),
    placementCodes: Array.isArray(payload.placementCodes)
      ? Array.from(
          new Set(
            payload.placementCodes
              .filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
              .map((item) => item.trim())
          )
        )
      : [],
    transferSizes,
  };
}

export function parseUserRolePayload(body: unknown, currentUserId?: string, targetUserId?: string) {
  const payload = (body || {}) as Record<string, unknown>;
  const role = asNonEmptyString(payload.role, 'Falta el rol del usuario.');

  if (role !== 'admin' && role !== 'customer') {
    throw new AppError('El rol debe ser admin o customer.', 400);
  }

  if (currentUserId && targetUserId && currentUserId === targetUserId && role !== 'admin') {
    throw new AppError('No podés quitarte tu propio rol de admin.', 400);
  }

  return { role };
}

export function parseBlankStockPayload(body: unknown) {
  const payload = (body || {}) as Record<string, unknown>;
  const quantity = asNumber(payload.quantity, 'La cantidad de stock no es válida.');

  if (!Number.isInteger(quantity) || quantity < 0) {
    throw new AppError('La cantidad de stock debe ser un entero mayor o igual a 0.', 400);
  }

  return { quantity };
}

export function parseNamedEntityPayload(body: unknown, codeRequired = false, hexRequired = false) {
  const payload = (body || {}) as Record<string, unknown>;
  const name = asNonEmptyString(payload.name, 'Falta el nombre.');
  const result: { name: string; slug?: string; code?: string; hex?: string } = {
    name,
  };

  if (typeof payload.slug === 'string' && payload.slug.trim()) {
    result.slug = payload.slug.trim();
  }

  if (codeRequired) {
    result.code = asNonEmptyString(payload.code, 'Faltan el nombre y el código.').toUpperCase();
  }

  if (hexRequired) {
    const hex = asNonEmptyString(payload.hex, 'Faltan el nombre y el color hexadecimal.');
    if (!/^#?[0-9a-fA-F]{6}$/.test(hex)) {
      throw new AppError('El color hexadecimal no es válido.', 400);
    }
    result.hex = hex.startsWith('#') ? hex : `#${hex}`;
  }

  return result;
}

export function parseCollectionPayload(body: unknown) {
  const payload = (body || {}) as Record<string, unknown>;
  const name = asNonEmptyString(payload.name, 'Faltan datos obligatorios de la colección.');
  const type = asNonEmptyString(payload.type, 'Faltan datos obligatorios de la colección.');

  if (type !== 'capsule') {
    throw new AppError('Solo se admiten colecciones de tipo cápsula.', 400);
  }

  const startsAt = typeof payload.startsAt === 'string' && payload.startsAt.trim() ? new Date(payload.startsAt) : undefined;
  const endsAt = typeof payload.endsAt === 'string' && payload.endsAt.trim() ? new Date(payload.endsAt) : undefined;

  if ((startsAt && Number.isNaN(startsAt.getTime())) || (endsAt && Number.isNaN(endsAt.getTime()))) {
    throw new AppError('Las fechas de la colección no son válidas.', 400);
  }

  return {
    name,
    slug: typeof payload.slug === 'string' ? payload.slug.trim() : '',
    type,
    description: typeof payload.description === 'string' ? payload.description.trim() : '',
    startsAt,
    endsAt,
  };
}
