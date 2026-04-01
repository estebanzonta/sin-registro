import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { ChevronLeft, ChevronRight, ShoppingCart, UploadCloud } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import type { AppSession } from '../App';
import StorefrontTopBar from '../storefront/StorefrontTopBar';

type Screen = 'category' | 'product' | 'selection' | 'customizer';
type AuthMode = 'login' | 'register';
type CustomMode = 'brand_design' | 'user_upload';
type UploadMode = 'photo_simple' | 'photo_collage' | 'pets';
type ProductSizeOption = { sizeId: string; size: { id: string; name: string } };
type ProductColorOption = { colorId: string; color: { id: string; name: string; hex: string }; frontMockupUrl?: string; backMockupUrl?: string };
type Product = { id: string; name: string; slug: string; description?: string; basePrice: number; frontMockupUrl?: string; backMockupUrl?: string; sizes?: ProductSizeOption[]; colors?: ProductColorOption[]; printAreas?: Array<{ placement: { code: string } }> };
type SizePriceOption = { id: string; sizeCode: string; extraPrice: number };
type Design = { id: string; name: string; code: string; imageUrl: string; designCategoryId?: string; transferSizes?: SizePriceOption[]; placements?: Array<{ placement: { code: string } }> };
type UploadTemplate = { id: string; code: string; name: string; customizationType?: UploadMode; requiredImageCount: number; allowsText?: boolean; textLabel?: string; placement?: { code: string }; sizeOptions?: SizePriceOption[] };
type Catalog = { categories: Array<{ id: string; name: string; garmentModels?: Product[] }>; designCategories?: Array<{ id: string; name: string; code: string }>; collections: Array<{ id: string; name: string; designs?: Design[] }>; uploadTemplates: UploadTemplate[] };
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

function formatMoney(value: number) {
  return `$${value.toLocaleString('es-AR')}`;
}

function logoPositionStyle(code: string): React.CSSProperties {
  if (code === 'LF') return { left: '50%', top: '33%', transform: 'translateX(-50%)' };
  if (code === 'LC') return { left: '50%', top: '17%', transform: 'translateX(-50%)' };
  return { right: '18%', top: '34%' };
}

function logoOptionLabel(code: string, name?: string) {
  if (name) return name;
  if (code === 'LF') return 'Frente medio';
  if (code === 'LC') return 'Cuello espalda';
  if (code === 'IBR') return 'Manga';
  return code;
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

function readApiError(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message || error.response?.data?.error;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }

  return error instanceof Error ? error.message : fallback;
}

function AuthPanel({ mode, loading, error, email, password, setEmail, setPassword, onSubmit, onModeChange }: { mode: AuthMode; loading: boolean; error: string | null; email: string; password: string; setEmail: (value: string) => void; setPassword: (value: string) => void; onSubmit: () => Promise<void>; onModeChange: (mode: AuthMode) => void }) {
  return (
    <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
      <div className="mb-3 flex gap-2">
        <button onClick={() => onModeChange('login')} className={`rounded-full px-4 py-2 text-sm ${mode === 'login' ? 'bg-gray-900 text-white' : 'border bg-white'}`}>Ingresar</button>
        <button onClick={() => onModeChange('register')} className={`rounded-full px-4 py-2 text-sm ${mode === 'register' ? 'bg-gray-900 text-white' : 'border bg-white'}`}>Crear cuenta</button>
      </div>
      <div className="space-y-3">
        <input className="w-full rounded-xl border bg-white px-4 py-3 text-sm" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="tu@email.com" />
        <input className="w-full rounded-xl border bg-white px-4 py-3 text-sm" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" />
      </div>
      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
      <button onClick={() => void onSubmit()} disabled={loading} className="mt-3 w-full rounded-xl bg-gray-900 p-3 font-bold text-white disabled:opacity-50">{loading ? 'Procesando...' : mode === 'login' ? 'Ingresar y guardar' : 'Crear cuenta y guardar'}</button>
    </div>
  );
}

export default function CustomizerApp({ session, onCartCountChange, onSessionChange }: { session: AppSession | null; onCartCountChange: (count: number) => void; onSessionChange: (session: AppSession | null) => void }) {
  const navigate = useNavigate();
  const printAreaRef = useRef<HTMLDivElement | null>(null);
  const [screen, setScreen] = useState<Screen>('category');
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
  const [configurationCode, setConfigurationCode] = useState('');
  const [allowedLogoPlacements, setAllowedLogoPlacements] = useState<Array<{ code: string; name: string }>>([]);
  const [logoPlacementCode, setLogoPlacementCode] = useState('LC');
  const [logoAutoNotice, setLogoAutoNotice] = useState<string | null>(null);
  const [uploadedAssets, setUploadedAssets] = useState<UploadedAsset[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [customText, setCustomText] = useState('');
  const [layoutPosition, setLayoutPosition] = useState({ x: 50, y: 50 });
  const [cartCount, setCartCount] = useState(0);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    axios.get<Catalog>('/api/catalog/init').then((response) => {
      setInitData(response.data);
      const firstModel = response.data.categories.flatMap((item) => item.garmentModels || []).find((item) => (item.printAreas || []).length > 0) || response.data.categories.flatMap((item) => item.garmentModels || [])[0];
      if (firstModel) {
        setSelectedProduct(firstModel);
        setSelectedSizeId(firstModel.sizes?.[0]?.sizeId || '');
        setSelectedColorId(firstModel.colors?.[0]?.colorId || '');
      }
      const firstDesign = response.data.collections.flatMap((item) => item.designs || [])[0];
      if (firstDesign) setSelectedDesignId(firstDesign.id);
      const firstTemplate = response.data.uploadTemplates?.[0];
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
  const designs = useMemo(() => (initData?.collections || []).flatMap((collection) => collection.designs || []), [initData]);
  const filteredDesigns = useMemo(() => designs.filter((item) => {
    const hasPlacementRules = (item.placements || []).length > 0;
    const matchesPlacement = !hasPlacementRules || (item.placements || []).some((placement) => placement.placement.code === (selectedView === 'front' ? 'FRONT' : 'BACK'));
    const matchesCategory = selectedCategoryId === 'all' || item.designCategoryId === selectedCategoryId;
    return matchesPlacement && matchesCategory;
  }), [designs, selectedView, selectedCategoryId]);
  const selectedDesign = filteredDesigns.find((item) => item.id === selectedDesignId) || designs.find((item) => item.id === selectedDesignId) || null;
  const uploadTemplates = useMemo(() => initData?.uploadTemplates || [], [initData]);
  const filteredUploadTemplates = useMemo(() => uploadTemplates.filter((item) => (item.customizationType || 'photo_simple') === selectedUploadMode), [uploadTemplates, selectedUploadMode]);
  const selectedTemplate = filteredUploadTemplates.find((item) => item.id === selectedTemplateId) || filteredUploadTemplates[0] || null;
  const transferSizeOptions = customMode === 'brand_design' ? selectedDesign?.transferSizes || [] : selectedTemplate?.sizeOptions || [];
  const selectedColorOption = selectedProduct?.colors?.find((item) => item.colorId === selectedColorId) || null;
  const currentColor = selectedColorOption?.color.name.toLowerCase() || 'white';
  const currentImage = resolveMockupImage(selectedProduct, currentColor, selectedView, selectedColorOption);
  const requiredAssetCount = customMode === 'user_upload' ? selectedTemplate?.requiredImageCount || 0 : 0;
  const printScaleClass = selectedTransferSizeCode === 'grande' ? 'w-[62%]' : selectedTransferSizeCode === 'chico' ? 'w-[28%]' : 'w-[42%]';
  const selectedModeLabel = customMode === 'brand_design' ? 'Diseño de la marca' : 'Personalizado';
  const selectedContentLabel = customMode === 'brand_design' ? (selectedDesign ? `${selectedDesign.code} · ${selectedDesign.name}` : 'Elegí una estampa') : (selectedTemplate ? `${selectedTemplate.code} · ${selectedTemplate.name}` : 'Elegí una plantilla');
  const visibleLogoOptions = allowedLogoPlacements.length ? allowedLogoPlacements : [...FALLBACK_LOGO_OPTIONS[selectedView]];

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
    if (customMode === 'user_upload' && selectedTemplate?.placement?.code) setSelectedView(selectedTemplate.placement.code === 'BACK' ? 'back' : 'front');
  }, [customMode, selectedTemplate]);

  useEffect(() => {
    const fallbackOptions = FALLBACK_LOGO_OPTIONS[selectedView];
    if (!fallbackOptions.some((item) => item.code === logoPlacementCode)) {
      setLogoPlacementCode(fallbackOptions[0].code);
      setLogoAutoNotice('Movimos el logo automáticamente porque no puede compartir la misma cara con la estampa.');
    }
  }, [selectedView, logoPlacementCode]);

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
    if (!selectedProduct || !selectedSizeId || !selectedColorId || (customMode === 'brand_design' && !selectedDesignId) || (customMode === 'user_upload' && !selectedTemplateId)) {
      setPrice(0); setBasePrice(0); setTransferExtraPrice(0); setIsValid(false); setConfigurationCode(''); return;
    }
    axios.post<Config>('/api/configurator/resolve', {
      customizationMode: customMode,
      garmentModelId: selectedProduct.id,
      sizeId: selectedSizeId,
      colorId: selectedColorId,
      printPlacementCode: selectedView === 'front' ? 'FRONT' : 'BACK',
      logoPlacementCode,
      designId: customMode === 'brand_design' ? selectedDesignId : undefined,
      uploadTemplateId: customMode === 'user_upload' ? selectedTemplateId : undefined,
      transferSizeCode: selectedTransferSizeCode,
    }).then((response) => {
      setPrice(response.data.price);
      setBasePrice(response.data.basePrice || 0);
      setTransferExtraPrice(response.data.extraPrice || 0);
      setIsValid(response.data.valid);
      setConfigurationCode(response.data.configurationCode);
      setAllowedLogoPlacements(response.data.allowedLogoPlacements || []);
      if (!response.data.allowedLogoPlacements.some((item) => item.code === logoPlacementCode)) setLogoPlacementCode(response.data.allowedLogoPlacements[0]?.code || logoPlacementCode);
    }).catch(() => {
      setPrice(selectedProduct.basePrice);
      setBasePrice(selectedProduct.basePrice);
      const fallbackSelectedSize = transferSizeOptions.find((item) => item.sizeCode === selectedTransferSizeCode);
      setTransferExtraPrice(fallbackSelectedSize?.extraPrice || 0);
      setIsValid(false);
      setAllowedLogoPlacements([]);
    });
  }, [selectedProduct, selectedSizeId, selectedColorId, selectedDesignId, selectedTemplateId, selectedView, logoPlacementCode, customMode, selectedTransferSizeCode, transferSizeOptions]);

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setUploadError(null);
    try {
      if (files.length < requiredAssetCount) throw new Error(`Debes subir ${requiredAssetCount} imagen${requiredAssetCount > 1 ? 'es' : ''} para esta plantilla.`);
      const nextAssets: UploadedAsset[] = [];
      for (const file of files.slice(0, requiredAssetCount)) {
        if (!PHOTO_RULES.allowed.includes(file.type)) throw new Error('Formato inválido');
        const asset = await toAsset(file);
        if (asset.width < PHOTO_RULES.minWidth || asset.height < PHOTO_RULES.minHeight) throw new Error('Calidad insuficiente');
        nextAssets.push(asset);
      }
      setUploadedAssets(nextAssets);
    } catch (error) {
      setUploadedAssets([]);
      setUploadError(error instanceof Error ? error.message : 'No se pudo cargar la imagen');
    }
  }

  async function submitAuth() {
    setAuthLoading(true); setAuthError(null);
    try {
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const response = await axios.post(endpoint, { email: authEmail, password: authPassword });
      const nextSession = response.data as AppSession;
      if (nextSession.user?.role !== 'customer') {
        throw new Error('Usá el acceso admin para cuentas de administración.');
      }
      onSessionChange(nextSession);
    } catch (error) {
      setAuthError(readApiError(error, 'No se pudo autenticar'));
    } finally { setAuthLoading(false); }
  }

  async function addToCart() {
    if (!session || !selectedProduct || !selectedSizeId || !selectedColorId) return;
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
        uploadTemplateId: customMode === 'user_upload' ? selectedTemplateId : undefined,
        transferSizeCode: selectedTransferSizeCode,
        customAssetUrlsJson: customMode === 'user_upload' && uploadedAssets.length ? JSON.stringify({ assets: uploadedAssets, text: customText || undefined }) : undefined,
        quantity: 1,
      });
      setCartCount(response.data.totalItems || 0);
      onCartCountChange(response.data.totalItems || 0);
      navigate('/cart');
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'No se pudo guardar en el carrito');
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

  function renderBrandDesignPicker() {
    return (
      <div className="mt-6 grid gap-6 lg:grid-cols-[0.7fr_1.3fr]">
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">Categorías</h3>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setSelectedCategoryId('all')} className={`rounded-full border px-4 py-2 text-sm ${selectedCategoryId === 'all' ? 'border-gray-900 bg-gray-900 text-white' : 'bg-white'}`}>Todas</button>
            {(initData?.designCategories || []).map((item) => <button key={item.id} onClick={() => setSelectedCategoryId(item.id)} className={`rounded-full border px-4 py-2 text-sm ${selectedCategoryId === item.id ? 'border-gray-900 bg-gray-900 text-white' : 'bg-white'}`}>{item.name}</button>)}
          </div>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">Estampas</h3>
          {!filteredDesigns.length ? (
            <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
              <p className="text-sm font-semibold text-gray-700">No hay diseños visibles para este filtro.</p>
              <p className="mt-2 text-sm text-gray-500">Probá con otra categoría o cargá una estampa desde el admin.</p>
            </div>
          ) : (
            <div className="rounded-[32px] border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => cycleDesign('prev')} className="flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm">
                  <ChevronLeft size={20} />
                </button>
                <button type="button" onClick={() => selectedDesign && setSelectedDesignId(selectedDesign.id)} className="group flex min-w-0 flex-1 overflow-hidden rounded-[28px] border border-gray-200 bg-white text-left shadow-sm">
                  <div className="flex h-64 w-full items-center justify-center bg-[linear-gradient(135deg,#f8fafc,#e5e7eb)] p-6">
                    {selectedDesign ? <img src={selectedDesign.imageUrl} alt={selectedDesign.name} className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-[1.02]" /> : null}
                  </div>
                </button>
                <button type="button" onClick={() => cycleDesign('next')} className="flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm">
                  <ChevronRight size={20} />
                </button>
              </div>
              {selectedDesign ? (
                <div className="mt-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.24em] text-gray-500">{selectedDesign.code}</p>
                    <p className="mt-2 text-lg font-semibold text-gray-900">{selectedDesign.name}</p>
                  </div>
                  <p className="text-sm text-gray-500">{filteredDesigns.findIndex((item) => item.id === selectedDesign.id) + 1} / {filteredDesigns.length}</p>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (screen === 'category') {
    return (
      <section className="flex min-h-screen flex-col items-center justify-center bg-[#113f27] p-8 text-white">
        <div className="mb-12 text-center"><h1 className="mb-2 text-5xl font-extrabold">Sin Registro</h1><p className="opacity-80">Elegí qué querés personalizar hoy</p></div>
        <div className="flex w-full max-w-2xl gap-8"><button onClick={() => setScreen('product')} className="flex h-48 flex-1 items-center justify-center rounded-2xl border border-white/40 bg-white/5 text-2xl tracking-widest text-[#3b82f6]">INDUMENTARIA</button><button className="flex h-48 flex-1 cursor-not-allowed items-center justify-center rounded-2xl border border-white/40 bg-white/5 text-2xl tracking-widest text-[#3b82f6] opacity-40">ACCESORIOS</button></div>
        <div className="absolute right-4 top-4">
          <StorefrontTopBar session={session} onLogout={() => onSessionChange(null)} cartCount={cartCount} tone="dark" />
        </div>
      </section>
    );
  }

  if (screen === 'product') {
    return (
      <section className="relative flex h-screen flex-col overflow-hidden bg-[#113f27]">
        <header className="absolute top-0 z-10 flex w-full justify-between p-6"><button onClick={() => setScreen('category')} className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/90 shadow-lg"><ChevronLeft /></button><Link to="/cart" className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/90 shadow-lg"><ShoppingCart /></Link></header>
        <div className="flex flex-1 items-center justify-center pb-[45vh]"><img src={currentImage} alt="Model" className="max-h-[50vh] max-w-[90%] translate-y-8 object-contain drop-shadow-2xl" /></div>
        <div className="absolute bottom-0 left-1/2 z-20 flex h-[44vh] w-full max-w-[600px] -translate-x-1/2 flex-col rounded-t-[40px] bg-white px-6 pb-6 pt-16 shadow-[0_-10px_40px_rgba(0,0,0,0.2)]"><h2 className="text-2xl font-extrabold text-[#111827]">{selectedProduct?.name || 'REMERA OVERSIZE'}</h2><p className="mt-3 flex-1 text-sm text-gray-500">{selectedProduct?.description || 'Remera de corte amplio y relajado.'}</p><div className="mb-4"><h3 className="mb-3 font-semibold text-[#111827]">Talles disponibles</h3><div className="flex gap-3">{(selectedProduct?.sizes || []).map((item) => <button key={item.sizeId} onClick={() => setSelectedSizeId(item.sizeId)} className={`rounded-full border px-5 py-2 font-semibold ${selectedSizeId === item.sizeId ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-800'}`}>{item.size.name}</button>)}</div></div><button disabled={!selectedSizeId} onClick={() => setScreen('selection')} className="w-full rounded-full bg-[#111827] p-4 font-bold text-white disabled:opacity-50">Continuar</button></div>
      </section>
    );
  }

  if (screen === 'selection') {
    return (
      <section className="relative flex min-h-screen flex-col overflow-hidden bg-[#113f27]">
        <header className="absolute top-0 z-10 flex w-full justify-between p-6"><button onClick={() => setScreen('product')} className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/90 shadow-lg"><ChevronLeft /></button><Link to="/cart" className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/90 shadow-lg"><ShoppingCart /></Link></header>
        <div className="flex flex-1 items-center justify-center px-4 pb-10 pt-28"><div className="w-full max-w-5xl rounded-[36px] bg-white p-6 shadow-[0_24px_60px_rgba(0,0,0,0.22)] lg:p-8"><h2 className="text-3xl font-extrabold text-[#111827]">Elegí el contenido a estampar</h2><p className="mt-2 text-sm text-gray-500">Definimos modo, plantilla o estampa antes de pasar al mockup.</p><div className="mt-6 flex flex-wrap gap-3"><button onClick={() => setCustomMode('brand_design')} className={`rounded-full px-5 py-3 text-sm font-semibold ${customMode === 'brand_design' ? 'bg-[#111827] text-white' : 'border bg-white text-gray-700'}`}>Diseño de la marca</button><button onClick={() => setCustomMode('user_upload')} className={`rounded-full px-5 py-3 text-sm font-semibold ${customMode === 'user_upload' ? 'bg-[#111827] text-white' : 'border bg-white text-gray-700'}`}>Personalizado</button></div>{customMode === 'brand_design' ? renderBrandDesignPicker() : <div className="mt-6 space-y-6"><div><h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">Tipo de personalizado</h3><div className="flex flex-wrap gap-2">{(['photo_simple', 'photo_collage', 'pets'] as UploadMode[]).map((mode) => <button key={mode} onClick={() => setSelectedUploadMode(mode)} className={`rounded-full px-4 py-2 text-sm font-semibold ${selectedUploadMode === mode ? 'bg-gray-900 text-white' : 'border bg-white text-gray-700'}`}>{uploadModeLabel(mode)}</button>)}</div></div><div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]"><div><h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">Plantillas</h3><div className="grid gap-3 sm:grid-cols-2">{filteredUploadTemplates.map((item) => <button key={item.id} onClick={() => { setSelectedTemplateId(item.id); setUploadedAssets([]); setUploadError(null); }} className={`rounded-2xl border p-4 text-left ${selectedTemplateId === item.id ? 'border-gray-900 bg-gray-900 text-white' : 'bg-gray-50'}`}><p className="text-xs font-bold uppercase tracking-[0.24em]">{item.code}</p><p className="mt-2 text-base font-semibold">{item.name}</p><p className={`mt-2 text-sm ${selectedTemplateId === item.id ? 'text-white/70' : 'text-gray-500'}`}>{item.requiredImageCount} foto{item.requiredImageCount > 1 ? 's' : ''}</p></button>)}</div></div><div><h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">Archivos</h3><label className="flex min-h-44 cursor-pointer items-center justify-center rounded-3xl border-2 border-dashed border-gray-200 bg-gray-50 text-gray-400"><div className="text-center"><UploadCloud size={36} className="mx-auto" /><p className="mt-3 text-sm font-medium text-gray-700">Subí tus imágenes</p><p className="mt-1 text-xs text-gray-500">PNG, JPG o WEBP. Requeridas: {requiredAssetCount || 1}</p></div><input type="file" multiple={(requiredAssetCount || 1) > 1} className="hidden" onChange={handleFileUpload} /></label>{uploadError && <p className="mt-2 text-sm text-rose-600">{uploadError}</p>}{uploadedAssets.length ? <p className="mt-2 text-sm text-gray-600">{uploadedAssets.length} archivo(s) listos.</p> : null}{selectedTemplate?.allowsText ? <input className="mt-4 w-full rounded-xl border border-gray-200 bg-gray-50 p-3" value={customText} onChange={(event) => setCustomText(event.target.value)} placeholder={selectedTemplate.textLabel || 'Texto'} /> : null}</div></div></div>}<div className="mt-8 flex items-center justify-between gap-4 border-t border-gray-100 pt-6"><div className="text-sm text-gray-500">{customMode === 'brand_design' ? (selectedDesign ? `Seleccionado: ${selectedDesign.name}` : 'Elegí una estampa para continuar.') : uploadedAssets.length >= requiredAssetCount && requiredAssetCount > 0 ? `Archivos listos: ${uploadedAssets.length}` : `Subí ${requiredAssetCount || 1} archivo(s) para continuar.`}</div><button disabled={(customMode === 'brand_design' && !selectedDesignId) || (customMode === 'user_upload' && uploadedAssets.length < requiredAssetCount)} onClick={() => setScreen('customizer')} className="rounded-full bg-[#111827] px-6 py-3 font-bold text-white disabled:opacity-50">Ir al mockup</button></div></div></div>
      </section>
    );
  }
  return (
    <section className="relative flex min-h-screen flex-col overflow-hidden bg-[#113f27] lg:h-screen">
      <header className="absolute left-4 top-4 z-50 flex items-center gap-4 lg:left-6 lg:top-6"><button onClick={() => setScreen('selection')} className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/90 shadow-lg"><ChevronLeft /></button><div><h1 className="text-2xl font-bold text-white">Personalizar</h1><p className="text-sm text-white/70">{selectedProduct?.name}</p></div></header>
      <aside className="absolute right-4 top-4 z-50 lg:right-6 lg:top-6">
        <StorefrontTopBar session={session} onLogout={() => onSessionChange(null)} cartCount={cartCount} tone="dark" />
      </aside>
      <aside className="absolute left-4 top-28 z-40 hidden w-[200px] flex-col gap-3 lg:flex"><div className="rounded-3xl border border-white/20 bg-white/12 p-4 backdrop-blur-md"><p className="text-xs uppercase tracking-[0.2em] text-white/70">Selección</p><p className="mt-3 text-sm font-semibold text-white">{selectedModeLabel}</p><p className="mt-1 text-sm text-white/70 line-clamp-2">{selectedContentLabel}</p></div><div className="rounded-3xl border border-white/20 bg-white/12 p-4 backdrop-blur-md"><p className="text-xs uppercase tracking-[0.2em] text-white/70">Tamaño</p><div className="mt-3 flex flex-col gap-2">{transferSizeOptions.map((item) => <button key={item.id} onClick={() => setSelectedTransferSizeCode(item.sizeCode)} className={`rounded-2xl px-4 py-3 text-left text-sm font-semibold ${selectedTransferSizeCode === item.sizeCode ? 'bg-white text-[#113f27]' : 'bg-white/10 text-white'}`}>{formatTransferSize(item.sizeCode)}</button>)}</div></div><div className="rounded-3xl border border-white/20 bg-white/12 p-4 backdrop-blur-md"><p className="text-xs uppercase tracking-[0.2em] text-white/70">Logo</p><p className="mt-2 text-xs text-white/70">Elegí una ubicación compatible.</p>{logoAutoNotice ? <p className="mt-3 rounded-2xl bg-white/12 px-3 py-2 text-xs leading-5 text-white">{logoAutoNotice}</p> : null}<div className="mt-3 flex flex-col gap-2">{visibleLogoOptions.map((item) => <button key={item.code} onClick={() => setLogoPlacementCode(item.code)} className={`rounded-2xl px-4 py-3 text-left text-sm font-semibold ${logoPlacementCode === item.code ? 'bg-white text-[#113f27]' : 'bg-white/10 text-white'}`}>{logoOptionLabel(item.code, item.name)}</button>)}</div></div></aside>
      <main className="relative z-10 flex flex-1 items-start justify-center px-4 pb-[28rem] pt-24 sm:pb-[25rem] lg:pb-[10rem] lg:pt-20"><div className="relative flex h-[330px] w-[330px] max-w-[88vw] items-center justify-center lg:-mt-2 lg:h-[500px] lg:w-[500px]"><img src={currentImage} className="absolute inset-0 h-full w-full object-contain" alt="T-Shirt" /><div className="absolute z-20 rounded-full bg-white px-2 py-1 text-[10px] font-black tracking-[0.18em] text-[#113f27] shadow" style={logoPositionStyle(logoPlacementCode)}>{logoOptionLabel(logoPlacementCode)}</div><div ref={printAreaRef} className="absolute left-[30%] top-[25%] z-20 h-[50%] w-[40%] overflow-hidden border-2 border-dashed border-black/10">{customMode === 'user_upload' ? uploadedAssets[0] ? <><img src={uploadedAssets[0].previewUrl} className={`absolute cursor-grab object-contain ${printScaleClass}`} alt="Upload" onPointerDown={startDrag} style={{ left: `${layoutPosition.x}%`, top: `${layoutPosition.y}%`, transform: 'translate(-50%, -50%)' }} />{uploadedAssets.length > 1 ? <div className="absolute bottom-2 right-2 rounded-full bg-white px-2 py-1 text-[10px] font-bold text-[#113f27]">+{uploadedAssets.length - 1}</div> : null}</> : null : selectedDesign ? <div onPointerDown={startDrag} className={`absolute cursor-grab ${printScaleClass}`} style={{ left: `${layoutPosition.x}%`, top: `${layoutPosition.y}%`, transform: 'translate(-50%, -50%)' }}><img src={selectedDesign.imageUrl} alt={selectedDesign.name} className="max-h-full max-w-full object-contain drop-shadow-md" /><div className="pointer-events-none absolute -bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-white/92 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#113f27] shadow">{selectedDesign.code}</div></div> : null}</div></div></main>
      <aside className="absolute right-4 top-[45%] z-50 hidden -translate-y-[80%] flex-col gap-6 lg:right-6 lg:flex">{customMode === 'brand_design' ? <div className="flex flex-col gap-1 rounded-3xl border border-white/30 bg-white/15 p-2 shadow-xl backdrop-blur-md"><button onClick={() => setSelectedView('front')} className={`rounded-xl px-2 py-4 text-sm font-semibold ${selectedView === 'front' ? 'bg-white text-[#113f27]' : 'text-white/60'}`} style={{ writingMode: 'vertical-rl' }}>Frente</button><button onClick={() => setSelectedView('back')} className={`rounded-xl px-2 py-4 text-sm font-semibold ${selectedView === 'back' ? 'bg-white text-[#113f27]' : 'text-white/60'}`} style={{ writingMode: 'vertical-rl' }}>Espalda</button></div> : <div className="rounded-3xl border border-white/30 bg-white/15 px-4 py-6 text-center text-sm font-semibold text-white shadow-xl backdrop-blur-md">{selectedTemplate?.placement?.code === 'BACK' ? 'Espalda' : 'Frente'}</div>}<div className="flex flex-col gap-2 rounded-full border border-white/30 bg-white/15 p-2 shadow-xl backdrop-blur-md">{(selectedProduct?.colors || []).slice(0, 4).map((item) => <button key={item.colorId} onClick={() => setSelectedColorId(item.colorId)} className={`h-11 w-11 rounded-full ${selectedColorId === item.colorId ? 'ring-4 ring-white' : ''}`} style={{ backgroundColor: item.color.hex || '#ffffff' }} />)}</div></aside>
      <div className="absolute bottom-[11.25rem] left-4 right-4 z-30 space-y-3 lg:hidden"><div className="rounded-3xl border border-white/20 bg-white/12 p-4 backdrop-blur-md">{customMode === 'brand_design' ? <><p className="text-xs uppercase tracking-[0.2em] text-white/70">Vista</p><div className="mt-3 flex gap-2"><button onClick={() => setSelectedView('front')} className={`rounded-full px-4 py-2 text-sm font-semibold ${selectedView === 'front' ? 'bg-white text-[#113f27]' : 'bg-white/10 text-white'}`}>Frente</button><button onClick={() => setSelectedView('back')} className={`rounded-full px-4 py-2 text-sm font-semibold ${selectedView === 'back' ? 'bg-white text-[#113f27]' : 'bg-white/10 text-white'}`}>Espalda</button></div></> : <p className="text-sm font-semibold text-white">{selectedTemplate?.placement?.code === 'BACK' ? 'Vista espalda' : 'Vista frente'}</p>}</div><div className="rounded-3xl border border-white/20 bg-white/12 p-4 backdrop-blur-md"><p className="text-xs uppercase tracking-[0.2em] text-white/70">Color</p><div className="mt-3 flex flex-wrap gap-3">{(selectedProduct?.colors || []).slice(0, 4).map((item) => <button key={item.colorId} onClick={() => setSelectedColorId(item.colorId)} className={`h-10 w-10 rounded-full ${selectedColorId === item.colorId ? 'ring-4 ring-white' : ''}`} style={{ backgroundColor: item.color.hex || '#ffffff' }} aria-label={item.color.name} />)}</div></div><div className="rounded-3xl border border-white/20 bg-white/12 p-4 backdrop-blur-md"><p className="text-xs uppercase tracking-[0.2em] text-white/70">Tamaño</p><div className="mt-3 flex flex-wrap gap-2">{transferSizeOptions.map((item) => <button key={item.id} onClick={() => setSelectedTransferSizeCode(item.sizeCode)} className={`rounded-full px-4 py-2 text-sm font-semibold ${selectedTransferSizeCode === item.sizeCode ? 'bg-white text-[#113f27]' : 'bg-white/10 text-white'}`}>{formatTransferSize(item.sizeCode)}</button>)}</div></div><div className="rounded-3xl border border-white/20 bg-white/12 p-4 backdrop-blur-md"><p className="text-xs uppercase tracking-[0.2em] text-white/70">Logo</p>{logoAutoNotice ? <p className="mt-2 rounded-2xl bg-white/12 px-3 py-2 text-xs leading-5 text-white">{logoAutoNotice}</p> : null}<div className="mt-3 flex flex-wrap gap-2">{visibleLogoOptions.map((item) => <button key={item.code} onClick={() => setLogoPlacementCode(item.code)} className={`rounded-full px-4 py-2 text-sm font-semibold ${logoPlacementCode === item.code ? 'bg-white text-[#113f27]' : 'bg-white/10 text-white'}`}>{logoOptionLabel(item.code, item.name)}</button>)}</div></div></div>
      <div className="relative z-30 mt-auto flex w-full max-w-[760px] flex-col overflow-hidden rounded-t-[34px] bg-white px-5 py-4 shadow-[0_-10px_40px_rgba(0,0,0,0.2)] lg:absolute lg:bottom-0 lg:left-1/2 lg:w-[92vw] lg:max-w-[760px] lg:-translate-x-1/2 lg:flex-row lg:rounded-t-[40px] lg:px-6 lg:py-4"><div className="min-w-0 flex flex-1 flex-col justify-center pr-0 lg:pr-6"><h3 className="mb-1 text-lg font-bold text-[#111827]">Composición final</h3><div className="mt-3 flex flex-wrap gap-2"><span className="rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700">{selectedModeLabel}</span><span className="rounded-full bg-gray-100 px-4 py-2 text-sm text-gray-700 max-w-full truncate">{selectedContentLabel}</span></div><p className="mt-3 text-xs text-gray-500">Tamaño {formatTransferSize(selectedTransferSizeCode)} · Logo {logoOptionLabel(logoPlacementCode)}</p></div><div className="mt-4 flex w-full flex-col justify-between border-t border-gray-100 pt-4 lg:mt-0 lg:w-[250px] lg:flex-none lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0"><div><p className="text-sm text-gray-500">Total estimado</p><h3 className="text-3xl font-bold text-[#111827]">{formatMoney(price)}</h3><p className="mt-1 break-all text-xs text-gray-500">{configurationCode || 'Configuración pendiente'}</p>{!isValid && <p className="mt-1 text-xs text-red-500">Configuración aún no válida</p>}</div>{!session ? <><AuthPanel mode={authMode} loading={authLoading} error={authError} email={authEmail} password={authPassword} setEmail={setAuthEmail} setPassword={setAuthPassword} onSubmit={submitAuth} onModeChange={setAuthMode} /><Link to="/auth?redirect=/cart" className="mt-3 inline-flex justify-center rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700">Abrir acceso completo</Link></> : <button disabled={!isValid || saving || (customMode === 'user_upload' && uploadedAssets.length < requiredAssetCount)} onClick={() => void addToCart()} className="mt-4 w-full rounded-xl bg-[#111827] p-4 font-bold text-white disabled:opacity-50">{saving ? 'Guardando...' : 'Comprar ahora'}</button>}{saveError && <p className="mt-2 text-sm text-rose-600">{saveError}</p>}</div></div>
    </section>
  );
}
