import { useEffect, useState } from 'react';
import axios from 'axios';
import { PackageSearch, RefreshCw } from 'lucide-react';
import { readFriendlyApiError } from '../lib/apiErrors';

export default function BlankStockAdmin() {
  const [stock, setStock] = useState<any[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    void fetchStock();
  }, []);

  async function fetchStock() {
    setErrorMessage(null);
    const response = await axios.get('/api/admin/blank-stock');
    setStock(response.data);
  }

  async function setQuantity(id: string, quantity: number) {
    const nextQuantity = Math.max(0, quantity);
    const previousStock = stock;
    setErrorMessage(null);
    setSavingId(id);
    setStock((current) => current.map((item) => (item.id === id ? { ...item, quantity: nextQuantity } : item)));
    try {
      await axios.patch(`/api/admin/blank-stock/${id}`, { quantity: nextQuantity });
    } catch (error) {
      setStock(previousStock);
      setErrorMessage(readFriendlyApiError(error, 'No se pudo actualizar el stock.'));
    } finally {
      setSavingId(null);
    }
  }

  function readQuantity(id: string) {
    return stock.find((item) => item.id === id)?.quantity || 0;
  }

  return (
    <div className="animate-in fade-in duration-500">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stock de prendas lisas</h1>
          <p className="mt-1 text-gray-500">Suma o resta stock rápido por modelo, color y talle.</p>
        </div>
        <button onClick={() => void fetchStock()} className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-gray-700 shadow-sm">
          <RefreshCw size={16} /> Actualizar
        </button>
      </div>
      {errorMessage ? <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorMessage}</div> : null}

      <div className="space-y-3">
        {stock.map((item) => (
          <article key={item.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <PackageSearch size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{item.garmentModel?.name}</h3>
                  <p className="text-sm text-gray-500">{item.color?.name} · Talle {item.size?.name}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button type="button" onClick={() => void setQuantity(item.id, readQuantity(item.id) - 10)} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700">-10</button>
                <button type="button" onClick={() => void setQuantity(item.id, readQuantity(item.id) - 1)} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700">-1</button>
                <input
                  type="number"
                  className="w-24 rounded-xl border border-gray-200 bg-gray-50 p-2 text-center text-lg font-bold"
                  value={item.quantity}
                  onChange={(event) => {
                    const nextValue = Number(event.target.value || 0);
                    setStock((current) => current.map((row) => (row.id === item.id ? { ...row, quantity: nextValue } : row)));
                  }}
                  onBlur={(event) => void setQuantity(item.id, Number(event.target.value || 0))}
                />
                <button type="button" onClick={() => void setQuantity(item.id, readQuantity(item.id) + 1)} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700">+1</button>
                <button type="button" onClick={() => void setQuantity(item.id, readQuantity(item.id) + 10)} className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">+10</button>
                {savingId === item.id ? <span className="text-xs text-gray-400">Guardando...</span> : null}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
