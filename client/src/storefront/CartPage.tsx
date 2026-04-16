import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import type { AppSession } from '../App';
import StorefrontTopBar from './StorefrontTopBar';
import { isAuthError, readFriendlyApiError } from '../lib/apiErrors';

type CartItem = {
  id: string;
  customizationMode: 'brand_design' | 'user_upload';
  garmentModelId: string;
  colorId: string;
  sizeId: string;
  printPlacementCode: string;
  logoPlacementCode: string;
  designId?: string;
  uploadTemplateId?: string;
  transferSizeCode: string;
  configurationCode: string;
  unitPrice: number;
  quantity: number;
  customAssetUrlsJson?: string;
  layoutSnapshotJson?: string;
  configurationSnapshotJson?: string;
};

type UploadedAsset = {
  id: string;
  name: string;
  width: number;
  height: number;
  previewUrl: string;
};

type UploadedCustomizationPayload =
  | UploadedAsset[]
  | {
      assets: UploadedAsset[];
      text?: string;
    };

type CartResponse = {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
};

type Catalog = {
  categories: Array<{
    garmentModels?: Array<{
      id: string;
      name: string;
      colors?: Array<{ colorId: string; color: { id: string; name: string } }>;
      sizes?: Array<{ sizeId: string; size: { id: string; name: string } }>;
    }>;
  }>;
  collections: Array<{
    designs?: Array<{ id: string; name: string }>;
  }>;
  uploadTemplates: Array<{ id: string; name: string }>;
};

type OrderResponse = {
  id: string;
  totalPrice: number;
  status: string;
};

function parseJson<T>(value?: string | null): T | undefined {
  if (!value) return undefined;
  try {
    return JSON.parse(value) as T;
  } catch {
    return undefined;
  }
}

function normalizeCustomPayload(value?: string | null) {
  const parsed = parseJson<UploadedCustomizationPayload>(value);
  if (!parsed) return undefined;
  if (Array.isArray(parsed)) {
    return { assets: parsed, text: '' };
  }
  return { assets: parsed.assets || [], text: parsed.text || '' };
}

export default function CartPage({
  session,
  onSessionChange,
  onCartCountChange,
}: {
  session: AppSession | null;
  onSessionChange: (session: AppSession | null) => void;
  onCartCountChange: (count: number) => void;
}) {
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState(session?.user.email || '');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<OrderResponse | null>(null);

  useEffect(() => {
    setCustomerEmail(session?.user.email || '');
  }, [session]);

  useEffect(() => {
    if (!session) {
      setLoading(false);
      setCart(null);
      return;
    }

    setLoading(true);
    Promise.all([axios.get<CartResponse>('/api/cart'), axios.get<Catalog>('/api/catalog/init')])
      .then(([cartResponse, catalogResponse]) => {
        setCart(cartResponse.data);
        setCatalog(catalogResponse.data);
        onCartCountChange(cartResponse.data.totalItems || 0);
      })
      .catch((requestError) => {
        console.error(requestError);
        if (isAuthError(requestError)) {
          onSessionChange(null);
          setError('Tu sesión venció. Ingresá nuevamente para ver tu carrito.');
          return;
        }
        setError(readFriendlyApiError(requestError, 'No pudimos cargar el carrito.'));
      })
      .finally(() => setLoading(false));
  }, [session, onCartCountChange, onSessionChange]);

  const garmentMap = useMemo(
    () => new Map((catalog?.categories || []).flatMap((category) => (category.garmentModels || []).map((item) => [item.id, item]))),
    [catalog]
  );
  const designMap = useMemo(
    () => new Map((catalog?.collections || []).flatMap((collection) => (collection.designs || []).map((item) => [item.id, item.name]))),
    [catalog]
  );
  const templateMap = useMemo(() => new Map((catalog?.uploadTemplates || []).map((item) => [item.id, item.name])), [catalog]);
  const submitDisabledReason = !customerName.trim()
    ? 'Completá el nombre para confirmar el pedido.'
    : !customerEmail.trim()
      ? 'Completá el email para confirmar el pedido.'
      : null;

  async function removeItem(itemId: string) {
    if (!cart) return;
    const response = await axios.delete<CartResponse>(`/api/cart/items/${itemId}`);
    setCart(response.data);
    onCartCountChange(response.data.totalItems || 0);
  }

  async function submitOrder() {
    if (!cart || !customerName.trim() || !customerEmail.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      const response = await axios.post<OrderResponse>('/api/orders', {
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
      });
      setSuccess(response.data);
      setCart({ items: [], totalItems: 0, totalPrice: 0 });
      onCartCountChange(0);
    } catch (submitError) {
      console.error(submitError);
      if (isAuthError(submitError)) {
        onSessionChange(null);
      }
      setError(readFriendlyApiError(submitError, 'No se pudo crear el pedido.'));
    } finally {
      setSubmitting(false);
    }
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-stone-100 p-6 text-stone-900">
        <div className="mx-auto mb-6 flex max-w-4xl justify-end">
          <StorefrontTopBar session={session} onLogout={() => onSessionChange(null)} tone="light" />
        </div>
        <div className="mx-auto max-w-4xl rounded-3xl bg-white p-8">
          <h1 className="text-3xl font-semibold">Carrito</h1>
          <p className="mt-3 text-sm text-stone-600">Necesitás iniciar sesión para ver y confirmar tu carrito.</p>
          <Link to="/auth?redirect=/cart" className="mt-6 inline-flex rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-white">
            Ingresar o crear cuenta
          </Link>
          <Link to="/" className="mt-3 inline-flex rounded-full border px-5 py-3 text-sm font-medium text-stone-700">
            Volver al configurador
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-100 p-6 text-stone-900">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex justify-end">
          <StorefrontTopBar session={session} onLogout={() => onSessionChange(null)} tone="light" />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-stone-500">Checkout</p>
            <h1 className="text-3xl font-semibold">Carrito</h1>
          </div>
          <Link to="/" className="rounded-full border bg-white px-4 py-2 text-sm">
            Seguir comprando
          </Link>
        </div>

        {loading ? <div className="rounded-3xl bg-white p-8">Cargando carrito...</div> : null}
        {error ? <div className="rounded-3xl bg-white p-8 text-sm text-rose-600">{error}</div> : null}

        {success ? (
          <div className="rounded-3xl bg-white p-8">
            <h2 className="text-2xl font-semibold">Pedido creado</h2>
            <p className="mt-3 text-sm text-stone-600">Pedido {success.id} generado con estado {success.status}.</p>
            <p className="mt-2 text-sm text-stone-600">Total: ${success.totalPrice.toFixed(2)}</p>
            <Link to="/orders" className="mt-5 inline-flex rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-white">
              Ver mis pedidos
            </Link>
          </div>
        ) : null}

        {!loading && cart && cart.items.length === 0 && !success ? (
          <div className="rounded-3xl bg-white p-8">
            <p className="text-sm text-stone-600">No tenés productos en el carrito.</p>
          </div>
        ) : null}

        {!loading && cart && cart.items.length > 0 ? (
          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-4">
              {cart.items.map((item) => {
                const garment = garmentMap.get(item.garmentModelId);
                const colorName = garment?.colors?.find((color) => color.colorId === item.colorId)?.color.name || item.colorId;
                const sizeName = garment?.sizes?.find((size) => size.sizeId === item.sizeId)?.size.name || item.sizeId;
                const contentName = item.customizationMode === 'brand_design' ? designMap.get(item.designId || '') : templateMap.get(item.uploadTemplateId || '');
                const customPayload = normalizeCustomPayload(item.customAssetUrlsJson);

                return (
                  <div key={item.id} className="rounded-3xl bg-white p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-stone-500">{item.configurationCode}</p>
                        <h2 className="mt-2 text-xl font-semibold">{garment?.name || 'Prenda personalizada'}</h2>
                        <p className="mt-2 text-sm text-stone-600">{contentName || 'Configuración personalizada'}</p>
                        <div className="mt-4 grid gap-2 text-sm text-stone-600">
                          <p>Color: {colorName}</p>
                          <p>Talle: {sizeName}</p>
                          <p>Estampa: {item.printPlacementCode}</p>
                          <p>Logo: {item.logoPlacementCode}</p>
                          <p>Tamaño: {item.transferSizeCode}</p>
                          <p>Cantidad: {item.quantity}</p>
                          {customPayload?.assets?.length ? <p>Archivos: {customPayload.assets.length}</p> : null}
                          {customPayload?.text ? <p>Texto: {customPayload.text}</p> : null}
                        </div>
                        {customPayload?.assets?.length ? (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {customPayload.assets.slice(0, 4).map((asset) => (
                              <img key={asset.id} src={asset.previewUrl} alt={asset.name} className="h-16 w-16 rounded-xl border object-cover" />
                            ))}
                          </div>
                        ) : null}
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold">${(item.unitPrice * item.quantity).toFixed(2)}</p>
                        <button onClick={() => void removeItem(item.id)} className="mt-4 rounded-full border px-4 py-2 text-sm text-rose-600">
                          Quitar
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="rounded-3xl bg-white p-6">
              <h2 className="text-2xl font-semibold">Confirmar pedido</h2>
              <div className="mt-5 space-y-3">
                <input className="w-full rounded-2xl border bg-stone-50 px-4 py-3 text-sm" value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Nombre para el pedido" />
                <input className="w-full rounded-2xl border bg-stone-50 px-4 py-3 text-sm" value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} placeholder="Email" />
              </div>
              <div className="mt-5 rounded-2xl bg-stone-100 p-4 text-sm">
                <p>
                  <strong>Productos:</strong> {cart.totalItems}
                </p>
                <p className="mt-2">
                  <strong>Total:</strong> ${cart.totalPrice.toFixed(2)}
                </p>
              </div>
              <button
                onClick={() => void submitOrder()}
                disabled={submitting || Boolean(submitDisabledReason)}
                className="mt-5 w-full rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-white disabled:opacity-40"
              >
                {submitting ? 'Creando pedido...' : 'Confirmar pedido'}
              </button>
              {submitDisabledReason ? <p className="mt-2 text-xs text-amber-700">{submitDisabledReason}</p> : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
