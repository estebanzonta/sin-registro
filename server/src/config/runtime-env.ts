export function isProductionRuntime() {
  const nodeEnv = process.env.NODE_ENV?.trim().toLowerCase();
  const vercelEnv = process.env.VERCEL_ENV?.trim().toLowerCase();

  return nodeEnv === 'production' || vercelEnv === 'production';
}

export function readCommaSeparatedEnv(name: string) {
  return (process.env[name] || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function normalizeOrigin(value: string | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function resolveCorsOrigins() {
  const configuredOrigins = readCommaSeparatedEnv('CORS_ORIGIN');
  if (configuredOrigins.length > 0) {
    return configuredOrigins;
  }

  const fallbackOrigins = [
    normalizeOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL),
    normalizeOrigin(process.env.VERCEL_URL),
    normalizeOrigin(process.env.URL),
  ].filter((value): value is string => Boolean(value));

  if (fallbackOrigins.length > 0) {
    return Array.from(new Set(fallbackOrigins));
  }

  return [];
}
