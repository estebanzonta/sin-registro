export type UserRole = 'customer' | 'admin';
export type CollectionType = 'fixed' | 'capsule';
export type CustomizationMode = 'brand_design' | 'user_upload';
export type UploadCustomizationType = 'photo_simple' | 'photo_collage' | 'pets';
export type TransferSizeCode = 'grande' | 'mediano' | 'chico';
export type PlacementKind = 'print' | 'logo';
export type PlacementSurface = 'front' | 'back' | 'neck' | 'sleeve';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: Omit<User, 'updatedAt'>;
}

export interface JWTPayload {
  id: string;
  email: string;
  role: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  garmentModels?: GarmentModel[];
}

export interface Size {
  id: string;
  name: string;
}

export interface Color {
  id: string;
  name: string;
  hex: string;
  active: boolean;
}

export interface GarmentModel {
  id: string;
  categoryId: string;
  category?: Category;
  name: string;
  slug: string;
  description?: string;
  basePrice: number;
  active: boolean;
  frontMockupUrl?: string;
  backMockupUrl?: string;
  sizes?: GarmentModelSize[];
  colors?: GarmentModelColor[];
  printAreas?: PrintArea[];
}

export interface GarmentModelSize {
  id: string;
  garmentModelId: string;
  garmentModel?: GarmentModel;
  sizeId: string;
  size?: Size;
  active: boolean;
}

export interface GarmentModelColor {
  id: string;
  garmentModelId: string;
  garmentModel?: GarmentModel;
  colorId: string;
  color?: Color;
  frontMockupUrl?: string;
  backMockupUrl?: string;
  active: boolean;
}

export interface BlankStock {
  id: string;
  garmentModelId: string;
  garmentModel?: GarmentModel;
  colorId: string;
  color?: Color;
  sizeId: string;
  size?: Size;
  quantity: number;
}

export interface Placement {
  id: string;
  code: string;
  name: string;
  kind: PlacementKind | string;
  surface: PlacementSurface | string;
  active: boolean;
}

export interface PrintArea {
  id: string;
  garmentModelId: string;
  placementId: string;
  placement?: Placement;
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
  active: boolean;
}

export interface DesignCategory {
  id: string;
  name: string;
  slug: string;
  code: string;
  active: boolean;
}

export interface Collection {
  id: string;
  name: string;
  slug: string;
  type: CollectionType | string;
  description?: string;
  active: boolean;
  startsAt?: Date;
  endsAt?: Date;
  designs?: Design[];
}

export interface Design {
  id: string;
  collectionId?: string | null;
  collection?: Collection;
  designCategoryId?: string | null;
  designCategory?: DesignCategory;
  name: string;
  slug: string;
  code: string;
  description?: string;
  imageUrl: string;
  active: boolean;
  limited: boolean;
  sortOrder: number;
  transferSizes?: DesignTransferSize[];
  placements?: DesignPlacement[];
}

export interface DesignPlacement {
  id: string;
  designId: string;
  placementId: string;
  placement?: Placement;
}

export interface DesignTransferSize {
  id: string;
  designId: string;
  sizeCode: TransferSizeCode | string;
  widthCm: number;
  heightCm: number;
  stock: number;
  extraPrice: number;
  active: boolean;
}

export interface UploadTemplate {
  id: string;
  code: string;
  slug: string;
  name: string;
  customizationType: UploadCustomizationType | string;
  description?: string;
  requiredImageCount: number;
  allowsText: boolean;
  textLabel?: string;
  active: boolean;
  sortOrder: number;
  placementId: string;
  placement?: Placement;
  previewImageUrl?: string;
  sizeOptions?: UploadTemplateSize[];
}

export interface UploadTemplateSize {
  id: string;
  uploadTemplateId: string;
  sizeCode: TransferSizeCode | string;
  widthCm: number;
  heightCm: number;
  extraPrice: number;
  active: boolean;
}

export interface BrandLogo {
  id: string;
  name: string;
  slug: string;
  code: string;
  imageUrl: string;
  widthCm: number;
  heightCm: number;
  active: boolean;
  placements?: BrandLogoPlacement[];
}

export interface BrandLogoPlacement {
  id: string;
  brandLogoId: string;
  placementId: string;
  placement?: Placement;
}

export interface CatalogInitResponse {
  categories: Category[];
  colors: Color[];
  sizes: Size[];
  placements: Placement[];
  designCategories: DesignCategory[];
  collections: Collection[];
  uploadTemplates: UploadTemplate[];
  brandLogos?: BrandLogo[];
}

export interface ConfiguratorRequest {
  customizationMode: CustomizationMode;
  garmentModelId: string;
  sizeId: string;
  colorId: string;
  printPlacementCode: string;
  logoPlacementCode?: string;
  designId?: string;
  uploadTemplateId?: string;
  transferSizeCode: TransferSizeCode;
}

export interface ResolvedTransferSize {
  code: TransferSizeCode;
  widthCm: number;
  heightCm: number;
  extraPrice: number;
  stock: number | null;
}

export interface ConfiguratorResponse {
  valid: boolean;
  basePrice: number;
  extraPrice: number;
  price: number;
  allowedLogoPlacements: Placement[];
  selectedLogoPlacement?: Placement;
  selectedPrintPlacement?: Placement;
  availableTransferSizes: ResolvedTransferSize[];
  selectedTransferSize?: ResolvedTransferSize;
  printArea?: PrintArea;
  stock: {
    blank: number;
    transfer: number | null;
  };
  configurationCode: string;
}

export interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  timestamp: Date;
}
