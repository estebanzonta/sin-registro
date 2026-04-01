import type { CustomizationMode, TransferSizeCode } from './index.js';

export interface CartItem {
  id: string;
  customizationMode: CustomizationMode;
  garmentModelId: string;
  colorId: string;
  sizeId: string;
  printPlacementCode: string;
  logoPlacementCode: string;
  designId?: string;
  uploadTemplateId?: string;
  customDesignUrl?: string;
  customAssetUrlsJson?: string;
  transferSizeCode: TransferSizeCode;
  configurationCode: string;
  unitPrice: number;
  quantity: number;
  layoutSnapshotJson?: string;
  configurationSnapshotJson?: string;
}

export interface Cart {
  items: CartItem[];
  totalPrice: number;
  totalItems: number;
}

export interface AddToCartRequest {
  customizationMode: CustomizationMode;
  garmentModelId: string;
  colorId: string;
  sizeId: string;
  printPlacementCode: string;
  logoPlacementCode: string;
  designId?: string;
  uploadTemplateId?: string;
  customDesignUrl?: string;
  customAssetUrlsJson?: string;
  transferSizeCode: TransferSizeCode;
  configurationCode?: string;
  unitPrice?: number;
  quantity?: number;
  layoutSnapshotJson?: string;
  configurationSnapshotJson?: string;
}

export interface UpdateCartItemRequest {
  quantity?: number;
  logoPlacementCode?: string;
}

export interface CartResponse extends Cart {}
