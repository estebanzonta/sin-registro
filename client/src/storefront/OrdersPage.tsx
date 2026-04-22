import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { RefreshCw } from 'lucide-react';
import type { AppSession } from '../App';
import StorefrontTopBar from './StorefrontTopBar';
import { getCatalogInit } from '../lib/catalogCache';
import { isAuthError, readFriendlyApiError } from '../lib/apiErrors';

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

type OrderItem = {
  id: string;
  customizationMode: 'brand_design' | 'user_upload';
  configurationCode: string;
  designId?: string;
  uploadTemplateId?: string;
  customAssetUrlsJson?: string;
  transferSizeCode?: string;
  printPlacementCode?: string;
  logoPlacementCode?: string;
  unitPrice: number;
};

type Order = {
  id: string;
  customerName: string;
  customerEmail: string;
  totalPrice: number;
  status: string;
  createdAt: string;
  items: OrderItem[];
};

type OrdersResponse = {
  orders: Order[];
  total: number;
};

type Catalog = {
  collections: Array<{ designs?: Array<{ id: string; name: string }> }>;
  uploadTemplates: Array<{ id: string; name: string }>;
};

const ORDER_STATUS_META: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pendiente', className: 'bg-amber-100 text-amber-800' },
  confirmed: { label: 'Confirmado', className: 'bg-sky-100 text-sky-800' },
  processing: { label: 'En produccion', className: 'bg-violet-100 text-violet-800' },
  shipped: { label: 'Enviado', className: 'bg-indigo-100 text-indigo-800' },
  delivered: { label: 'Entregado', className: 'bg-emerald-100 text-emerald-800' },
  cancelled: { label: 'Cancelado', className: 'bg-rose-100 text-rose-800' },
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
  if (Array.isArray(parsed)) return { assets: parsed, text: '' };
  return { assets: parsed.assets || [], text: parsed.text || '' };
}

function readOrderStatusMeta(status: string) {
  return ORDER_STATUS_META[status] || {
    label: status,
    className: 'bg-stone-100 text-stone-700',
  };
}

export default function OrdersPage({
  session,
  onSessionChange,
}: {
  session: AppSession | null;
  onSessionChange: (session: AppSession | null) => void;
}) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadOrders() {
    if (!session) {
      setOrders([]);
      setCatalog(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [ordersResponse, catalogData] = await Promise.all([
        axios.get<OrdersResponse>('/api/orders/my-orders'),
        getCatalogInit<Catalog>(),
      ]);
      setOrders(ordersResponse.data.orders || []);
      setCatalog(catalogData);
    } catch (requestError) {
      if (isAuthError(requestError)) {
        onSessionChange(null);
        setError('Tu sesion vencio. Ingresa nuevamente para ver tus pedidos.');
        return;
      }

      setError(readFriendlyApiError(requestError, 'No pudimos cargar tus pedidos.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOrders();
  }, [session]);

  const designMap = useMemo(
    () => new Map((catalog?.collections || []).flatMap((collection) => (collection.designs || []).map((item) => [item.id, item.name]))),
    [catalog]
  );
  const templateMap = useMemo(() => new Map((catalog?.uploadTemplates || []).map((item) => [item.id, item.name])), [catalog]);
  const summary = useMemo(() => {
    return {
      totalOrders: orders.length,
      totalSpent: orders.reduce((sum, order) => sum + order.totalPrice, 0),
      activeOrders: orders.filter((order) => !['delivered', 'cancelled'].includes(order.status)).length,
    };
  }, [orders]);

  if (!session) {
    return (
      <div className="min-h-screen bg-stone-100 p-6 text-stone-900">
        <div className="mx-auto mb-6 flex max-w-5xl justify-end">
          <StorefrontTopBar session={session} onLogout={() => onSessionChange(null)} tone="light" showGuestAuthButton={false} />
        </div>
        <div className="mx-auto max-w-5xl rounded-3xl bg-white p-8">
          <h1 className="text-3xl font-semibold">Mis pedidos</h1>
          <p className="mt-3 text-sm text-stone-600">Necesitas iniciar sesion para ver tus pedidos y su estado.</p>
          <Link to="/auth?redirect=/orders" className="mt-6 inline-flex rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-white">
            Ingresar
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-100 p-6 text-stone-900">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex justify-end">
          <StorefrontTopBar session={session} onLogout={() => onSessionChange(null)} tone="light" showGuestAuthButton={false} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-stone-500">Historial</p>
            <h1 className="text-3xl font-semibold">Mis pedidos</h1>
            <p className="mt-2 text-sm text-stone-600">Segui el estado de cada pedido desde aca.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void loadOrders()}
              className="inline-flex items-center gap-2 rounded-full border bg-white px-4 py-2 text-sm"
            >
              <RefreshCw size={16} /> Actualizar
            </button>
            <Link to="/" className="rounded-full border bg-white px-4 py-2 text-sm">
              Volver a la tienda
            </Link>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">Pedidos</p>
            <p className="mt-2 text-3xl font-bold text-stone-900">{summary.totalOrders}</p>
          </div>
          <div className="rounded-3xl bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">Activos</p>
            <p className="mt-2 text-3xl font-bold text-stone-900">{summary.activeOrders}</p>
          </div>
          <div className="rounded-3xl bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">Total comprado</p>
            <p className="mt-2 text-3xl font-bold text-stone-900">${summary.totalSpent.toFixed(2)}</p>
          </div>
        </div>

        {loading ? <div className="rounded-3xl bg-white p-8">Cargando pedidos...</div> : null}
        {error ? <div className="rounded-3xl bg-white p-8 text-sm text-rose-600">{error}</div> : null}
        {!loading && !error && orders.length === 0 ? <div className="rounded-3xl bg-white p-8 text-sm text-stone-600">Todavia no tenes pedidos.</div> : null}

        <div className="space-y-6">
          {orders.map((order) => {
            const statusMeta = readOrderStatusMeta(order.status);

            return (
              <article key={order.id} className="rounded-3xl bg-white p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-stone-500">{order.id}</p>
                    <h2 className="mt-2 text-xl font-semibold">{new Date(order.createdAt).toLocaleDateString('es-AR')}</h2>
                    <p className="mt-2 text-sm text-stone-600">{order.customerName} · {order.customerEmail}</p>
                  </div>
                  <div className="text-right">
                    <p className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${statusMeta.className}`}>{statusMeta.label}</p>
                    <p className="mt-3 text-lg font-semibold">${order.totalPrice.toFixed(2)}</p>
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  {order.items.map((item) => {
                    const contentName = item.customizationMode === 'brand_design' ? designMap.get(item.designId || '') : templateMap.get(item.uploadTemplateId || '');
                    const customPayload = normalizeCustomPayload(item.customAssetUrlsJson);

                    return (
                      <div key={item.id} className="rounded-2xl border border-stone-200 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <p className="text-xs uppercase tracking-[0.2em] text-stone-500">{item.configurationCode}</p>
                            <h3 className="mt-2 text-lg font-semibold">{contentName || 'Personalizado'}</h3>
                            <div className="mt-3 grid gap-1 text-sm text-stone-600">
                              <p>Estado del pedido: {statusMeta.label}</p>
                              <p>Estampa: {item.printPlacementCode || 'Sin definir'}</p>
                              <p>Logo: {item.logoPlacementCode || 'Sin definir'}</p>
                              <p>Tamano: {item.transferSizeCode || 'Sin definir'}</p>
                              {customPayload?.assets?.length ? <p>Archivos: {customPayload.assets.length}</p> : null}
                              {customPayload?.text ? <p>Texto: {customPayload.text}</p> : null}
                            </div>
                          </div>
                          <p className="text-lg font-semibold">${item.unitPrice.toFixed(2)}</p>
                        </div>
                        {customPayload?.assets?.length ? (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {customPayload.assets.slice(0, 6).map((asset) => (
                              <img key={asset.id} src={asset.previewUrl} alt={asset.name} className="h-16 w-16 rounded-xl border object-cover" />
                            ))}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>

        {!loading && !error && orders.length > 0 ? (
          <div className="rounded-3xl border border-dashed border-stone-300 bg-white px-6 py-5 text-sm text-stone-600">
            Si el estado cambia, podes volver a entrar aca o usar el boton "Actualizar" para refrescarlo.
          </div>
        ) : null}
      </div>
    </div>
  );
}
