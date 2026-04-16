import type { CustomizationMode, TransferSizeCode } from './index.js';

export interface UploadedAssetInput {
  id: string;
  name: string;
  width: number;
  height: number;
  previewUrl: string;
}

export interface UploadedCustomizationPayload {
  assets: UploadedAssetInput[];
  text?: string;
}

export interface LayoutSnapshotInput {
  xPct: number;
  yPct: number;
  scale: number;
}

export interface OrderItemData {
  customizationMode: CustomizationMode;
  garmentModelId: string;
  colorId: string;
  sizeId: string;
  printPlacementCode: string;
  logoPlacementCode: string;
  transferSizeCode: TransferSizeCode;
  designId?: string;
  uploadTemplateId?: string;
  customDesignUrl?: string;
  customAssetUrls?: UploadedAssetInput[] | UploadedCustomizationPayload;
  customText?: string;
  unitPrice?: number;
  quantity?: number;
  configurationCode?: string;
  layoutSnapshot?: LayoutSnapshotInput;
  configurationSnapshotJson?: string;
}

export interface CreateOrderRequest {
  customerName: string;
  customerEmail: string;
  items?: OrderItemData[];
}

export interface UpdateOrderStatusRequest {
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
}

export interface OrderItemResponse {
  id: string;
  orderId: string;
  customizationMode: CustomizationMode;
  configurationCode: string;
  garmentModelId: string;
  colorId: string;
  sizeId: string;
  designId?: string;
  uploadTemplateId?: string;
  customDesignUrl?: string;
  customAssetUrlsJson?: string;
  transferSizeCode?: string;
  printPlacementCode?: string;
  logoPlacementCode?: string;
  unitPrice: number;
  layoutSnapshotJson?: string;
  configurationSnapshotJson?: string;
}

export interface OrderResponse {
  id: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  totalPrice: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  items: OrderItemResponse[];
}

export interface OrderListResponse {
  orders: OrderResponse[];
  total: number;
  page: number;
  limit: number;
}
