import React from 'react';
import { BrowserRouter, Routes, Route, Link, Outlet } from 'react-router-dom';
import { LayoutDashboard, Shirt, Image as ImageIcon, PackageSearch, Settings } from 'lucide-react';

import GarmentModelsAdmin from './admin/GarmentModelsAdmin';
import DesignsAdmin from './admin/DesignsAdmin';
import BlankStockAdmin from './admin/BlankStockAdmin';
import CustomizerApp from './customizer/CustomizerApp';

// --- Admin Components ---
const AdminLayout = () => (
  <div className="flex h-screen bg-gray-50 font-sans text-gray-800">
    <aside className="w-72 bg-white border-r border-gray-200 flex flex-col shadow-sm hidden md:flex">
      <div className="p-6 border-b border-gray-100 flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">A</div>
        <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-600">Panel Admin</h2>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-4">Gestión</p>
        <Link to="/admin" className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-xl transition-colors font-medium">
          <LayoutDashboard size={20} className="text-blue-500" /> Resumen
        </Link>
        <Link to="/admin/models" className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-xl transition-colors font-medium">
          <Shirt size={20} className="text-purple-500" /> Modelos base
        </Link>
        <Link to="/admin/designs" className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-xl transition-colors font-medium">
          <ImageIcon size={20} className="text-pink-500" /> Diseños de Marca
        </Link>
        <Link to="/admin/stock" className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-xl transition-colors font-medium">
          <PackageSearch size={20} className="text-emerald-500" /> Stock Lisas
        </Link>
      </nav>
      <div className="p-4 border-t border-gray-100">
        <Link to="/" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-500 hover:text-gray-900 transition-colors">
          ← Volver a la Tienda
        </Link>
      </div>
    </aside>
    <main className="flex-1 flex flex-col h-screen overflow-hidden">
      <header className="h-16 bg-white border-b border-gray-200 flex items-center px-8 shadow-sm justify-between">
        <h1 className="text-lg font-semibold text-gray-700">Administración</h1>
        <div className="flex items-center gap-4">
          <button className="text-gray-400 hover:text-gray-600"><Settings size={20} /></button>
          <div className="w-8 h-8 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-sm">EB</div>
        </div>
      </header>
      <div className="flex-1 overflow-auto p-8 bg-gray-50/50">
        <div className="max-w-6xl mx-auto">
          <Outlet />
        </div>
      </div>
    </main>
  </div>
);

const Dashboard = () => (
  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
    <div className="flex items-center justify-between mb-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">¡Hola de nuevo!</h1>
        <p className="text-gray-500 mt-1">Aquí está el resumen de tu inventario y pedidos.</p>
      </div>
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Pedidos Pendientes</h3>
          <p className="text-4xl font-extrabold text-blue-600 mt-2">12</p>
        </div>
        <div className="p-3 bg-blue-50 rounded-xl text-blue-600"><PackageSearch size={24} /></div>
      </div>
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Lisas con bajo stock</h3>
          <p className="text-4xl font-extrabold text-amber-500 mt-2">4</p>
        </div>
        <div className="p-3 bg-amber-50 rounded-xl text-amber-500"><Shirt size={24} /></div>
      </div>
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Ingresos del Mes</h3>
          <p className="text-4xl font-extrabold text-emerald-600 mt-2">$340k</p>
        </div>
        <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600"><LayoutDashboard size={24} /></div>
      </div>
    </div>
  </div>
);


export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Storefront */}
        <Route path="/" element={<CustomizerApp />} />
        
        {/* Admin Area */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="models" element={<GarmentModelsAdmin />} />
          <Route path="designs" element={<DesignsAdmin />} />
          <Route path="stock" element={<BlankStockAdmin />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
