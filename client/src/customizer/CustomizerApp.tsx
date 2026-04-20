import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { ChevronLeft, ChevronRight, ShoppingCart, UploadCloud } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import logoAssetUrl from '../assets/Logo.svg';
import type { AppSession } from '../App';
import StorefrontTopBar from '../storefront/StorefrontTopBar';
import { isAuthError, readFriendlyApiError } from '../lib/apiErrors';
import { getCatalogInit } from '../lib/catalogCache';

type Screen = 'product' | 'mode' | 'selection' | 'customizer';
type CustomMode = 'brand_design' | 'user_upload';
type UploadMode = 'photo_simple' | 'photo_collage' | 'pets';
type ProductSizeOption = { sizeId: string; size: { id: string; name: string } };
type ProductColorOption = { colorId: string; color: { id: string; name: string; hex: string }; frontMockupUrl?: string; backMockupUrl?: string };
type Product = { id: string; name: string; slug: string; description?: string; basePrice: number; frontMockupUrl?: string; backMockupUrl?: string; sizes?: ProductSizeOption[]; colors?: ProductColorOption[]; printAreas?: Array<{ placement: { code: string } }> };
type SizePriceOption = { id: string; sizeCode: string; widthCm: number; heightCm: number; extraPrice: number };
type Design = { id: string; name: string; code: string; imageUrl: string; designCategoryId?: string; transferSizes?: SizePriceOption[]; placements?: Array<{ placement: { code: string } }> };
type UploadTemplate = { id: string; code: string; name: string; customizationType?: UploadMode; requiredImageCount: number; allowsText?: boolean; textLabel?: string; placement?: { code: string }; sizeOptions?: SizePriceOption[] };
type BrandLogo = { id: string; name: string; code: string; imageUrl: string; widthCm: number; heightCm: number; placements?: Array<{ placement: { code: string } }>; colors?: Array<{ colorId: string; color?: { id: string; name: string; hex: string } }> };
type Catalog = { categories: Array<{ id: string; name: string; garmentModels?: Product[] }>; designCategories?: Array<{ id: string; name: string; code: string }>; collections: Array<{ id: string; name: string; designs?: Design[] }>; uploadTemplates: UploadTemplate[]; brandLogos?: BrandLogo[] };
type Config = { valid: boolean; price: number; basePrice: number; extraPrice: number; configurationCode: string; allowedLogoPlacements: Array<{ code: string; name: string }> };
type CartResponse = { totalItems: number };
type UploadedAsset = { id: string; name: string; width: number; height: number; previewUrl: string };

const PHOTO_RULES = { minWidth: 1000, minHeight: 1000, allowed: ['image/png', 'image/jpeg', 'image/webp'] };
const FALLBACK_LOGO_OPTIONS = {
  front: [
    { code: 'LC', name: 'Cuello espalda' },
    { code: 'IBR', name: 'Manga' },
  ],
  back: [
    { code: 'LF', name: 'Frente medio' },
    { code: 'IBR', name: 'Manga' },
  ],
} as const;

function resolveMockupImage(product: Product | null, colorName: string, view: 'front' | 'back', colorOption?: ProductColorOption | null) {
  if (!product) return '/tshirt-white-front.png';
  const colorMockup = view === 'front' ? colorOption?.frontMockupUrl : colorOption?.backMockupUrl;
  if (colorMockup) return colorMockup;
  const explicitMockup = view === 'front' ? product.frontMockupUrl : product.backMockupUrl;
  if (explicitMockup) return explicitMockup;
  const normalizedColor = colorName.includes('black') ? 'black' : 'white';
  if (product.slug === 'remera-oversize' || product.slug === 'oversize') return `/tshirt-${normalizedColor}-${view}.png`;
  return `/model-${product.slug}-${normalizedColor}-${view}.png`;
}

function formatTransferSize(code: string) {
  if (code === 'grande') return 'Grande';
  if (code === 'mediano') return 'Mediano';
  if (code === 'chico') return 'Chico';
  return code;
}

function uploadModeLabel(mode: UploadMode) {
  if (mode === 'photo_simple') return 'Foto simple';
  if (mode === 'photo_collage') return 'Foto collage';
  return 'Mascotas';
}

function formatCountList(counts: number[]) {
  if (!counts.length) return '';
  if (counts.length === 1) return `${counts[0]}`;
  if (counts.length === 2) return `${counts[0]} o ${counts[1]}`;
  return `${counts.slice(0, -1).join(', ')} o ${counts[counts.length - 1]}`;
}

function formatMoney(value: number) {
  return `$${value.toLocaleString('es-AR')}`;
}

function isDarkGarmentColor(color?: { name?: string; hex?: string } | null) {
  const name = color?.name?.toLowerCase() || '';
  const hex = (color?.hex || '').replace('#', '');
  if (name.includes('black') || name.includes('negro')) return true;
  if (hex.length === 6) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    return luminance < 0.35;
  }
  return false;
}

function logoPositionStyle(code: string): React.CSSProperties {
  if (code === 'LF') return { left: '50%', top: '33%', transform: 'translateX(-50%)' };
  if (code === 'LC') return { left: '50%', top: '17%', transform: 'translateX(-50%)' };
  return { right: '18%', top: '34%' };
}

function logoBelongsToView(code: string, view: 'front' | 'back') {
  if (code === 'LF') return view === 'front';
  if (code === 'LC') return view === 'back';
  return true;
}

function logoOptionLabel(code: string, name?: string) {
  if (name) return name;
  if (code === 'LF') return 'Frente medio';
  if (code === 'LC') return 'Cuello espalda';
  if (code === 'IBR') return 'Manga';
  return code;
}

function formatImageRequirement(count: number) {
  return `${count} imagen${count === 1 ? '' : 'es'}`;
}

function collageCellStyle(count: number, index: number): React.CSSProperties {
  if (count <= 1) {
    return { left: '0%', top: '0%', width: '100%', height: '100%' };
  }

  if (count === 2) {
    return {
      left: `${index * 50}%`,
      top: '0%',
      width: '50%',
      height: '100%',
    };
  }

  if (count === 3) {
    if (index === 0) {
      return { left: '0%', top: '0%', width: '100%', height: '52%' };
    }

    return {
      left: `${(index - 1) * 50}%`,
      top: '52%',
      width: '50%',
      height: '48%',
    };
  }

  if (count === 5 && index === 0) {
    return { left: '0%', top: '0%', width: '100%', height: '40%' };
  }

  const normalizedIndex = count === 5 ? index - 1 : index;
  const rowSize = 2;
  const column = normalizedIndex % rowSize;
  const row = Math.floor(normalizedIndex / rowSize);
  const topOffset = count === 5 ? 40 : 0;
  const availableHeight = count === 5 ? 60 : 100;
  const rows = count === 5 ? 2 : 2;

  return {
    left: `${column * 50}%`,
    top: `${topOffset + row * (availableHeight / rows)}%`,
    width: '50%',
    height: `${availableHeight / rows}%`,
  };
}

async function toAsset(file: File): Promise<UploadedAsset> {
  const previewUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error(`No se pudo leer ${file.name}`));
    reader.readAsDataURL(file);
  });
  const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.width, height: image.height });
    image.onerror = () => reject(new Error(`No se pudo validar ${file.name}`));
    image.src = previewUrl;
  });
  return { id: `${file.name}-${Date.now()}`, name: file.name, width: dimensions.width, height: dimensions.height, previewUrl };
}

export default function CustomizerApp({ session, onCartCountChange, onSessionChange }: { session: AppSession | null; onCartCountChange: (count: number) => void; onSessionChange: (session: AppSession | null) => void }) {
  const navigate = useNavigate();
  const printAreaRef = useRef<HTMLDivElement | null>(null);
  const [screen, setScreen] = useState<Screen>('mode');
  const [initData, setInitData] = useState<Catalog | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedSizeId, setSelectedSizeId] = useState('');
  const [selectedColorId, setSelectedColorId] = useState('');
  const [selectedView, setSelectedView] = useState<'front' | 'back'>('front');
  const [customMode, setCustomMode] = useState<CustomMode>('brand_design');
  const [selectedCategoryId, setSelectedCategoryId] = useState('all');
  const [selectedDesignId, setSelectedDesignId] = useState('');
  const [selectedUploadMode, setSelectedUploadMode] = useState<UploadMode>('photo_simple');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedTransferSizeCode, setSelectedTransferSizeCode] = useState('mediano');
  const [price, setPrice] = useState(0);
  const [, setBasePrice] = useState(0);
  const [, setTransferExtraPrice] = useState(0);
  const [isValid, setIsValid] = useState(false);
  const [hasResolvedConfiguration, setHasResolvedConfiguration] = useState(false);
  const [stockValidationMessage, setStockValidationMessage] = useState<string | null>(null);
  const [configurationCode, setConfigurationCode] = useState('');
  const [allowedLogoPlacements, setAllowedLogoPlacements] = useState<Array<{ code: string; name: string }>>([]);
  const [logoPlacementCode, setLogoPlacementCode] = useState('LC');
  const [logoAutoNotice, setLogoAutoNotice] = useState<string | null>(null);
  const [uploadedAssets, setUploadedAssets] = useState<UploadedAsset[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [customText, setCustomText] = useState('');
  const [layoutPosition, setLayoutPosition] = useState({ x: 50, y: 50 });
  const [cartCount, setCartCount] = useState(0);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getCatalogInit<Catalog>().then((data) => {
      setInitData(data);
      const firstModel = data.categories.flatMap((item) => item.garmentModels || [])[0];
      if (firstModel) {
        setSelectedProduct(firstModel);
        setSelectedSizeId(firstModel.sizes?.[0]?.sizeId || '');
        setSelectedColorId(firstModel.colors?.[0]?.colorId || '');
      }
      const firstDesign = data.collections.flatMap((item) => item.designs || [])[0];
      if (firstDesign) setSelectedDesignId(firstDesign.id);
      const firstTemplate = data.uploadTemplates?.[0];
      if (firstTemplate) {
        setSelectedTemplateId(firstTemplate.id);
        setSelectedUploadMode(firstTemplate.customizationType || 'photo_simple');
      }
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (!session) {
      setCartCount(0);
      onCartCountChange(0);
      return;
    }
    axios.get<CartResponse>('/api/cart').then((response) => {
      setCartCount(response.data.totalItems || 0);
      onCartCountChange(response.data.totalItems || 0);
    }).catch(() => {
      setCartCount(0);
      onCartCountChange(0);
    });
  }, [session, onCartCountChange]);
  const products = useMemo(() => (initData?.categories || []).flatMap((category) => category.garmentModels || []), [initData]);
  const designs = useMemo(() => (initData?.collections || []).flatMap((collection) => collection.designs || []), [initData]);
  const filteredDesigns = useMemo(() => designs.filter((item) => {
    const hasPlacementRules = (item.placements || []).length > 0;
    const matchesPlacement = !hasPlacementRules || (item.placements || []).some((placement) => placement.placement.code === (selectedView === 'front' ? 'FRONT' : 'BACK'));
    const matchesCategory = selectedCategoryId === 'all' || item.designCategoryId === selectedCategoryId;
    return matchesPlacement && matchesCategory;
  }), [designs, selectedView, selectedCategoryId]);
  const selectedDesign = filteredDesigns.find((item) => item.id === selectedDesignId) || null;
  const uploadTemplates = useMemo(() => initData?.uploadTemplates || [], [initData]);
  const filteredUploadTemplates = useMemo(() => uploadTemplates.filter((item) => (item.customizationType || 'photo_simple') === selectedUploadMode), [uploadTemplates, selectedUploadMode]);
  const selectedPlacementCode = selectedView === 'back' ? 'BACK' : 'FRONT';
  const uploadPlacementCodes = useMemo(
    () => Array.from(new Set(filteredUploadTemplates.map((item) => item.placement?.code).filter((item): item is string => Boolean(item)))),
    [filteredUploadTemplates]
  );
  const uploadTemplatesForView = useMemo(() => {
    const matching = filteredUploadTemplates.filter((item) => item.placement?.code === selectedPlacementCode);
    return matching.length ? matching : filteredUploadTemplates;
  }, [filteredUploadTemplates, selectedPlacementCode]);
  const uploadCountOptions = useMemo(
    () => Array.from(new Set(filteredUploadTemplates.map((item) => item.requiredImageCount))).sort((a, b) => a - b),
    [filteredUploadTemplates]
  );
  const inputAllowsText = useMemo(
    () => filteredUploadTemplates.some((item) => item.allowsText),
    [filteredUploadTemplates]
  );
  const inputTextLabel = useMemo(
    () => filteredUploadTemplates.find((item) => item.allowsText)?.textLabel || 'Texto',
    [filteredUploadTemplates]
  );
  const selectedTemplate = useMemo(() => {
    if (customMode === 'user_upload') {
      const byPlacement = uploadTemplatesForView;
      if (!byPlacement.length) return null;
      const bySize = byPlacement.filter((item) => (item.sizeOptions || []).some((size) => size.sizeCode === selectedTransferSizeCode));
      const sizeSource = bySize.length ? bySize : byPlacement;
      const byCount = uploadedAssets.length ? sizeSource.filter((item) => item.requiredImageCount === uploadedAssets.length) : sizeSource;
      const countSource = byCount.length ? byCount : sizeSource;
      const byText = customText.trim() ? countSource.filter((item) => item.allowsText) : countSource;
      return byText[0] || countSource[0] || null;
    }
    return null;
  }, [customMode, uploadTemplatesForView, filteredUploadTemplates, selectedTransferSizeCode, selectedTemplateId, uploadedAssets.length, customText]);
  const transferSizeOptions = useMemo(() => {
    if (customMode === 'brand_design') return selectedDesign?.transferSizes || [];
    const source = uploadTemplatesForView.length ? uploadTemplatesForView : filteredUploadTemplates;
    const byCode = new Map<string, SizePriceOption>();
    source.forEach((template) => {
      (template.sizeOptions || []).forEach((option) => {
        if (!byCode.has(option.sizeCode)) byCode.set(option.sizeCode, option);
      });
    });
    return Array.from(byCode.values());
  }, [customMode, selectedDesign, uploadTemplatesForView, filteredUploadTemplates]);
  const selectedTransferSize = transferSizeOptions.find((item) => item.sizeCode === selectedTransferSizeCode) || transferSizeOptions[0] || null;
  const selectedColorOption = selectedProduct?.colors?.find((item) => item.colorId === selectedColorId) || null;
  const productPrintPlacementCodes = useMemo(
    () => Array.from(new Set((selectedProduct?.printAreas || []).map((item) => item.placement.code).filter(Boolean))),
    [selectedProduct]
  );
  const currentColor = selectedColorOption?.color.name.toLowerCase() || 'white';
  const currentImage = resolveMockupImage(selectedProduct, currentColor, selectedView, selectedColorOption);
  const requiredAssetCount = customMode === 'user_upload'
    ? (selectedTemplate?.requiredImageCount ?? (selectedUploadMode === 'photo_simple' ? 1 : uploadCountOptions[0] || 0))
    : 0;
  const hasRequiredUploads = customMode !== 'user_upload' || (requiredAssetCount > 0 && uploadedAssets.length === requiredAssetCount);
  const customizerDisabledReason = !session
    ? null
    : saving
      ? 'Estamos guardando tu configuración.'
      : customMode === 'user_upload' && !selectedTemplate
        ? `Subí ${selectedUploadMode === 'photo_simple' ? 'tu imagen' : formatImageRequirement(uploadCountOptions[0] || 1)} para continuar.`
      : hasResolvedConfiguration && !isValid
        ? stockValidationMessage || 'Esta combinación no está disponible.'
        : customMode === 'user_upload' && !hasRequiredUploads
          ? `Subí ${formatImageRequirement(requiredAssetCount)} para continuar.`
          : null;
  const customizerActionDisabled = Boolean(customizerDisabledReason);
  const selectedModeLabel = customMode === 'brand_design' ? 'Diseño de la marca' : 'Personalizado';
  const selectedContentLabel = customMode === 'brand_design'
    ? (selectedDesign ? `${selectedDesign.code} · ${selectedDesign.name}` : 'Elegí una estampa')
    : selectedUploadMode === 'photo_simple'
      ? 'Foto simple'
      : selectedUploadMode === 'photo_collage'
        ? 'Foto collage'
        : 'Mascotas';
  const isDarkGarment = isDarkGarmentColor(selectedColorOption?.color);
  const compatibleBrandLogos = useMemo(
    () => (initData?.brandLogos || []).filter((logo) => {
      const matchesPlacement = (logo.placements || []).some((item) => item.placement.code === logoPlacementCode);
      const matchesColor = !(logo.colors || []).length || (logo.colors || []).some((item) => item.colorId === selectedColorId);
      return matchesPlacement && matchesColor;
    }),
    [initData, logoPlacementCode, selectedColorId]
  );
  const visibleLogoOptions = useMemo(() => {
    const baseOptions = allowedLogoPlacements.length ? allowedLogoPlacements : [...FALLBACK_LOGO_OPTIONS[selectedView]];
    return baseOptions.filter((option) =>
      (initData?.brandLogos || []).some((logo) => {
        const matchesPlacement = (logo.placements || []).some((item) => item.placement.code === option.code);
        const matchesColor = !(logo.colors || []).length || (logo.colors || []).some((item) => item.colorId === selectedColorId);
        return matchesPlacement && matchesColor;
      })
    );
  }, [allowedLogoPlacements, selectedView, initData, selectedColorId]);
  const allowedLogoOptions = useMemo(
    () => (allowedLogoPlacements.length ? allowedLogoPlacements : [...FALLBACK_LOGO_OPTIONS[selectedView]]),
    [allowedLogoPlacements, selectedView]
  );
  const selectedBrandLogo = compatibleBrandLogos[0] || null;
  const maxTransferWidth = Math.max(...transferSizeOptions.map((item) => item.widthCm || 0), 1);
  const maxTransferHeight = Math.max(...transferSizeOptions.map((item) => item.heightCm || 0), 1);
  const estimatedBasePrice = selectedProduct?.basePrice || 0;
  const estimatedTransferExtraPrice = selectedTransferSize?.extraPrice || 0;
  const estimatedTotalPrice = estimatedBasePrice + estimatedTransferExtraPrice;
  const printScaleStyle = selectedTransferSize
    ? {
        width: `${Math.max(20, (selectedTransferSize.widthCm / maxTransferWidth) * 92)}%`,
        height: `${Math.max(20, (selectedTransferSize.heightCm / maxTransferHeight) * 92)}%`,
      }
    : { width: '42%', height: '42%' };

  useEffect(() => {
    if (!selectedProduct) return;
    if (!selectedProduct.sizes?.some((item) => item.sizeId === selectedSizeId)) {
      setSelectedSizeId(selectedProduct.sizes?.[0]?.sizeId || '');
    }
    if (!selectedProduct.colors?.some((item) => item.colorId === selectedColorId)) {
      setSelectedColorId(selectedProduct.colors?.[0]?.colorId || '');
    }
  }, [selectedProduct, selectedSizeId, selectedColorId]);

  useEffect(() => {
    if (!productPrintPlacementCodes.length) return;
    if (productPrintPlacementCodes.includes(selectedPlacementCode)) return;
    setSelectedView(productPrintPlacementCodes[0] === 'BACK' ? 'back' : 'front');
  }, [productPrintPlacementCodes, selectedPlacementCode]);

  useEffect(() => {
    const firstSize = transferSizeOptions[0]?.sizeCode;
    if (firstSize && !transferSizeOptions.some((item) => item.sizeCode === selectedTransferSizeCode)) setSelectedTransferSizeCode(firstSize);
  }, [transferSizeOptions, selectedTransferSizeCode]);

  useEffect(() => {
    if (!filteredUploadTemplates.length) return;
    if (!filteredUploadTemplates.some((item) => item.id === selectedTemplateId)) {
      setSelectedTemplateId(filteredUploadTemplates[0].id);
      setUploadedAssets([]);
      setCustomText('');
    }
  }, [filteredUploadTemplates, selectedTemplateId]);

  useEffect(() => {
    if (customMode === 'user_upload' && uploadPlacementCodes.length && !uploadPlacementCodes.includes(selectedPlacementCode)) {
      setSelectedView(uploadPlacementCodes[0] === 'BACK' ? 'back' : 'front');
    }
  }, [customMode, uploadPlacementCodes, selectedPlacementCode]);

  useEffect(() => {
    if (!visibleLogoOptions.length) return;
    if (!visibleLogoOptions.some((item) => item.code === logoPlacementCode)) {
      setLogoPlacementCode(visibleLogoOptions[0].code);
      setLogoAutoNotice('Movimos el logo automáticamente porque no puede compartir la misma cara con la estampa.');
    }
  }, [visibleLogoOptions, logoPlacementCode]);

  useEffect(() => {
    if (!logoAutoNotice) return;
    const timeoutId = window.setTimeout(() => setLogoAutoNotice(null), 3500);
    return () => window.clearTimeout(timeoutId);
  }, [logoAutoNotice]);

  useEffect(() => {
    if (customMode !== 'brand_design') return;
    if (!filteredDesigns.length) {
      setSelectedDesignId('');
      return;
    }
    if (!filteredDesigns.some((item) => item.id === selectedDesignId)) {
      setSelectedDesignId(filteredDesigns[0].id);
    }
  }, [customMode, filteredDesigns, selectedDesignId]);

  useEffect(() => {
    const hasValidTransferSize = transferSizeOptions.length > 0 && transferSizeOptions.some((item) => item.sizeCode === selectedTransferSizeCode);
    const hasValidLogoPlacement = allowedLogoOptions.length > 0 && allowedLogoOptions.some((item) => item.code === logoPlacementCode);
    const hasValidPrintPlacement = productPrintPlacementCodes.length > 0 && productPrintPlacementCodes.includes(selectedPlacementCode);

    if (
      !selectedProduct ||
      !selectedSizeId ||
      !selectedColorId ||
      (customMode === 'brand_design' && !selectedDesignId) ||
      (customMode === 'user_upload' && !selectedTemplate) ||
      !hasValidPrintPlacement ||
      !hasValidTransferSize ||
      !hasValidLogoPlacement
    ) {
      setPrice(estimatedTotalPrice); setBasePrice(estimatedBasePrice); setTransferExtraPrice(estimatedTransferExtraPrice); setIsValid(false); setHasResolvedConfiguration(false); setStockValidationMessage(null); setConfigurationCode(''); return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      axios.post<Config>('/api/configurator/resolve', {
        customizationMode: customMode,
        garmentModelId: selectedProduct.id,
        sizeId: selectedSizeId,
        colorId: selectedColorId,
        printPlacementCode: selectedView === 'front' ? 'FRONT' : 'BACK',
        logoPlacementCode,
        designId: customMode === 'brand_design' ? selectedDesignId : undefined,
        uploadTemplateId: customMode === 'user_upload' ? selectedTemplate?.id : undefined,
        transferSizeCode: selectedTransferSizeCode,
      }, {
        signal: controller.signal,
      }).then((response) => {
        setPrice(response.data.price);
        setBasePrice(response.data.basePrice || 0);
        setTransferExtraPrice(response.data.extraPrice || 0);
        setIsValid(response.data.valid);
        setHasResolvedConfiguration(true);
        setStockValidationMessage(response.data.valid ? null : 'No hay stock disponible para esta combinación.');
        setConfigurationCode(response.data.configurationCode);
        setAllowedLogoPlacements(response.data.allowedLogoPlacements || []);
        if (!response.data.allowedLogoPlacements.some((item) => item.code === logoPlacementCode)) setLogoPlacementCode(response.data.allowedLogoPlacements[0]?.code || logoPlacementCode);
      }).catch((error) => {
        if (axios.isCancel(error) || (axios.isAxiosError(error) && error.code === 'ERR_CANCELED')) {
          return;
        }

        setPrice(estimatedTotalPrice);
        setBasePrice(estimatedBasePrice);
        setTransferExtraPrice(estimatedTransferExtraPrice);
        setIsValid(false);
        setHasResolvedConfiguration(false);
        setStockValidationMessage(readFriendlyApiError(error, 'No se pudo validar stock en este momento.'));
        setConfigurationCode('');
        setAllowedLogoPlacements([]);
      });
    }, 180);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [selectedProduct, selectedSizeId, selectedColorId, selectedDesignId, selectedTemplate, selectedView, logoPlacementCode, customMode, selectedTransferSizeCode, transferSizeOptions, allowedLogoOptions, productPrintPlacementCodes, selectedPlacementCode, estimatedTotalPrice, estimatedBasePrice, estimatedTransferExtraPrice]);

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setUploadError(null);
    try {
      if (selectedUploadMode === 'photo_simple') {
        if (files.length < 1) throw new Error('Debés subir 1 imagen.');
      } else if (!uploadCountOptions.includes(files.length)) {
        throw new Error(`Debés subir ${formatCountList(uploadCountOptions)} imagen${uploadCountOptions.some((count) => count > 1) ? 'es' : ''} para ${uploadModeLabel(selectedUploadMode).toLowerCase()}.`);
      }
      const nextAssets: UploadedAsset[] = [];
      const expectedCount = selectedUploadMode === 'photo_simple' ? 1 : files.length;
      for (const file of files.slice(0, expectedCount)) {
        if (!PHOTO_RULES.allowed.includes(file.type)) throw new Error('El archivo debe ser PNG, JPG o WEBP.');
        const asset = await toAsset(file);
        if (asset.width < PHOTO_RULES.minWidth || asset.height < PHOTO_RULES.minHeight) throw new Error('La imagen debe tener una calidad mínima de 1000x1000 px.');
        nextAssets.push(asset);
      }
      setUploadedAssets(nextAssets);
    } catch (error) {
      setUploadedAssets([]);
      setUploadError(error instanceof Error ? error.message : 'No se pudo cargar la imagen.');
    }
  }

  async function addToCart() {
    if (!session || !selectedProduct || !selectedSizeId || !selectedColorId) return;
    if (customMode === 'user_upload' && (!selectedTemplate || !hasRequiredUploads)) {
      setSaveError(`Subí ${formatImageRequirement(requiredAssetCount || 1)} para continuar.`);
      return;
    }
    setSaving(true); setSaveError(null);
    try {
      const response = await axios.post<CartResponse>('/api/cart/items', {
        customizationMode: customMode,
        garmentModelId: selectedProduct.id,
        colorId: selectedColorId,
        sizeId: selectedSizeId,
        printPlacementCode: selectedView === 'front' ? 'FRONT' : 'BACK',
        logoPlacementCode,
        designId: customMode === 'brand_design' ? selectedDesignId : undefined,
        uploadTemplateId: customMode === 'user_upload' ? selectedTemplate?.id : undefined,
        transferSizeCode: selectedTransferSizeCode,
        customAssetUrlsJson: customMode === 'user_upload' && uploadedAssets.length ? JSON.stringify({ assets: uploadedAssets, text: customText || undefined }) : undefined,
        quantity: 1,
      });
      setCartCount(response.data.totalItems || 0);
      onCartCountChange(response.data.totalItems || 0);
      navigate('/cart');
    } catch (error) {
      if (isAuthError(error)) {
        onSessionChange(null);
      }
      setSaveError(readFriendlyApiError(error, 'No se pudo guardar en el carrito.'));
    } finally { setSaving(false); }
  }

  function startDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (!printAreaRef.current) return;
    const rect = printAreaRef.current.getBoundingClientRect();
    const origin = { x: event.clientX, y: event.clientY, startX: layoutPosition.x, startY: layoutPosition.y };
    const onMove = (moveEvent: PointerEvent) => setLayoutPosition({ x: Math.max(8, Math.min(92, origin.startX + ((moveEvent.clientX - origin.x) / rect.width) * 100)), y: Math.max(8, Math.min(92, origin.startY + ((moveEvent.clientY - origin.y) / rect.height) * 100)) });
    const onUp = () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
    window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp);
  }

  function cycleDesign(direction: 'prev' | 'next') {
    if (!filteredDesigns.length) return;
    const currentIndex = filteredDesigns.findIndex((item) => item.id === selectedDesignId);
    const baseIndex = currentIndex >= 0 ? currentIndex : 0;
    const offset = direction === 'next' ? 1 : -1;
    const nextIndex = (baseIndex + offset + filteredDesigns.length) % filteredDesigns.length;
    setSelectedDesignId(filteredDesigns[nextIndex].id);
  }

  function cycleProduct(direction: 'prev' | 'next') {
    if (!products.length) return;
    const currentIndex = products.findIndex((item) => item.id === selectedProduct?.id);
    const baseIndex = currentIndex >= 0 ? currentIndex : 0;
    const offset = direction === 'next' ? 1 : -1;
    const nextIndex = (baseIndex + offset + products.length) % products.length;
    setSelectedProduct(products[nextIndex]);
  }

  function renderBrandDesignPicker() {
    const currentIndex = filteredDesigns.findIndex((item) => item.id === selectedDesign?.id);
    const baseIndex = currentIndex >= 0 ? currentIndex : 0;
    const prevDesign = filteredDesigns.length > 1 ? filteredDesigns[(baseIndex - 1 + filteredDesigns.length) % filteredDesigns.length] : null;
    const nextDesign = filteredDesigns.length > 1 ? filteredDesigns[(baseIndex + 1) % filteredDesigns.length] : null;

    return (
      <div className="mt-6 space-y-6">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">Categorías</h3>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
            <button onClick={() => setSelectedCategoryId('all')} className={`text-left text-sm font-bold uppercase transition-colors ${selectedCategoryId === 'all' ? 'text-gray-900' : 'text-gray-400 hover:text-gray-700'}`} style={{ fontFamily: 'var(--font-heading)' }}>Todas</button>
            {(initData?.designCategories || []).map((item) => <button key={item.id} onClick={() => setSelectedCategoryId(item.id)} className={`text-left text-sm font-bold uppercase transition-colors ${selectedCategoryId === item.id ? 'text-gray-900' : 'text-gray-400 hover:text-gray-700'}`} style={{ fontFamily: 'var(--font-heading)' }}>{item.name}</button>)}
          </div>
        </div>
        <div className="overflow-hidden rounded-[32px] bg-[#050505] px-4 py-8 text-white lg:px-8 lg:py-10">
          <div className="mx-auto max-w-2xl text-center">
            <h3 className="text-[2rem] leading-[0.95] font-normal text-white sm:text-[2.8rem]" style={{ fontFamily: 'Georgia, Times New Roman, serif' }}>
              Diseños elegidos para
              <br />
              esta colección
            </h3>
          </div>
          {!filteredDesigns.length ? (
            <div className="mt-8 rounded-[28px] border border-white/10 bg-white/5 p-8 text-center">
              <p className="text-sm font-semibold text-white">No hay diseños visibles para este filtro.</p>
              <p className="mt-2 text-sm text-white/60">Probá con otra categoría o cargá una estampa desde el admin.</p>
            </div>
          ) : (
            <div className="mt-10">
              <div className="flex items-center justify-center gap-3 [perspective:1400px] sm:gap-5">
                {prevDesign ? (
                  <button
                    type="button"
                    onClick={() => setSelectedDesignId(prevDesign.id)}
                    className="hidden h-[240px] w-[98px] shrink-0 overflow-hidden rounded-[28px] bg-white/10 opacity-65 shadow-[0_20px_40px_rgba(0,0,0,0.35)] transition duration-300 hover:opacity-100 sm:block"
                    style={{ transform: 'rotateY(38deg) rotateZ(-2deg) scale(0.94)' }}
                  >
                    <img src={prevDesign.imageUrl} alt={prevDesign.name} className="h-full w-full object-cover" />
                  </button>
                ) : null}
                <button type="button" onClick={() => cycleDesign('prev')} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition hover:bg-white/18">
                  <ChevronLeft size={20} />
                </button>
                <button type="button" onClick={() => selectedDesign && setSelectedDesignId(selectedDesign.id)} className="group flex min-w-0 max-w-[300px] flex-1 flex-col overflow-hidden rounded-[34px] bg-white/8 text-left shadow-[0_32px_100px_rgba(0,0,0,0.5)] ring-1 ring-white/8 transition duration-300 hover:-translate-y-1">
                  <div className="relative flex h-[340px] w-full items-end overflow-hidden bg-[radial-gradient(circle_at_top,#2a2a2a_0%,#101010_45%,#060606_100%)] p-4 sm:h-[400px]">
                    {selectedDesign ? <img src={selectedDesign.imageUrl} alt={selectedDesign.name} className="h-full w-full rounded-[28px] object-cover transition-transform duration-500 group-hover:scale-[1.03]" /> : null}
                    {selectedDesign ? <div className="pointer-events-none absolute inset-x-6 bottom-6 rounded-2xl bg-black/35 px-4 py-3 backdrop-blur-sm"><p className="text-[11px] font-bold uppercase tracking-[0.26em] text-white/70">{selectedDesign.code}</p><p className="mt-1 text-xl leading-tight text-white" style={{ fontFamily: 'Georgia, Times New Roman, serif' }}>{selectedDesign.name}</p></div> : null}
                  </div>
                </button>
                <button type="button" onClick={() => cycleDesign('next')} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition hover:bg-white/18">
                  <ChevronRight size={20} />
                </button>
                {nextDesign ? (
                  <button
                    type="button"
                    onClick={() => setSelectedDesignId(nextDesign.id)}
                    className="hidden h-[240px] w-[98px] shrink-0 overflow-hidden rounded-[28px] bg-white/10 opacity-65 shadow-[0_20px_40px_rgba(0,0,0,0.35)] transition duration-300 hover:opacity-100 sm:block"
                    style={{ transform: 'rotateY(-38deg) rotateZ(2deg) scale(0.94)' }}
                  >
                    <img src={nextDesign.imageUrl} alt={nextDesign.name} className="h-full w-full object-cover" />
                  </button>
                ) : null}
              </div>
              {selectedDesign ? (
                <div className="mt-6 flex items-center justify-between gap-4 px-2">
                  <p className="text-sm text-white/60">{filteredDesigns.findIndex((item) => item.id === selectedDesign.id) + 1} / {filteredDesigns.length}</p>
                  <p className="text-sm text-white/60">{selectedCategoryId === 'all' ? 'Todas las categorías' : (initData?.designCategories || []).find((item) => item.id === selectedCategoryId)?.name || 'Categoría'}</p>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderCustomizerMockup(view: 'front' | 'back') {
    const image = resolveMockupImage(selectedProduct, currentColor, view, selectedColorOption);
    const isActiveView = selectedView === view;
    const canEditView = customMode === 'brand_design'
      || (customMode === 'user_upload' && uploadPlacementCodes.includes(view === 'front' ? 'FRONT' : 'BACK'));
    const uploadedAssetCount = uploadedAssets.length;

    return (
      <button
        key={view}
        type="button"
        onClick={() => { if (canEditView) setSelectedView(view); }}
        className={`relative flex h-[260px] w-[180px] items-center justify-center rounded-[28px] border p-4 transition sm:h-[360px] sm:w-[240px] lg:h-[430px] lg:w-[280px] ${isActiveView ? 'border-white/40 bg-white/10 shadow-[0_24px_60px_rgba(0,0,0,0.38)]' : 'border-white/10 bg-white/[0.04] opacity-75'} ${canEditView ? 'cursor-pointer' : 'cursor-default'}`}
      >
        <img src={image} className="absolute inset-0 h-full w-full object-contain" alt={`T-Shirt ${view}`} />
        <div className="absolute left-4 top-4 rounded-full bg-black/45 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-white backdrop-blur-sm">
          {view === 'front' ? 'Frente' : 'Espalda'}
        </div>
        {!canEditView ? <div className="absolute bottom-4 rounded-full bg-black/45 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">No disponible</div> : null}
        {logoBelongsToView(logoPlacementCode, view)
          ? selectedBrandLogo
            ? <img
                src={selectedBrandLogo.imageUrl}
                alt={selectedBrandLogo.name}
                className="absolute z-30 object-contain drop-shadow-md"
                style={{
                  ...logoPositionStyle(logoPlacementCode),
                  width: `${Math.max(12, Math.min(22, selectedBrandLogo.widthCm * 2.4))}%`,
                  height: 'auto',
                  maxHeight: '14%',
                }}
              />
            : <div className="absolute z-30 rounded-full bg-white px-2 py-1 text-[10px] font-black tracking-[0.18em] text-[#113f27] shadow" style={logoPositionStyle(logoPlacementCode)}>{logoOptionLabel(logoPlacementCode)}</div>
          : null}
        {isActiveView ? (
          <>
            <div ref={printAreaRef} className="absolute left-[30%] top-[25%] z-20 h-[50%] w-[40%] overflow-hidden border-2 border-dashed border-black/10">
              {customMode === 'user_upload'
                ? uploadedAssets[0]
                  ? <>
                      {selectedUploadMode === 'photo_simple' ? (
                        <img src={uploadedAssets[0].previewUrl} className="absolute cursor-grab object-contain" alt="Upload" onPointerDown={startDrag} style={{ ...printScaleStyle, left: `${layoutPosition.x}%`, top: `${layoutPosition.y}%`, transform: 'translate(-50%, -50%)' }} />
                      ) : (
                        <div className="absolute inset-0 grid overflow-hidden rounded-[10px] bg-white/85">
                          {uploadedAssets.slice(0, 5).map((asset, index) => (
                            <div
                              key={asset.id}
                              className="absolute overflow-hidden border border-white/80 bg-stone-100"
                              style={collageCellStyle(Math.min(uploadedAssetCount, 5), index)}
                            >
                              <img src={asset.previewUrl} alt={asset.name} className="h-full w-full object-cover" />
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  : null
                : selectedDesign
                  ? <div onPointerDown={startDrag} className="absolute cursor-grab" style={{ ...printScaleStyle, left: `${layoutPosition.x}%`, top: `${layoutPosition.y}%`, transform: 'translate(-50%, -50%)' }}><img src={selectedDesign.imageUrl} alt={selectedDesign.name} className="h-full w-full object-contain drop-shadow-md" /><div className="pointer-events-none absolute -bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-white/92 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#113f27] shadow">{selectedDesign.code}</div></div>
                  : null}
            </div>
            <div className="absolute inset-0 rounded-[28px] ring-2 ring-white/20" />
          </>
        ) : null}
      </button>
    );
  }

  if (screen === 'product') {
    return (
      <section className="relative flex h-screen flex-col overflow-hidden bg-black">
        <header className="absolute top-0 z-10 flex w-full justify-between p-6"><button onClick={() => setScreen('mode')} className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/90 shadow-lg"><ChevronLeft /></button><Link to="/cart" className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/90 shadow-lg"><ShoppingCart /></Link></header>
        <div className="relative flex flex-1 items-center justify-center px-4 pb-[34vh] sm:px-8 lg:px-16">
          <button type="button" onClick={() => cycleProduct('prev')} disabled={products.length < 2} className="absolute left-4 top-1/2 z-30 flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full border border-black/10 bg-white/95 text-gray-700 shadow-lg transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40 sm:left-6 lg:left-[10%] lg:h-16 lg:w-16">
            <ChevronLeft size={28} />
          </button>
          <img src={currentImage} alt="Model" className="relative z-10 max-h-[50vh] max-w-[82%] translate-y-8 object-contain drop-shadow-2xl sm:max-w-[74%] lg:max-w-[62%]" />
          <button type="button" onClick={() => cycleProduct('next')} disabled={products.length < 2} className="absolute right-4 top-1/2 z-30 flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full border border-black/10 bg-white/95 text-gray-700 shadow-lg transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40 sm:right-6 lg:right-[10%] lg:h-16 lg:w-16">
            <ChevronRight size={28} />
          </button>
        </div>
        <div className="absolute bottom-0 left-1/2 z-20 flex min-h-[24vh] w-full max-w-[600px] -translate-x-1/2 flex-col rounded-t-[40px] bg-white px-6 pb-4 pt-4 shadow-[0_-10px_40px_rgba(0,0,0,0.2)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500">Indumentaria</p>
              <h2 className="mt-2 text-[1.9rem] font-extrabold uppercase leading-none tracking-[0.06em] text-[#111827]" style={{ fontFamily: 'var(--font-heading)' }}>{selectedProduct?.name || 'REMERA OVERSIZE'}</h2>
              <p className="mt-2 text-sm text-gray-500">{selectedProduct?.description || 'Remera de corte amplio y relajado.'}</p>
            </div>
            {products.length > 1 ? <p className="shrink-0 text-sm font-medium text-gray-400">{(products.findIndex((item) => item.id === selectedProduct?.id) + 1) || 1} / {products.length}</p> : null}
          </div>
          <div className="mb-3 mt-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Talles disponibles</p>
            <div className="flex flex-wrap gap-3">
              {(selectedProduct?.sizes || []).map((item) => <button key={item.sizeId} onClick={() => setSelectedSizeId(item.sizeId)} className={`min-w-12 rounded-2xl border px-4 py-3 text-sm font-bold uppercase tracking-[0.08em] transition ${selectedSizeId === item.sizeId ? 'border-[#111827] bg-[#111827] text-white' : 'border-gray-200 bg-white text-gray-800'}`} style={{ fontFamily: 'var(--font-body)' }}>{item.size.name}</button>)}
            </div>
          </div>
          <button disabled={!selectedSizeId} onClick={() => setScreen('selection')} className="w-full rounded-2xl bg-[#111827] px-6 py-3.5 text-sm font-extrabold uppercase tracking-[0.12em] text-white disabled:opacity-50" style={{ fontFamily: 'var(--font-heading)' }}>Continuar</button>
        </div>
        <aside className="absolute right-4 top-[45%] z-40 hidden -translate-y-1/2 md:flex lg:right-6">
          <div className="flex flex-col gap-3 rounded-[28px] border border-black/10 bg-white/92 p-3 shadow-xl backdrop-blur-md">
            <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500">Color</p>
            <div className="flex flex-col gap-2">
            {(selectedProduct?.colors || []).slice(0, 8).map((item) => (
              <button
                key={item.colorId}
                type="button"
                onClick={() => setSelectedColorId(item.colorId)}
                className={`flex h-11 w-11 items-center justify-center rounded-full border border-black/10 ${selectedColorId === item.colorId ? 'ring-4 ring-gray-900' : ''}`}
                style={{ backgroundColor: item.color.hex || '#ffffff' }}
                aria-label={item.color.name}
                title={item.color.name}
              />
            ))}
            </div>
            <p className="px-1 text-xs font-medium text-gray-500">{selectedColorOption?.color.name || 'Sin color'}</p>
          </div>
        </aside>
        <div className="absolute bottom-[12.5rem] left-4 right-4 z-30 md:hidden">
          <div className="rounded-3xl border border-black/10 bg-white/90 p-4 shadow-lg backdrop-blur-md">
            <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Color</p>
            <div className="mt-3 flex flex-wrap gap-3">
              {(selectedProduct?.colors || []).slice(0, 8).map((item) => (
                <button
                  key={item.colorId}
                  type="button"
                  onClick={() => setSelectedColorId(item.colorId)}
                  className={`h-10 w-10 rounded-full border border-black/10 ${selectedColorId === item.colorId ? 'ring-4 ring-gray-900' : ''}`}
                  style={{ backgroundColor: item.color.hex || '#ffffff' }}
                  aria-label={item.color.name}
                />
              ))}
            </div>
            <p className="mt-3 text-sm text-gray-500">{selectedColorOption?.color.name || 'Sin color disponible'}</p>
          </div>
        </div>
      </section>
    );
  }

  if (screen === 'mode') {
    return (
      <section className="flex min-h-screen flex-col items-center justify-center bg-black p-8 text-white relative">
        <div className="fixed top-[18%] left-1/2 -translate-x-1/2 opacity-70 pointer-events-none" style={{ width: '40vw' }}>
          <img src={logoAssetUrl} alt="Logo" className="w-full h-auto mx-auto" />
        </div>
        <header className="absolute top-0 z-10 flex w-full justify-between p-6">
          <div className="h-11 w-11" />
          <Link to="/cart" className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/90 shadow-lg text-black"><ShoppingCart /></Link>
        </header>
        <div className="mb-8 text-center relative z-10 mt-28">
          <p className="opacity-80 text-base font-medium" style={{ fontFamily: 'var(--font-body)' }}>Elegí el contenido de la estampa</p>
        </div>
        <div className="flex w-full max-w-2xl gap-8 relative z-10">
          <button
            onClick={() => { setCustomMode('brand_design'); setScreen('product'); }}
            className="flex h-48 flex-1 items-center justify-center rounded-2xl bg-white/5 text-2xl tracking-widest font-extrabold"
            style={{ fontFamily: 'var(--font-heading)', color: '#ffffff' }}
          >
            DISEÑOS DE LA MARCA
          </button>
          <button
            onClick={() => { setCustomMode('user_upload'); setScreen('product'); }}
            className="flex h-48 flex-1 items-center justify-center rounded-2xl bg-white/5 text-2xl tracking-widest font-extrabold"
            style={{ fontFamily: 'var(--font-heading)', color: '#ffffff' }}
          >
            PERSONALIZADO
          </button>
        </div>
      </section>
    );
  }

  if (screen === 'selection') {
    return (
      <section className="relative flex min-h-screen flex-col overflow-hidden bg-black">
        <header className="absolute top-0 z-10 flex w-full justify-between p-6"><button onClick={() => setScreen('product')} className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/90 shadow-lg"><ChevronLeft /></button><Link to="/cart" className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/90 shadow-lg"><ShoppingCart /></Link></header>
        <div className="flex flex-1 items-center justify-center px-4 pb-10 pt-28"><div className="w-full max-w-5xl rounded-lg bg-white p-6 shadow-[0_24px_60px_rgba(0,0,0,0.22)] lg:p-8"><h2 className="text-3xl font-extrabold text-[#111827]">{customMode === 'brand_design' ? 'Elegí el diseño de la marca' : 'Elegí tu contenido personalizado'}</h2><p className="mt-2 text-sm text-gray-500">{customMode === 'brand_design' ? 'Seleccioná la estampa que querés aplicar antes de pasar al mockup.' : 'Subí tus imágenes. El tamaño, la cara de la prenda, el color y el logo se eligen en la siguiente pantalla.'}</p>{customMode === 'brand_design' ? renderBrandDesignPicker() : <div className="mt-6 space-y-6"><div><div className="flex flex-wrap gap-4">{(['photo_simple', 'photo_collage', 'pets'] as UploadMode[]).map((mode) => <button key={mode} onClick={() => { setSelectedUploadMode(mode); setUploadedAssets([]); setUploadError(null); setCustomText(''); }} className={`px-2 py-1 text-sm font-bold uppercase transition-colors ${selectedUploadMode === mode ? 'text-gray-900 border-b-2 border-gray-900' : 'text-gray-400'}`} style={{ fontFamily: 'var(--font-heading)' }}>{uploadModeLabel(mode)}</button>)}</div></div><div><h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">{selectedUploadMode === 'photo_simple' ? 'Foto' : 'Archivos'}</h3><label className="flex min-h-56 cursor-pointer items-center justify-center rounded-lg bg-gray-50 text-gray-400"><div className="text-center"><UploadCloud size={36} className="mx-auto" /><p className="mt-3 text-sm font-medium text-gray-700">{selectedUploadMode === 'photo_simple' ? 'Subí tu imagen' : 'Subí tus imágenes'}</p><p className="mt-1 text-xs text-gray-500">PNG, JPG o WEBP. Permitidas: {selectedUploadMode === 'photo_simple' ? '1' : formatCountList(uploadCountOptions)} imagen{selectedUploadMode === 'photo_simple' || uploadCountOptions.every((count) => count === 1) ? '' : 'es'}</p></div><input type="file" multiple={selectedUploadMode !== 'photo_simple'} className="hidden" onChange={handleFileUpload} /></label>{uploadError && <p className="mt-2 text-sm text-rose-600">{uploadError}</p>}{uploadedAssets.length ? <p className="mt-2 text-sm text-gray-600">{uploadedAssets.length} archivo(s) listo(s).</p> : null}{inputAllowsText ? <input className="mt-4 w-full rounded-xl bg-gray-50 p-3" value={customText} onChange={(event) => setCustomText(event.target.value)} placeholder={inputTextLabel} /> : null}</div></div>}<div className="mt-8 flex items-center justify-between gap-4 pt-6"><div className="text-sm text-gray-500">{customMode === 'brand_design' ? (selectedDesign ? `Seleccionado: ${selectedDesign.name}` : 'Elegí una estampa para continuar.') : selectedTemplate && hasRequiredUploads ? `Contenido listo: ${selectedContentLabel}` : `Subí ${selectedUploadMode === 'photo_simple' ? '1 imagen' : `${formatCountList(uploadCountOptions)} imágenes`} para continuar.`}</div><button disabled={(customMode === 'brand_design' && !selectedDesignId) || (customMode === 'user_upload' && (!selectedTemplate || !hasRequiredUploads))} onClick={() => setScreen('customizer')} className="rounded-md bg-[#111827] px-6 py-3 font-bold text-white disabled:opacity-50">Ir al mockup</button></div></div></div>
      </section>
    );
  }
  return (
    <section className={`relative flex min-h-screen flex-col overflow-hidden lg:h-screen ${isDarkGarment ? 'bg-white' : 'bg-black'}`}>
      <header className="absolute left-4 top-4 z-50 flex items-center gap-4 lg:left-6 lg:top-6"><button onClick={() => setScreen('selection')} className={`flex h-11 w-11 items-center justify-center rounded-xl shadow-lg ${isDarkGarment ? 'border border-black/10 bg-white text-[#111827]' : 'bg-white/90 text-[#111827]'}`}><ChevronLeft /></button><div><h1 className={`text-2xl font-bold ${isDarkGarment ? 'text-[#111827]' : 'text-white'}`}>Personalizar</h1><p className={`text-sm ${isDarkGarment ? 'text-gray-500' : 'text-white/70'}`}>{selectedProduct?.name}</p></div></header>
      <aside className="absolute right-4 top-4 z-50 lg:right-6 lg:top-6">
        <StorefrontTopBar session={session} onLogout={() => onSessionChange(null)} cartCount={cartCount} tone="dark" />
      </aside>
      <aside className="absolute left-4 top-28 z-40 hidden w-[200px] flex-col gap-3 lg:flex"><div className={`rounded-3xl p-4 backdrop-blur-md ${isDarkGarment ? 'border border-black/10 bg-black/[0.05]' : 'border border-white/20 bg-white/12'}`}><p className={`text-xs uppercase tracking-[0.2em] ${isDarkGarment ? 'text-gray-500' : 'text-white/70'}`}>Selección</p><p className={`mt-3 text-sm font-semibold ${isDarkGarment ? 'text-[#111827]' : 'text-white'}`}>{selectedModeLabel}</p><p className={`mt-1 text-sm line-clamp-2 ${isDarkGarment ? 'text-gray-500' : 'text-white/70'}`}>{selectedContentLabel}</p></div><div className={`rounded-3xl p-4 backdrop-blur-md ${isDarkGarment ? 'border border-black/10 bg-black/[0.05]' : 'border border-white/20 bg-white/12'}`}><p className={`text-xs uppercase tracking-[0.2em] ${isDarkGarment ? 'text-gray-500' : 'text-white/70'}`}>Tamaño</p><div className="mt-3 flex flex-col gap-2">{transferSizeOptions.map((item) => <button key={item.id} onClick={() => setSelectedTransferSizeCode(item.sizeCode)} className={`rounded-2xl px-4 py-3 text-left text-sm font-semibold ${selectedTransferSizeCode === item.sizeCode ? 'bg-white text-[#113f27] border border-black/10' : isDarkGarment ? 'bg-black/[0.05] text-[#111827] border border-black/10' : 'bg-white/10 text-white'}`}>{formatTransferSize(item.sizeCode)}</button>)}</div></div><div className={`rounded-3xl p-4 backdrop-blur-md ${isDarkGarment ? 'border border-black/10 bg-black/[0.05]' : 'border border-white/20 bg-white/12'}`}><p className={`text-xs uppercase tracking-[0.2em] ${isDarkGarment ? 'text-gray-500' : 'text-white/70'}`}>Logo</p><p className={`mt-2 text-xs ${isDarkGarment ? 'text-gray-500' : 'text-white/70'}`}>Elegí una ubicación compatible.</p>{logoAutoNotice ? <p className={`mt-3 rounded-2xl px-3 py-2 text-xs leading-5 ${isDarkGarment ? 'bg-black/[0.05] text-[#111827]' : 'bg-white/12 text-white'}`}>{logoAutoNotice}</p> : null}<div className="mt-3 flex flex-col gap-2">{visibleLogoOptions.map((item) => <button key={item.code} onClick={() => setLogoPlacementCode(item.code)} className={`rounded-2xl px-4 py-3 text-left text-sm font-semibold ${logoPlacementCode === item.code ? 'bg-white text-[#113f27] border border-black/10' : isDarkGarment ? 'bg-black/[0.05] text-[#111827] border border-black/10' : 'bg-white/10 text-white'}`}>{logoOptionLabel(item.code, item.name)}</button>)}</div></div></aside>
      <main className="relative z-10 flex flex-1 items-start justify-center px-4 pb-[22rem] pt-24 sm:pb-[18rem] lg:pb-[8rem] lg:pt-20">
        <div className="flex w-full max-w-[760px] items-center justify-center gap-3 sm:gap-5 lg:max-w-[980px]">
          {renderCustomizerMockup('front')}
          {renderCustomizerMockup('back')}
        </div>
      </main>
      <aside className="absolute right-4 top-[45%] z-50 hidden -translate-y-[80%] flex-col gap-6 lg:right-6 lg:flex">{customMode === 'brand_design' || (customMode === 'user_upload' && uploadPlacementCodes.length > 1) ? <div className={`flex flex-col gap-1 rounded-3xl p-2 shadow-xl backdrop-blur-md ${isDarkGarment ? 'border border-black/10 bg-white/95' : 'border border-white/30 bg-white/15'}`}><button onClick={() => setSelectedView('front')} className={`rounded-xl px-2 py-4 text-sm font-semibold ${selectedView === 'front' ? 'border border-black/10 bg-white text-[#113f27]' : isDarkGarment ? 'text-[#111827]' : 'text-white/60'}`} style={{ writingMode: 'vertical-rl' }}>Frente</button><button onClick={() => setSelectedView('back')} className={`rounded-xl px-2 py-4 text-sm font-semibold ${selectedView === 'back' ? 'border border-black/10 bg-white text-[#113f27]' : isDarkGarment ? 'text-[#111827]' : 'text-white/60'}`} style={{ writingMode: 'vertical-rl' }}>Espalda</button></div> : <div className={`rounded-3xl px-4 py-6 text-center text-sm font-semibold shadow-xl backdrop-blur-md ${isDarkGarment ? 'border border-black/10 bg-white/95 text-[#111827]' : 'border border-white/30 bg-white/15 text-white'}`}>{selectedTemplate?.placement?.code === 'BACK' ? 'Espalda' : 'Frente'}</div>}</aside>
      <div className="absolute bottom-[9.75rem] left-4 right-4 z-30 space-y-3 lg:hidden"><div className={`rounded-3xl p-4 backdrop-blur-md ${isDarkGarment ? 'border border-black/10 bg-white/92' : 'border border-white/20 bg-white/12'}`}>{customMode === 'brand_design' || (customMode === 'user_upload' && uploadPlacementCodes.length > 1) ? <><p className={`text-xs uppercase tracking-[0.2em] ${isDarkGarment ? 'text-gray-500' : 'text-white/70'}`}>Vista</p><div className="mt-3 flex gap-2"><button onClick={() => setSelectedView('front')} className={`rounded-full px-4 py-2 text-sm font-semibold ${selectedView === 'front' ? 'border border-black/10 bg-white text-[#113f27]' : isDarkGarment ? 'border border-black/10 bg-black/[0.05] text-[#111827]' : 'bg-white/10 text-white'}`}>Frente</button><button onClick={() => setSelectedView('back')} className={`rounded-full px-4 py-2 text-sm font-semibold ${selectedView === 'back' ? 'border border-black/10 bg-white text-[#113f27]' : isDarkGarment ? 'border border-black/10 bg-black/[0.05] text-[#111827]' : 'bg-white/10 text-white'}`}>Espalda</button></div></> : <p className={`text-sm font-semibold ${isDarkGarment ? 'text-[#111827]' : 'text-white'}`}>{selectedTemplate?.placement?.code === 'BACK' ? 'Vista espalda' : 'Vista frente'}</p>}</div><div className={`rounded-3xl p-4 backdrop-blur-md ${isDarkGarment ? 'border border-black/10 bg-white/92' : 'border border-white/20 bg-white/12'}`}><p className={`text-xs uppercase tracking-[0.2em] ${isDarkGarment ? 'text-gray-500' : 'text-white/70'}`}>Tamaño</p><div className="mt-3 flex flex-wrap gap-2">{transferSizeOptions.map((item) => <button key={item.id} onClick={() => setSelectedTransferSizeCode(item.sizeCode)} className={`rounded-full px-4 py-2 text-sm font-semibold ${selectedTransferSizeCode === item.sizeCode ? 'border border-black/10 bg-white text-[#113f27]' : isDarkGarment ? 'border border-black/10 bg-black/[0.05] text-[#111827]' : 'bg-white/10 text-white'}`}>{formatTransferSize(item.sizeCode)}</button>)}</div></div><div className={`rounded-3xl p-4 backdrop-blur-md ${isDarkGarment ? 'border border-black/10 bg-white/92' : 'border border-white/20 bg-white/12'}`}><p className={`text-xs uppercase tracking-[0.2em] ${isDarkGarment ? 'text-gray-500' : 'text-white/70'}`}>Logo</p>{logoAutoNotice ? <p className={`mt-2 rounded-2xl px-3 py-2 text-xs leading-5 ${isDarkGarment ? 'bg-black/[0.05] text-[#111827]' : 'bg-white/12 text-white'}`}>{logoAutoNotice}</p> : null}<div className="mt-3 flex flex-wrap gap-2">{visibleLogoOptions.map((item) => <button key={item.code} onClick={() => setLogoPlacementCode(item.code)} className={`rounded-full px-4 py-2 text-sm font-semibold ${logoPlacementCode === item.code ? 'border border-black/10 bg-white text-[#113f27]' : isDarkGarment ? 'border border-black/10 bg-black/[0.05] text-[#111827]' : 'bg-white/10 text-white'}`}>{logoOptionLabel(item.code, item.name)}</button>)}</div></div></div>
      <div className="relative z-30 mt-auto flex w-full max-w-[760px] flex-col overflow-hidden rounded-t-[34px] bg-white px-5 py-3 shadow-[0_-10px_40px_rgba(0,0,0,0.2)] lg:absolute lg:bottom-0 lg:left-1/2 lg:w-[92vw] lg:max-w-[760px] lg:-translate-x-1/2 lg:flex-row lg:rounded-t-[40px] lg:px-6 lg:py-3"><div className="min-w-0 flex flex-1 flex-col justify-center pr-0 lg:pr-6"><h3 className="mb-1 text-lg font-bold text-[#111827]">Composición final</h3><div className="mt-2 flex flex-wrap gap-2"><span className="rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700">{selectedModeLabel}</span><span className="max-w-full truncate rounded-full bg-gray-100 px-4 py-2 text-sm text-gray-700">{selectedContentLabel}</span><span className="rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700">{selectedView === 'front' ? 'Editando frente' : 'Editando espalda'}</span></div><p className="mt-2 text-xs text-gray-500">Tamaño {formatTransferSize(selectedTransferSizeCode)} · Logo {logoOptionLabel(logoPlacementCode)}</p></div><div className="mt-3 flex w-full flex-col justify-between border-t border-gray-100 pt-3 lg:mt-0 lg:w-[250px] lg:flex-none lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0"><div><p className="text-sm text-gray-500">Total estimado</p><h3 className="text-3xl font-bold text-[#111827]">{formatMoney(price)}</h3><p className="mt-1 break-all text-xs text-gray-500">{configurationCode || 'Configuración pendiente'}</p>{stockValidationMessage ? <p className={`mt-1 text-xs ${hasResolvedConfiguration && !isValid ? 'text-red-500' : 'text-amber-600'}`}>{stockValidationMessage}</p> : null}</div>{session ? <><button disabled={customizerActionDisabled} onClick={() => void addToCart()} className="mt-3 w-full rounded-xl bg-[#111827] p-3 font-bold text-white disabled:opacity-50">{saving ? 'Guardando...' : 'Comprar ahora'}</button>{customizerDisabledReason ? <p className="mt-2 text-xs text-amber-700">{customizerDisabledReason}</p> : null}</> : null}{saveError && <p className="mt-2 text-sm text-rose-600">{saveError}</p>}</div></div>
    </section>
  );
}
