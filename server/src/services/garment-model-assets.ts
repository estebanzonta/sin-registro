import { normalizeAssetUrl } from './storage.service.js';

export function normalizeGarmentModelAssets<T extends {
  frontMockupUrl?: string | null;
  backMockupUrl?: string | null;
  colors?: Array<{ frontMockupUrl?: string | null; backMockupUrl?: string | null }>;
}>(model: T) {
  return {
    ...model,
    frontMockupUrl: normalizeAssetUrl(model.frontMockupUrl),
    backMockupUrl: normalizeAssetUrl(model.backMockupUrl),
    colors: model.colors?.map((item) => ({
      ...item,
      frontMockupUrl: normalizeAssetUrl(item.frontMockupUrl),
      backMockupUrl: normalizeAssetUrl(item.backMockupUrl),
    })),
  };
}
