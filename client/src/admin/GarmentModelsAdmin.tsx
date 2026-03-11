import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Shirt, Plus, Edit2, Trash2 } from 'lucide-react';

export default function GarmentModelsAdmin() {
  const [models, setModels] = useState<any[]>([]);
  const [newModel, setNewModel] = useState({ name: '', slug: '', description: '', basePrice: 0, frontMockupUrl: '', backMockupUrl: '' });
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');

  useEffect(() => {
    fetchModels();
    fetchCategories();
  }, []);

  const fetchModels = async () => {
    try {
      const res = await axios.get('/api/admin/garment-models');
      setModels(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await axios.get('/api/catalog/init');
      setCategories(res.data.categories || []);
      if (res.data.categories?.length > 0) {
        setSelectedCategoryId(res.data.categories[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/api/admin/garment-models', {
        ...newModel,
        categoryId: selectedCategoryId || 'fake-category-id' 
      });
      fetchModels();
      setNewModel({ name: '', slug: '', description: '', basePrice: 0, frontMockupUrl: '', backMockupUrl: '' });
    } catch (e) {
      console.error(e);
      alert("Error al crear el modelo. Asegúrate de tener al menos una categoría creada.");
    }
  };

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Modelos Base</h1>
          <p className="text-gray-500 mt-1">Administra los tipos de prendas (Oversize, Crop, etc.) y sus mockups.</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
        <h2 className="text-lg font-bold mb-5 flex items-center gap-2 text-gray-800"><Plus size={20} className="text-blue-500"/> Agregar Nuevo Modelo</h2>
        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
            <input className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="Ej. Remera Oversize" value={newModel.name} onChange={e => setNewModel({...newModel, name: e.target.value})} required/>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Slug (URL amigable)</label>
            <input className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="ej. remera-oversize" value={newModel.slug} onChange={e => setNewModel({...newModel, slug: e.target.value})} required/>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Precio Base ($)</label>
            <input className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" type="number" placeholder="25000" value={newModel.basePrice || ''} onChange={e => setNewModel({...newModel, basePrice: Number(e.target.value)})} required/>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
            <select className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:bg-white outline-none" value={selectedCategoryId} onChange={e => setSelectedCategoryId(e.target.value)}>
               {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
               {categories.length === 0 && <option value="">Sin categorías (Fallback)</option>}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <input className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="Corte amplio y relajado..." value={newModel.description} onChange={e => setNewModel({...newModel, description: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">URL Mockup Frente</label>
            <input className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="/model-oversize-white-front.png" value={newModel.frontMockupUrl} onChange={e => setNewModel({...newModel, frontMockupUrl: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">URL Mockup Espalda</label>
            <input className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="/model-oversize-white-back.png" value={newModel.backMockupUrl} onChange={e => setNewModel({...newModel, backMockupUrl: e.target.value})} />
          </div>
          <div className="md:col-span-2 flex justify-end mt-2">
             <button className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-xl transition-colors" type="submit">
               Guardar Modelo
             </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden text-left">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-sm uppercase tracking-wider">
              <th className="p-4 font-semibold">Modelo</th>
              <th className="p-4 font-semibold">Slug</th>
              <th className="p-4 font-semibold">Precio Base</th>
              <th className="p-4 font-semibold">Activo</th>
              <th className="p-4 font-semibold text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {models.map(m => (
              <tr key={m.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                      <Shirt size={20} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{m.name}</p>
                      <p className="text-xs text-gray-500 truncate w-48">{m.description || 'Sin descripción'}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4 text-gray-600 text-sm">{m.slug}</td>
                <td className="p-4 font-semibold text-emerald-600">${m.basePrice}</td>
                <td className="p-4">
                   <span className={`px-3 py-1 rounded-full text-xs font-medium ${m.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                     {m.active ? 'Activo' : 'Inactivo'}
                   </span>
                </td>
                <td className="p-4 text-right">
                   <button className="p-2 text-gray-400 hover:text-blue-600 transition-colors"><Edit2 size={18}/></button>
                   <button className="p-2 text-gray-400 hover:text-red-600 transition-colors"><Trash2 size={18}/></button>
                </td>
              </tr>
            ))}
            {models.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-500">No hay modelos registrados aún.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
