import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
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
  garmentModelId: string;
  colorId: string;
  sizeId: string;
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
  categories: Array<{
    garmentModels?: Array<{
      id: string;
      name: string;
      colors?: Array<{ colorId: string; color: { id: string; name: string } }>;
      sizes?: Array<{ sizeId: string; size: { id: string; name: string } }>;
    }>;
  }>;
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

const ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'] as const;

export default function OrdersAdmin() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingOrderId, setSavingOrderId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([axios.get<OrdersResponse>('/api/orders/admin/all'), getCatalogInit<Catalog>({ force: true })])
      .then(([ordersResponse, catalogData]) => {
        setOrders(ordersResponse.data.orders || []);
        setCatalog(catalogData);
      })
      .finally(() => setLoading(false));
  }, []);

  const designMap = useMemo(
    () => new Map((catalog?.collections || []).flatMap((collection) => (collection.designs || []).map((item) => [item.id, item.name]))),
    [catalog]
  );
  const garmentMap = useMemo(
    () => new Map((catalog?.categories || []).flatMap((category) => (category.garmentModels || []).map((item) => [item.id, item]))),
    [catalog]
  );
  const templateMap = useMemo(() => new Map((catalog?.uploadTemplates || []).map((item) => [item.id, item.name])), [catalog]);

  async function updateStatus(orderId: string, status: string) {
    setSavingOrderId(orderId);
    try {
      await axios.patch(`/api/orders/${orderId}/status`, { status });
      setOrders((current) => current.map((order) => (order.id === orderId ? { ...order, status } : order)));
    } finally {
      setSavingOrderId(null);
    }
  }

  return (
    <div className="animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Pedidos</h1>
        <p className="mt-1 text-gray-500">Consulta el detalle operativo de cada pedido y actualiza su estado.</p>
      </div>

      {loading ? <div className="rounded-2xl border border-gray-100 bg-white p-6">Cargando pedidos...</div> : null}

      <div className="space-y-6">
        {orders.map((order) => (
          <article key={order.id} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-gray-500">{order.id}</p>
                <h2 className="mt-2 text-xl font-semibold text-gray-900">{order.customerName}</h2>
                <p className="mt-1 text-sm text-gray-500">{order.customerEmail}</p>
                <p className="mt-1 text-sm text-gray-500">{new Date(order.createdAt).toLocaleString('es-AR')}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">${order.totalPrice.toFixed(2)}</p>
                <select value={order.status} onChange={(event) => void updateStatus(order.id, event.target.value)} disabled={savingOrderId === order.id} className="mt-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
                  {ORDER_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {order.items.map((item) => {
                const garment = garmentMap.get(item.garmentModelId);
                const contentName = item.customizationMode === 'brand_design' ? designMap.get(item.designId || '') : templateMap.get(item.uploadTemplateId || '');
                const colorName = garment?.colors?.find((color) => color.colorId === item.colorId)?.color.name || item.colorId;
                const sizeName = garment?.sizes?.find((size) => size.sizeId === item.sizeId)?.size.name || item.sizeId;
                const customPayload = normalizeCustomPayload(item.customAssetUrlsJson);

                return (
                  <div key={item.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-gray-500">{item.configurationCode}</p>
                        <h3 className="mt-2 text-lg font-semibold text-gray-900">{contentName || 'Personalizado'}</h3>
                        <div className="mt-3 grid gap-1 text-sm text-gray-600">
                          <p>Prenda: {garment?.name || item.garmentModelId}</p>
                          <p>Color: {colorName}</p>
                          <p>Talle: {sizeName}</p>
                          <p>Modo: {item.customizationMode}</p>
                          <p>Estampa: {item.printPlacementCode}</p>
                          <p>Logo: {item.logoPlacementCode}</p>
                          <p>Tamaño: {item.transferSizeCode}</p>
                          {customPayload?.assets?.length ? <p>Archivos: {customPayload.assets.length}</p> : null}
                          {customPayload?.text ? <p>Texto: {customPayload.text}</p> : null}
                        </div>
                      </div>
                      <p className="text-lg font-semibold text-gray-900">${item.unitPrice.toFixed(2)}</p>
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
  );
}
