import axios from 'axios';

const CATALOG_CACHE_KEY = 'sr-catalog-init-cache';
const CATALOG_CACHE_TTL_MS = 5 * 60 * 1000;

let inFlightCatalogRequest: Promise<unknown> | null = null;

type CatalogCacheEntry<T> = {
  expiresAt: number;
  value: T;
};

function readCachedCatalog<T>() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(CATALOG_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CatalogCacheEntry<T>;
    if (!parsed?.expiresAt || parsed.expiresAt <= Date.now()) {
      window.sessionStorage.removeItem(CATALOG_CACHE_KEY);
      return null;
    }

    return parsed.value;
  } catch {
    window.sessionStorage.removeItem(CATALOG_CACHE_KEY);
    return null;
  }
}

function writeCachedCatalog<T>(value: T) {
  if (typeof window === 'undefined') {
    return;
  }

  const entry: CatalogCacheEntry<T> = {
    value,
    expiresAt: Date.now() + CATALOG_CACHE_TTL_MS,
  };

  window.sessionStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(entry));
}

export function invalidateCatalogCache() {
  inFlightCatalogRequest = null;
  if (typeof window !== 'undefined') {
    window.sessionStorage.removeItem(CATALOG_CACHE_KEY);
  }
}

export async function getCatalogInit<T>(options?: { force?: boolean }): Promise<T> {
  if (!options?.force) {
    const cached = readCachedCatalog<T>();
    if (cached) {
      return cached;
    }
  }

  if (!options?.force && inFlightCatalogRequest) {
    return inFlightCatalogRequest as Promise<T>;
  }

  const request = axios.get<T>('/api/catalog/init').then((response) => {
    writeCachedCatalog(response.data);
    return response.data;
  });

  if (!options?.force) {
    inFlightCatalogRequest = request;
  }

  try {
    return await request;
  } finally {
    if (!options?.force) {
      inFlightCatalogRequest = null;
    }
  }
}
