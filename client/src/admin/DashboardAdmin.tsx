import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { AlertTriangle, ClipboardList, DollarSign, PackageSearch, RefreshCw, Shirt, Users } from 'lucide-react';
import { readFriendlyApiError } from '../lib/apiErrors';

type Order = {
  id: string;
  customerName: string;
  customerEmail: string;
  totalPrice: number;
  status: string;
  createdAt: string;
};

type OrdersResponse = {
  orders: Order[];
  total: number;
};

type BlankStockRow = {
  id: string;
  quantity: number;
  garmentModel?: { name?: string | null } | null;
  color?: { name?: string | null } | null;
  size?: { name?: string | null } | null;
};

type UserSummary = {
  id: string;
  role: string;
};

type ModelSummary = {
  id: string;
  active?: boolean;
};

const LOW_STOCK_LIMIT = 5;
const ACTIVE_ORDER_STATUSES = new Set(['pending', 'confirmed', 'processing', 'shipped']);

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function startOfMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function currency(value: number) {
  return `$${value.toFixed(2)}`;
}

function statusMeta(status: string) {
  const map: Record<string, { label: string; className: string }> = {
    pending: { label: 'Pendiente', className: 'bg-amber-100 text-amber-800' },
    confirmed: { label: 'Confirmado', className: 'bg-sky-100 text-sky-800' },
    processing: { label: 'En produccion', className: 'bg-violet-100 text-violet-800' },
    shipped: { label: 'Enviado', className: 'bg-indigo-100 text-indigo-800' },
    delivered: { label: 'Entregado', className: 'bg-emerald-100 text-emerald-800' },
    cancelled: { label: 'Cancelado', className: 'bg-rose-100 text-rose-800' },
  };

  return map[status] || { label: status, className: 'bg-stone-100 text-stone-700' };
}

export default function DashboardAdmin() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stock, setStock] = useState<BlankStockRow[]>([]);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [models, setModels] = useState<ModelSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadDashboard() {
    setLoading(true);
    setError(null);

    try {
      const [ordersResponse, stockResponse, usersResponse, modelsResponse] = await Promise.all([
        axios.get<OrdersResponse>('/api/orders/admin/all'),
        axios.get<BlankStockRow[]>('/api/admin/blank-stock'),
        axios.get<UserSummary[]>('/api/admin/users'),
        axios.get<ModelSummary[]>('/api/admin/garment-models'),
      ]);

      setOrders(ordersResponse.data.orders || []);
      setStock(stockResponse.data || []);
      setUsers(usersResponse.data || []);
      setModels(modelsResponse.data || []);
    } catch (requestError) {
      setError(readFriendlyApiError(requestError, 'No se pudo cargar el resumen.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  const metrics = useMemo(() => {
    const today = startOfToday();
    const month = startOfMonth();
    const nonCancelledOrders = orders.filter((order) => order.status !== 'cancelled');
    const monthOrders = nonCancelledOrders.filter((order) => new Date(order.createdAt) >= month);
    const todayOrders = orders.filter((order) => new Date(order.createdAt) >= today);
    const activeOrders = orders.filter((order) => ACTIVE_ORDER_STATUSES.has(order.status));
    const lowStockRows = stock.filter((row) => row.quantity <= LOW_STOCK_LIMIT);
    const adminUsers = users.filter((user) => user.role === 'admin').length;
    const activeModels = models.filter((model) => model.active !== false).length;

    return {
      revenueTotal: nonCancelledOrders.reduce((sum, order) => sum + order.totalPrice, 0),
      revenueMonth: monthOrders.reduce((sum, order) => sum + order.totalPrice, 0),
      todayOrders: todayOrders.length,
      activeOrders: activeOrders.length,
      lowStockRows,
      customerUsers: Math.max(0, users.length - adminUsers),
      activeModels,
    };
  }, [models, orders, stock, users]);

  const recentOrders = useMemo(
    () => [...orders].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()).slice(0, 6),
    [orders]
  );

  const statusBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    for (const order of orders) {
      counts.set(order.status, (counts.get(order.status) || 0) + 1);
    }

    return Array.from(counts.entries())
      .sort((left, right) => right[1] - left[1])
      .map(([status, count]) => ({ status, count, meta: statusMeta(status) }));
  }, [orders]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Resumen operativo</h1>
          <p className="mt-1 text-gray-500">Pedidos, facturacion, clientes y alertas para priorizar el dia.</p>
        </div>
        <button
          type="button"
          onClick={() => void loadDashboard()}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm"
        >
          <RefreshCw size={16} /> Actualizar
        </button>
      </div>

      {error ? <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
      {loading ? <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">Cargando resumen...</div> : null}

      {!loading ? (
        <>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wider text-gray-500">Facturacion total</p>
                  <p className="mt-3 text-3xl font-extrabold text-emerald-600">{currency(metrics.revenueTotal)}</p>
                </div>
                <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
                  <DollarSign size={22} />
                </div>
              </div>
              <p className="mt-3 text-sm text-gray-500">Mes actual: {currency(metrics.revenueMonth)}</p>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wider text-gray-500">Pedidos activos</p>
                  <p className="mt-3 text-3xl font-extrabold text-blue-600">{metrics.activeOrders}</p>
                </div>
                <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                  <ClipboardList size={22} />
                </div>
              </div>
              <p className="mt-3 text-sm text-gray-500">Ingresaron hoy: {metrics.todayOrders}</p>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wider text-gray-500">Clientes</p>
                  <p className="mt-3 text-3xl font-extrabold text-indigo-600">{metrics.customerUsers}</p>
                </div>
                <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600">
                  <Users size={22} />
                </div>
              </div>
              <p className="mt-3 text-sm text-gray-500">Modelos activos: {metrics.activeModels}</p>
            </div>

            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wider text-amber-700">Alertas de stock</p>
                  <p className="mt-3 text-3xl font-extrabold text-amber-700">{metrics.lowStockRows.length}</p>
                </div>
                <div className="rounded-xl bg-white/70 p-3 text-amber-700">
                  <AlertTriangle size={22} />
                </div>
              </div>
              <p className="mt-3 text-sm text-amber-700">Combinaciones con {LOW_STOCK_LIMIT} uds o menos</p>
            </div>
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
            <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Pedidos recientes</h2>
                  <p className="mt-1 text-sm text-gray-500">Los ultimos movimientos para seguimiento rapido.</p>
                </div>
              </div>

              <div className="space-y-4">
                {recentOrders.length ? (
                  recentOrders.map((order) => {
                    const meta = statusMeta(order.status);
                    return (
                      <article key={order.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <p className="text-xs uppercase tracking-[0.2em] text-gray-500">{order.id}</p>
                            <h3 className="mt-2 text-lg font-semibold text-gray-900">{order.customerName}</h3>
                            <p className="mt-1 text-sm text-gray-500">{order.customerEmail}</p>
                            <p className="mt-2 text-sm text-gray-500">{new Date(order.createdAt).toLocaleString('es-AR')}</p>
                          </div>
                          <div className="text-right">
                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${meta.className}`}>{meta.label}</span>
                            <p className="mt-3 text-lg font-bold text-gray-900">{currency(order.totalPrice)}</p>
                          </div>
                        </div>
                      </article>
                    );
                  })
                ) : (
                  <p className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center text-sm text-gray-500">
                    Todavia no hay pedidos para mostrar.
                  </p>
                )}
              </div>
            </section>

            <div className="space-y-6">
              <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-bold text-gray-900">Estado de pedidos</h2>
                <div className="mt-5 space-y-3">
                  {statusBreakdown.length ? (
                    statusBreakdown.map((item) => (
                      <div key={item.status} className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.meta.className}`}>{item.meta.label}</span>
                        <span className="text-lg font-bold text-gray-900">{item.count}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">Sin pedidos cargados.</p>
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-3">
                  <div className="rounded-xl bg-amber-50 p-3 text-amber-600">
                    <PackageSearch size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Stock bajo</h2>
                    <p className="text-sm text-gray-500">Primeras combinaciones a revisar.</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {metrics.lowStockRows.slice(0, 6).length ? (
                    metrics.lowStockRows.slice(0, 6).map((row) => (
                      <div key={row.id} className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
                        <p className="font-semibold text-gray-900">{row.garmentModel?.name || 'Modelo'}</p>
                        <p className="mt-1 text-sm text-gray-600">
                          {row.color?.name || 'Color'} · Talle {row.size?.name || '-'}
                        </p>
                        <p className="mt-2 text-sm font-semibold text-amber-800">{row.quantity} unidades</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">No hay alertas de stock bajo.</p>
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="mb-3 flex items-center gap-3">
                  <div className="rounded-xl bg-violet-50 p-3 text-violet-600">
                    <Shirt size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Lectura rapida</h2>
                  </div>
                </div>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>Pedidos activos: {metrics.activeOrders}</li>
                  <li>Ingresos de hoy: {metrics.todayOrders} pedidos</li>
                  <li>Facturacion mensual: {currency(metrics.revenueMonth)}</li>
                  <li>Clientes registrados: {metrics.customerUsers}</li>
                </ul>
              </section>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
