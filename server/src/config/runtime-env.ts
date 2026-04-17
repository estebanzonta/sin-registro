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
