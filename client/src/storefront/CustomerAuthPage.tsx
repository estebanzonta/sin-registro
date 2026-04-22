import { useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import type { AppSession } from '../App';
import StorefrontTopBar from './StorefrontTopBar';
import { readFriendlyApiError } from '../lib/apiErrors';

type AuthMode = 'login' | 'register';

export default function CustomerAuthPage({
  session,
  onSessionChange,
}: {
  session: AppSession | null;
  onSessionChange: (session: AppSession | null) => void;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>('login');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const redirectTo = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const redirect = params.get('redirect');
    return redirect && redirect.startsWith('/') ? redirect : '/';
  }, [location.search]);

  if (session?.user.role === 'customer') {
    return <Navigate to={redirectTo} replace />;
  }

  if (session?.user.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const payload =
        mode === 'login'
          ? { email, password }
          : { firstName, lastName, city, province, address, email, password, phone };
      const response = await axios.post(endpoint, payload);
      const nextSession = response.data as AppSession;

      onSessionChange(nextSession);
      navigate(nextSession.user.role === 'admin' ? '/admin' : redirectTo, { replace: true });
    } catch (submitError) {
      setError(readFriendlyApiError(submitError, mode === 'login' ? 'No se pudo iniciar sesión.' : 'No se pudo crear la cuenta.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto mb-6 flex max-w-5xl justify-end">
        <StorefrontTopBar session={session} onLogout={() => onSessionChange(null)} tone="dark" showGuestAuthButton={false} />
      </div>

      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.92fr_1.08fr]">
        <div className="rounded-[2rem] border border-white/12 bg-white/[0.06] p-8 shadow-xl backdrop-blur-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/55">Acceso cliente</p>
          <h1 className="mt-4 text-4xl font-black leading-tight">Entrá para seguir con tu compra.</h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-white/72">
            Tu sesión mantiene el carrito, las configuraciones y el historial de pedidos.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/" className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#111827]">
              Volver al configurador
            </Link>
          </div>
        </div>

        <div className="rounded-[2rem] bg-white p-8 text-stone-900 shadow-sm">
          <div className="flex gap-2 rounded-full bg-stone-100 p-1">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`flex-1 rounded-full px-4 py-3 text-sm font-semibold ${mode === 'login' ? 'bg-stone-900 text-white' : 'text-stone-600'}`}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`flex-1 rounded-full px-4 py-3 text-sm font-semibold ${mode === 'register' ? 'bg-stone-900 text-white' : 'text-stone-600'}`}
            >
              Crear cuenta
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-6">
            <h2 className="text-2xl font-semibold text-stone-900">
              {mode === 'login' ? 'Entrá para seguir comprando' : 'Creá tu cuenta de cliente'}
            </h2>
            <p className="mt-2 text-sm text-stone-500">
              {mode === 'login'
                ? 'Usá tu email y contraseña. Si tu cuenta es admin, te redirigimos al panel.'
                : 'El registro crea una sesión nueva y te deja listo para comprar.'}
            </p>

            <div className="mt-6 space-y-4">
              {mode === 'register' ? (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <input
                      className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4 text-sm text-stone-900 outline-none transition focus:bg-white focus:ring-2 focus:ring-stone-900/15"
                      value={firstName}
                      onChange={(event) => setFirstName(event.target.value)}
                      placeholder="Nombre *"
                      autoComplete="given-name"
                      required
                    />
                    <input
                      className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4 text-sm text-stone-900 outline-none transition focus:bg-white focus:ring-2 focus:ring-stone-900/15"
                      value={lastName}
                      onChange={(event) => setLastName(event.target.value)}
                      placeholder="Apellido *"
                      autoComplete="family-name"
                      required
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <input
                      className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4 text-sm text-stone-900 outline-none transition focus:bg-white focus:ring-2 focus:ring-stone-900/15"
                      value={city}
                      onChange={(event) => setCity(event.target.value)}
                      placeholder="Ciudad *"
                      autoComplete="address-level2"
                      required
                    />
                    <input
                      className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4 text-sm text-stone-900 outline-none transition focus:bg-white focus:ring-2 focus:ring-stone-900/15"
                      value={province}
                      onChange={(event) => setProvince(event.target.value)}
                      placeholder="Provincia *"
                      autoComplete="address-level1"
                      required
                    />
                  </div>
                  <input
                    className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4 text-sm text-stone-900 outline-none transition focus:bg-white focus:ring-2 focus:ring-stone-900/15"
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                    placeholder="Direccion *"
                    autoComplete="street-address"
                    required
                  />
                </>
              ) : null}
              <input
                className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4 text-sm text-stone-900 outline-none transition focus:bg-white focus:ring-2 focus:ring-stone-900/15"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="tu@email.com"
                autoComplete="email"
                required
              />
              <input
                className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4 text-sm text-stone-900 outline-none transition focus:bg-white focus:ring-2 focus:ring-stone-900/15"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Mínimo 6 caracteres"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
              />
              {mode === 'register' ? (
                <input
                  className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4 text-sm text-stone-900 outline-none transition focus:bg-white focus:ring-2 focus:ring-stone-900/15"
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="Telefono *"
                  autoComplete="tel"
                  required
                />
              ) : null}
            </div>

            {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}

            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full rounded-2xl bg-stone-900 px-5 py-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Procesando...' : mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
