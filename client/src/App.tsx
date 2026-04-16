import { useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Link, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import axios from 'axios';
import { ClipboardList, Image as ImageIcon, LayoutDashboard, PackageSearch, Settings, Shield, Shirt } from 'lucide-react';
import { readFriendlyApiError } from './lib/apiErrors';

import GarmentModelsAdmin from './admin/GarmentModelsAdmin';
import DesignsAdmin from './admin/DesignsAdmin';
import BlankStockAdmin from './admin/BlankStockAdmin';
import UsersAdmin from './admin/UsersAdmin';
import ProductionConfigAdmin from './admin/ProductionConfigAdmin';
import OrdersAdmin from './admin/OrdersAdmin';
import CustomizerApp from './customizer/CustomizerApp';
import CartPage from './storefront/CartPage';
import CustomerAuthPage from './storefront/CustomerAuthPage';
import OrdersPage from './storefront/OrdersPage';

type SessionUser = {
  id: string;
  email: string;
  role: string;
};

type SessionState = {
  token: string;
  user: SessionUser;
};

const SESSION_KEY = 'sr-session';
export type AppSession = SessionState;

function readSession(): SessionState | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    return parsed?.token ? parsed : null;
  } catch {
    return null;
  }
}

function applyToken(token: string | null) {
  if (token) {
    axios.defaults.headers.common.Authorization = `Bearer ${token}`;
    return;
  }

  delete axios.defaults.headers.common.Authorization;
}

export function persistSession(session: SessionState | null) {
  if (session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    applyToken(session.token);
    return;
  }

  localStorage.removeItem(SESSION_KEY);
  applyToken(null);
}

function AdminLogin({ onLogin }: { onLogin: (session: SessionState) => void }) {
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('admin123456');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post('/api/auth/login', { email, password });
      const session = response.data as SessionState;

      if (session.user?.role !== 'admin') {
        throw new Error('La cuenta no tiene permisos de admin.');
      }

      onLogin(session);
    } catch (loginError) {
      console.error(loginError);
      setError(readFriendlyApiError(loginError, 'No se pudo iniciar sesión.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-surface flex min-h-screen items-center justify-center bg-gray-100 p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-600">Admin</p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">Ingreso al panel</h1>
        <p className="mt-2 text-sm text-gray-500">Usá un usuario admin válido para gestionar catálogo, stock y producción.</p>

        <div className="mt-6 space-y-4">
          <input
            className="w-full rounded-2xl border border-gray-200 bg-gray-50 p-4 text-gray-900 outline-none transition-all focus:bg-white focus:ring-2 focus:ring-blue-500"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="admin@example.com"
            autoComplete="username"
          />
          <input
            className="w-full rounded-2xl border border-gray-200 bg-gray-50 p-4 text-gray-900 outline-none transition-all focus:bg-white focus:ring-2 focus:ring-blue-500"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Contraseña"
            autoComplete="current-password"
          />
        </div>

        {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}

        <button
          className="mt-6 w-full rounded-2xl bg-blue-600 px-5 py-4 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          type="submit"
          disabled={loading}
        >
          {loading ? 'Ingresando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}

const Dashboard = () => (
  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
    <div className="mb-8 flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Panel operativo</h1>
        <p className="mt-1 text-gray-500">Catálogo, stock y configuraciones de producción.</p>
      </div>
    </div>

    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      <div className="flex items-start justify-between rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Configurador</h3>
          <p className="mt-2 text-4xl font-extrabold text-blue-600">Activo</p>
        </div>
        <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
          <LayoutDashboard size={24} />
        </div>
      </div>
      <div className="flex items-start justify-between rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Diseños</h3>
          <p className="mt-2 text-4xl font-extrabold text-pink-500">Brand</p>
        </div>
        <div className="rounded-xl bg-pink-50 p-3 text-pink-500">
          <ImageIcon size={24} />
        </div>
      </div>
      <div className="flex items-start justify-between rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Stock base</h3>
          <p className="mt-2 text-4xl font-extrabold text-emerald-600">Ready</p>
        </div>
        <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
          <PackageSearch size={24} />
        </div>
      </div>
    </div>
  </div>
);

function AdminShell({ session, onLogout }: { session: SessionState; onLogout: () => void }) {
  return (
    <div className="admin-surface flex min-h-screen w-full bg-gray-50 font-sans text-gray-800">
      <aside className="hidden w-72 flex-col border-r border-gray-200 bg-white shadow-sm md:flex">
        <div className="flex items-center gap-3 border-b border-gray-100 p-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 font-bold text-white">A</div>
          <h2 className="bg-gradient-to-r from-blue-700 to-indigo-600 bg-clip-text text-xl font-bold text-transparent">Panel Admin</h2>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          <p className="mb-2 mt-4 px-4 text-xs font-semibold uppercase tracking-wider text-gray-400">Gestion</p>
          <Link to="/admin" className="flex items-center gap-3 rounded-xl px-4 py-3 font-medium text-gray-700 transition-colors hover:bg-blue-50 hover:text-blue-700">
            <LayoutDashboard size={20} className="text-blue-500" /> Resumen
          </Link>
          <Link to="/admin/models" className="flex items-center gap-3 rounded-xl px-4 py-3 font-medium text-gray-700 transition-colors hover:bg-blue-50 hover:text-blue-700">
            <Shirt size={20} className="text-purple-500" /> Modelos base
          </Link>
          <Link to="/admin/designs" className="flex items-center gap-3 rounded-xl px-4 py-3 font-medium text-gray-700 transition-colors hover:bg-blue-50 hover:text-blue-700">
            <ImageIcon size={20} className="text-pink-500" /> Diseños de marca
          </Link>
          <Link to="/admin/stock" className="flex items-center gap-3 rounded-xl px-4 py-3 font-medium text-gray-700 transition-colors hover:bg-blue-50 hover:text-blue-700">
            <PackageSearch size={20} className="text-emerald-500" /> Stock lisas
          </Link>
          <Link to="/admin/orders" className="flex items-center gap-3 rounded-xl px-4 py-3 font-medium text-gray-700 transition-colors hover:bg-blue-50 hover:text-blue-700">
            <ClipboardList size={20} className="text-amber-500" /> Pedidos
          </Link>
          <Link to="/admin/production" className="flex items-center gap-3 rounded-xl px-4 py-3 font-medium text-gray-700 transition-colors hover:bg-blue-50 hover:text-blue-700">
            <Settings size={20} className="text-blue-500" /> Producción
          </Link>
          <Link to="/admin/users" className="flex items-center gap-3 rounded-xl px-4 py-3 font-medium text-gray-700 transition-colors hover:bg-blue-50 hover:text-blue-700">
            <Shield size={20} className="text-indigo-500" /> Usuarios
          </Link>
        </nav>
        <div className="border-t border-gray-100 p-4">
          <Link to="/" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-500 transition-colors hover:text-gray-900">
            Volver a la tienda
          </Link>
        </div>
      </aside>
      <main className="flex min-h-screen flex-1 flex-col overflow-hidden bg-gray-50 text-gray-800">
        <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-8 shadow-sm">
          <h1 className="text-lg font-semibold text-gray-700">Administracion</h1>
          <div className="flex items-center gap-4">
            <button className="text-gray-400 hover:text-gray-600">
              <Settings size={20} />
            </button>
            <div className="rounded-full border border-indigo-200 bg-indigo-100 px-3 py-1 text-sm font-semibold text-indigo-700">{session.user.email}</div>
            <button onClick={onLogout} className="rounded-full border px-4 py-2 text-sm text-gray-700">
              Salir
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-auto bg-gray-50/50 p-8 text-gray-800">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState<SessionState | null>(() => readSession());
  const [sessionChecked, setSessionChecked] = useState(() => !readSession());
  const [, setCustomerCartCount] = useState(0);

  useEffect(() => {
    applyToken(session?.token || null);
  }, [session]);

  useEffect(() => {
    let cancelled = false;

    if (!session?.token) {
      setSessionChecked(true);
      return () => {
        cancelled = true;
      };
    }

    setSessionChecked(false);

    axios
      .get('/api/auth/me')
      .then((response) => {
        if (cancelled) return;

        const nextSession = {
          token: session.token,
          user: {
            id: response.data.id,
            email: response.data.email,
            role: response.data.role,
          },
        } as SessionState;

        persistSession(nextSession);
        setSession(nextSession);
      })
      .catch(() => {
        if (cancelled) return;
        persistSession(null);
        setSession(null);
      })
      .finally(() => {
        if (!cancelled) {
          setSessionChecked(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [session?.token]);

  const adminLayout = useMemo(
    () =>
      session?.user.role === 'admin' ? (
        <AdminShell
          session={session}
          onLogout={() => {
            persistSession(null);
            setSession(null);
          }}
        />
      ) : (
        <Navigate to="/admin/login" replace />
      ),
    [session]
  );

  if (!sessionChecked) {
    return <div className="flex min-h-screen items-center justify-center bg-stone-100 text-sm text-stone-600">Validando sesión...</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <CustomizerApp
              session={session}
              onCartCountChange={setCustomerCartCount}
              onSessionChange={(nextSession) => {
                persistSession(nextSession);
                setSession(nextSession);
              }}
            />
          }
        />
        <Route
          path="/cart"
          element={
            <CartPage
              session={session?.user.role === 'customer' ? session : null}
              onSessionChange={(nextSession) => {
                persistSession(nextSession);
                setSession(nextSession);
              }}
              onCartCountChange={setCustomerCartCount}
            />
          }
        />
        <Route
          path="/orders"
          element={
            <OrdersPage
              session={session?.user.role === 'customer' ? session : null}
              onSessionChange={(nextSession) => {
                persistSession(nextSession);
                setSession(nextSession);
              }}
            />
          }
        />
        <Route
          path="/auth"
          element={
            <CustomerAuthPage
              session={session}
              onSessionChange={(nextSession) => {
                persistSession(nextSession);
                setSession(nextSession);
              }}
            />
          }
        />
        <Route
          path="/admin/login"
          element={
            session?.user.role === 'admin' ? (
              <Navigate to="/admin" replace />
            ) : (
              <AdminLogin
                onLogin={(nextSession) => {
                  persistSession(nextSession);
                  setSession(nextSession);
                }}
              />
            )
          }
        />
        <Route path="/admin" element={adminLayout}>
          <Route index element={<Dashboard />} />
          <Route path="models" element={<GarmentModelsAdmin />} />
          <Route path="designs" element={<DesignsAdmin />} />
          <Route path="stock" element={<BlankStockAdmin />} />
          <Route path="orders" element={<OrdersAdmin />} />
          <Route path="production" element={<ProductionConfigAdmin />} />
          <Route path="users" element={<UsersAdmin />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
