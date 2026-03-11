import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { PackageSearch, RefreshCw } from 'lucide-react';

export default function BlankStockAdmin() {
  const [stock, setStock] = useState<any[]>([]);

  useEffect(() => {
    fetchStock();
  }, []);

  const fetchStock = async () => {
    try {
      const res = await axios.get('/api/admin/blank-stock');
      setStock(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const updateQuantity = async (id: string, qty: number) => {
    try {
      await axios.patch(`/api/admin/blank-stock/${id}`, { quantity: qty });
      fetchStock();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stock de prendas Lisas</h1>
          <p className="text-gray-500 mt-1">Controla el inventario de las bases que usarás para personalizar.</p>
        </div>
        <button onClick={fetchStock} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors shadow-sm">
          <RefreshCw size={16} /> Actualizar
        </button>
      </div>
      
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden text-left">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-sm uppercase tracking-wider">
              <th className="p-4 font-semibold">Modelo</th>
              <th className="p-4 font-semibold">Color</th>
              <th className="p-4 font-semibold text-center">Talle</th>
              <th className="p-4 font-semibold w-40 text-center">Cantidad Disponible</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {stock.map(s => (
              <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                      <PackageSearch size={20} />
                    </div>
                    <p className="font-semibold text-gray-800">{s.garmentModel?.name}</p>
                  </div>
                </td>
                <td className="p-4">
                   <div className="flex items-center gap-2">
                     <div className="w-5 h-5 rounded-full border shadow-sm" style={{ backgroundColor: s.color?.hex }}></div>
                     <span className="text-gray-700 font-medium">{s.color?.name}</span>
                   </div>
                </td>
                <td className="p-4 text-center">
                  <span className="bg-gray-100 text-gray-700 font-bold px-3 py-1 rounded-lg">
                    {s.size?.name}
                  </span>
                </td>
                <td className="p-4 text-center">
                  <input 
                    type="number" 
                    className="border border-gray-200 rounded-xl p-2 w-24 text-center font-bold text-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all" 
                    value={s.quantity}
                    onChange={(e) => updateQuantity(s.id, parseInt(e.target.value) || 0)}
                  />
                </td>
              </tr>
            ))}
            {stock.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                     <PackageSearch size={32} className="text-gray-300"/>
                     <p>No se encontraron registros de stock.</p>
                     <p className="text-sm">Asegúrate de vincular Modelos, Colores y Talles en la API primero.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
