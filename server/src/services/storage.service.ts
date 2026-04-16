import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { AppError } from '../middleware/errorHandler.js';

const serviceDir = path.dirname(fileURLToPath(import.meta.url));
const localUploadsRoot = path.resolve(serviceDir, '../../../client/public/uploads');

type UploadResult = {
  url: string;
  filename: string;
};

function normalizeSupabaseUrl(value?: string | null) {
  return value ? value.replace(/\/+$/, '') : '';
}

async function uploadToLocal(folder: string, filename: string, buffer: Buffer): Promise<UploadResult> {
  const targetDir = path.join(localUploadsRoot, folder);
  const targetPath = path.join(targetDir, filename);

  await fs.mkdir(targetDir, { recursive: true });
  await fs.writeFile(targetPath, buffer);

  return {
    url: `/uploads/${folder}/${filename}`,
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
  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
      'Content-Type': contentType,
      'x-upsert': 'true',
    },
    body: buffer,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new AppError(`No se pudo subir el archivo al storage externo. ${body}`.trim(), 502);
  }

  return {
    url: `${supabaseUrl}/storage/v1/object/public/${bucket}/${objectPath}`,
    filename,
  };
}

export class StorageService {
  static async uploadAsset(folder: string, filename: string, buffer: Buffer, contentType: string): Promise<UploadResult> {
    const driver = (process.env.STORAGE_DRIVER || 'local').toLowerCase();

    if (driver === 'supabase') {
      return uploadToSupabase(folder, filename, buffer, contentType);
    }

    return uploadToLocal(folder, filename, buffer);
  }
}
