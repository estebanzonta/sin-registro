import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import type { AppSession } from '../App';
import StorefrontTopBar from './StorefrontTopBar';
import { getCatalogInit } from '../lib/catalogCache';

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

  useEffect(() => {
    if (!session) {
      setLoading(false);
      return;
    }

    Promise.all([axios.get<OrdersResponse>('/api/orders/my-orders'), getCatalogInit<Catalog>()])
      .then(([ordersResponse, catalogData]) => {
        setOrders(ordersResponse.data.orders || []);
        setCatalog(catalogData);
      })
      .finally(() => setLoading(false));
  }, [session]);

  const designMap = useMemo(
    () => new Map((catalog?.collections || []).flatMap((collection) => (collection.designs || []).map((item) => [item.id, item.name]))),
    [catalog]
  );
  const templateMap = useMemo(() => new Map((catalog?.uploadTemplates || []).map((item) => [item.id, item.name])), [catalog]);

  if (!session) {
    return (
      <div className="min-h-screen bg-stone-100 p-6 text-stone-900">
        <div className="mx-auto mb-6 flex max-w-5xl justify-end">
          <StorefrontTopBar session={session} onLogout={() => onSessionChange(null)} tone="light" />
        </div>
        <div className="mx-auto max-w-5xl rounded-3xl bg-white p-8">
          <h1 className="text-3xl font-semibold">Mis pedidos</h1>
          <p className="mt-3 text-sm text-stone-600">Necesitás iniciar sesión para ver tus pedidos.</p>
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
          <StorefrontTopBar session={session} onLogout={() => onSessionChange(null)} tone="light" />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-stone-500">Historial</p>
            <h1 className="text-3xl font-semibold">Mis pedidos</h1>
          </div>
          <Link to="/" className="rounded-full border bg-white px-4 py-2 text-sm">
            Volver a la tienda
          </Link>
        </div>

        {loading ? <div className="rounded-3xl bg-white p-8">Cargando pedidos...</div> : null}
        {!loading && orders.length === 0 ? <div className="rounded-3xl bg-white p-8 text-sm text-stone-600">Todavía no tienes pedidos.</div> : null}

        <div className="space-y-6">
          {orders.map((order) => (
            <article key={order.id} className="rounded-3xl bg-white p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-stone-500">{order.id}</p>
                  <h2 className="mt-2 text-xl font-semibold">{new Date(order.createdAt).toLocaleDateString('es-AR')}</h2>
                  <p className="mt-2 text-sm text-stone-600">{order.customerName} · {order.customerEmail}</p>
                </div>
                <div className="text-right">
                  <p className="rounded-full bg-stone-100 px-3 py-1 text-sm font-medium text-stone-700">{order.status}</p>
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
                            <p>Estampa: {item.printPlacementCode}</p>
                            <p>Logo: {item.logoPlacementCode}</p>
                            <p>Tamaño: {item.transferSizeCode}</p>
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
          ))}
        </div>
      </div>
    </div>
  );
}
