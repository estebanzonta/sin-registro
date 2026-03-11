import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Image as ImageIcon, Plus, Edit2, Trash2 } from 'lucide-react';

export default function DesignsAdmin() {
  const [designs, setDesigns] = useState<any[]>([]);
  const [newDesign, setNewDesign] = useState({ name: '', slug: '', description: '', imageUrl: '', limited: false });
  const [collections, setCollections] = useState<any[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState('');

  useEffect(() => {
    fetchDesigns();
    fetchCollections();
  }, []);

  const fetchDesigns = async () => {
    try {
      const res = await axios.get('/api/admin/designs');
      setDesigns(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCollections = async () => {
    try {
      // Mocking fetch or fetching via real endpoint if it exists
      // If we don't have a /collections endpoint, we'll fake the dropdown logic for MVP
      setCollections([{ id: 'TODO-COL-ID', name: 'Colección General' }]);
      setSelectedCollectionId('TODO-COL-ID');
    } catch(e) { console.error(e); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/api/admin/designs', {
        ...newDesign,
        collectionId: selectedCollectionId 
      });
      fetchDesigns();
      setNewDesign({ name: '', slug: '', description: '', imageUrl: '', limited: false });
    } catch (e) {
      console.error(e);
      alert("Error al guardar el diseño.");
    }
  };

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Diseños de Marca</h1>
          <p className="text-gray-500 mt-1">Sube y organiza los diseños gráficos disponibles para estampar.</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
        <h2 className="text-lg font-bold mb-5 flex items-center gap-2 text-gray-800"><Plus size={20} className="text-pink-500"/> Subir Nuevo Diseño</h2>
        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Diseño</label>
            <input className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-pink-500 outline-none transition-all" placeholder="Ej. Calavera Neo" value={newDesign.name} onChange={e => setNewDesign({...newDesign, name: e.target.value})} required/>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Slug (URL)</label>
            <input className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-pink-500 outline-none transition-all" placeholder="ej. calavera-neo" value={newDesign.slug} onChange={e => setNewDesign({...newDesign, slug: e.target.value})} required/>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <input className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-pink-500 outline-none transition-all" placeholder="Breve historia del diseño..." value={newDesign.description} onChange={e => setNewDesign({...newDesign, description: e.target.value})} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">URL de la Imagen (PNG transparente)</label>
            <input className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-pink-500 outline-none transition-all" placeholder="https://..." value={newDesign.imageUrl} onChange={e => setNewDesign({...newDesign, imageUrl: e.target.value})} required/>
          </div>
          
          <div className="md:col-span-2 flex items-center justify-between mt-2 p-4 bg-gray-50 rounded-xl border border-gray-200">
             <div>
                <p className="font-semibold text-gray-800">¿Es una edición limitada?</p>
                <p className="text-sm text-gray-500">Marcar si pertenece a una cápsula temporal.</p>
             </div>
             <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={newDesign.limited} onChange={e => setNewDesign({...newDesign, limited: e.target.checked})} />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-500"></div>
             </label>
          </div>
          
          <div className="md:col-span-2 flex justify-end mt-2">
             <button className="bg-pink-600 hover:bg-pink-700 text-white font-medium py-3 px-6 rounded-xl transition-colors" type="submit">
               Guardar Diseño
             </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden text-left">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-sm uppercase tracking-wider">
              <th className="p-4 font-semibold w-24">Imagen</th>
              <th className="p-4 font-semibold">Diseño</th>
              <th className="p-4 font-semibold">Tipo</th>
              <th className="p-4 font-semibold text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {designs.map(d => (
              <tr key={d.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="p-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-xl border border-gray-200 p-2 flex items-center justify-center overflow-hidden">
                     {d.imageUrl ? <img src={d.imageUrl} alt={d.name} className="max-w-full max-h-full object-contain drop-shadow-md" /> : <ImageIcon size={24} className="text-gray-400" />}
                  </div>
                </td>
                <td className="p-4">
                   <p className="font-semibold text-gray-800">{d.name}</p>
                   <p className="text-xs text-gray-500">{d.slug}</p>
                </td>
                <td className="p-4">
                  {d.limited ? <span className="bg-yellow-100 text-yellow-800 font-bold text-xs px-3 py-1 rounded-full border border-yellow-200">Limitado</span> : <span className="bg-blue-50 text-blue-700 font-bold text-xs px-3 py-1 rounded-full border border-blue-100">Fijo</span>}
                </td>
                <td className="p-4 text-right">
                   <button className="p-2 text-gray-400 hover:text-pink-600 transition-colors"><Edit2 size={18}/></button>
                   <button className="p-2 text-gray-400 hover:text-red-600 transition-colors"><Trash2 size={18}/></button>
                </td>
              </tr>
            ))}
            {designs.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                     <ImageIcon size={32} className="text-gray-300"/>
                     <p>Aún no has subido diseños a la tienda.</p>
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
