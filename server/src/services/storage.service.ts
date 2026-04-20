import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { isProductionRuntime } from '../config/runtime-env.js';
import { AppError } from '../middleware/errorHandler.js';

const serviceDir = path.dirname(fileURLToPath(import.meta.url));
const localUploadsRoot = path.resolve(serviceDir, '../../../client/public/uploads');

type UploadResult = {
  url: string;
  filename: string;
};

type AssetReadResult = {
  buffer: Buffer;
  contentType: string;
};

function toAppAssetUrl(folder: string, filename: string) {
  return `/api/assets/${folder}/${filename}`;
}

function toSupabasePublicUrl(folder: string, filename: string) {
  const supabaseUrl = normalizeSupabaseUrl(process.env.SUPABASE_URL);
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || '';

  if (!supabaseUrl || !bucket) {
    return toAppAssetUrl(folder, filename);
  }

  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${folder}/${filename}`;
}

function normalizeSupabaseUrl(value?: string | null) {
  return value ? value.replace(/\/+$/, '') : '';
}

async function uploadToLocal(folder: string, filename: string, buffer: Buffer): Promise<UploadResult> {
  const targetDir = path.join(localUploadsRoot, folder);
  const targetPath = path.join(targetDir, filename);

  await fs.mkdir(targetDir, { recursive: true });
  await fs.writeFile(targetPath, buffer);

  return {
    url: toAppAssetUrl(folder, filename),
    filename,
  };
}

async function uploadToSupabase(folder: string, filename: string, buffer: Buffer, contentType: string): Promise<UploadResult> {
  const supabaseUrl = normalizeSupabaseUrl(process.env.SUPABASE_URL);
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || '';

  if (!supabaseUrl || !serviceRoleKey || !bucket) {
    throw new AppError('Faltan variables de entorno para Supabase Storage.', 500);
  }

  const objectPath = `${folder}/${filename}`;
  const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${objectPath}`;
  const body = new Uint8Array(buffer);
  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
      'Content-Type': contentType,
      'x-upsert': 'true',
    },
    body,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new AppError(`No se pudo subir el archivo al storage externo. ${body}`.trim(), 502);
  }

  return {
    url: toAppAssetUrl(folder, filename),
    filename,
  };
}

function inferContentType(filename: string) {
  const extension = path.extname(filename).toLowerCase();
  if (extension === '.png') return 'image/png';
  if (extension === '.jpg' || extension === '.jpeg') return 'image/jpeg';
  if (extension === '.webp') return 'image/webp';
  return 'application/octet-stream';
}

async function readFromLocal(folder: string, filename: string): Promise<AssetReadResult> {
  const targetPath = path.join(localUploadsRoot, folder, filename);
  const buffer = await fs.readFile(targetPath);

  return {
    buffer,
    contentType: inferContentType(filename),
  };
}

async function readFromSupabase(folder: string, filename: string): Promise<AssetReadResult> {
  const supabaseUrl = normalizeSupabaseUrl(process.env.SUPABASE_URL);
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || '';

  if (!supabaseUrl || !serviceRoleKey || !bucket) {
    throw new AppError('Faltan variables de entorno para Supabase Storage.', 500);
  }

  const objectPath = `${folder}/${filename}`;
  const assetUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${objectPath}`;
  const response = await fetch(assetUrl, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
    },
  });

  if (response.status === 404) {
    throw new AppError('No encontramos el archivo solicitado.', 404);
  }

  if (!response.ok) {
    const body = await response.text();
    throw new AppError(`No se pudo leer el archivo desde storage. ${body}`.trim(), 502);
  }

  const arrayBuffer = await response.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    contentType: response.headers.get('content-type') || inferContentType(filename),
  };
}

export class StorageService {
  static async uploadAsset(folder: string, filename: string, buffer: Buffer, contentType: string): Promise<UploadResult> {
    const driver = (process.env.STORAGE_DRIVER || 'local').toLowerCase();

    if (driver === 'supabase') {
      return uploadToSupabase(folder, filename, buffer, contentType);
    }

    if (driver !== 'local') {
      throw new AppError(`STORAGE_DRIVER no soportado: ${driver}.`, 500);
    }

    if (isProductionRuntime()) {
      throw new AppError('STORAGE_DRIVER=local no esta permitido en produccion. Configura STORAGE_DRIVER=supabase.', 500);
    }

    return uploadToLocal(folder, filename, buffer);
  }

  static async readAsset(folder: string, filename: string): Promise<AssetReadResult> {
    const driver = (process.env.STORAGE_DRIVER || 'local').toLowerCase();

    if (driver === 'supabase') {
      return readFromSupabase(folder, filename);
    }

    if (driver !== 'local') {
      throw new AppError(`STORAGE_DRIVER no soportado: ${driver}.`, 500);
    }

    return readFromLocal(folder, filename);
  }
}

export function normalizeAssetUrl(value?: string | null) {
  if (!value) return value ?? null;

  const localMatch = value.match(/^\/uploads\/([^/]+)\/([^/]+)$/i);
  if (localMatch) {
    return process.env.STORAGE_DRIVER?.toLowerCase() === 'supabase'
      ? toSupabasePublicUrl(localMatch[1], localMatch[2])
      : toAppAssetUrl(localMatch[1], localMatch[2]);
  }

  const proxiedAssetMatch = value.match(/^\/api\/assets\/([^/]+)\/([^/]+)$/i);
  if (proxiedAssetMatch) {
    return process.env.STORAGE_DRIVER?.toLowerCase() === 'supabase'
      ? toSupabasePublicUrl(proxiedAssetMatch[1], proxiedAssetMatch[2])
      : value;
  }

  const supabaseMatch = value.match(/\/storage\/v1\/object\/public\/[^/]+\/([^/]+)\/([^/?#]+)(?:[?#].*)?$/i);
  if (supabaseMatch) {
    return toSupabasePublicUrl(supabaseMatch[1], supabaseMatch[2]);
  }

  return value;
}
