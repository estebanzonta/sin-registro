import { useEffect, useState } from 'react';
import axios from 'axios';
import { Shield, ShoppingBag, UserRound } from 'lucide-react';

type AdminUser = {
  id: string;
  email: string;
  role: 'admin' | 'customer';
  createdAt: string;
  orderCount: number;
};

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
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

export default function UsersAdmin() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('/api/admin/users');
      setUsers(response.data || []);
    } catch (requestError) {
      setError(readApiError(requestError, 'No se pudieron cargar los usuarios.'));
    } finally {
      setLoading(false);
    }
  }

  async function updateRole(userId: string, role: 'admin' | 'customer') {
    setSavingId(userId);
    setError(null);
    try {
      const response = await axios.patch(`/api/admin/users/${userId}/role`, { role });
      setUsers((current) => current.map((user) => (user.id === userId ? response.data : user)));
    } catch (requestError) {
      setError(readApiError(requestError, 'No se pudo actualizar el rol.'));
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="animate-in fade-in duration-500">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
          <p className="mt-1 text-gray-500">Promové admins, revisá compradores y evitá tocar roles desde la base manualmente.</p>
        </div>
        <button onClick={() => void fetchUsers()} className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm">
          Recargar
        </button>
      </div>

      {loading ? <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">Cargando usuarios...</div> : null}
      {error ? <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div> : null}

      <div className="grid gap-4">
        {users.map((user) => {
          const isAdmin = user.role === 'admin';
          const isSaving = savingId === user.id;

          return (
            <article key={user.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${isAdmin ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 text-gray-600'}`}>
                    {isAdmin ? <Shield size={22} /> : <UserRound size={22} />}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-gray-900">{user.email}</h2>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${isAdmin ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'}`}>
                        {user.role}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-500">
                      <span>Creado: {formatDate(user.createdAt)}</span>
                      <span className="inline-flex items-center gap-1"><ShoppingBag size={14} /> {user.orderCount} pedido(s)</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => void updateRole(user.id, 'customer')}
                    disabled={isSaving || !isAdmin}
                    className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Pasar a customer
                  </button>
                  <button
                    onClick={() => void updateRole(user.id, 'admin')}
                    disabled={isSaving || isAdmin}
                    className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSaving ? 'Guardando...' : 'Hacer admin'}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
