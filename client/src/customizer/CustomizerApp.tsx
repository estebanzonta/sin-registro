import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { ChevronLeft, ShoppingCart, ChevronRight, Star, Leaf, Clock, UploadCloud } from 'lucide-react';

export default function CustomizerApp() {
  const [screen, setScreen] = useState<'category' | 'product' | 'customizer'>('category');
  const [initData, setInitData] = useState<any>({ categories: [], colors: [], sizes: [] });
  const [designs, setDesigns] = useState<any[]>([]);

  // Selection state
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('white');
  const [selectedView, setSelectedView] = useState<'front' | 'back'>('front');
  
  // Customizer Config state
  const [price, setPrice] = useState(0);
  const [isValid, setIsValid] = useState(false);
  const [logoState, setLogoState] = useState<{src: string, x: number, y: number, width: number} | null>(null);

  useEffect(() => {
    // 1. Fetch catalog init
    axios.get('/api/catalog/init').then(res => {
      setInitData(res.data);
      // Setup defaults based on API response
      if (res.data.categories?.length > 0 && res.data.categories[0].garmentModels?.length > 0) {
        setSelectedProduct(res.data.categories[0].garmentModels[0]);
      }
    }).catch(console.error);

    axios.get('/api/catalog/designs').then(res => {
      setDesigns(res.data);
    }).catch(console.error);
  }, []);

  // Recalculate config whenever main options change
  useEffect(() => {
    if (selectedProduct && selectedSize && selectedColor) {
      resolveConfiguration();
    }
  }, [selectedProduct, selectedSize, selectedColor, logoState]);

  const resolveConfiguration = async () => {
    try {
      // Find IDs for selected items assuming names match
      // For MVP, if we don't have database actuals, we fallback
      const colorId = initData.colors.find((c:any) => c.name.toLowerCase() === selectedColor.toLowerCase())?.id || 'fake-color';
      const sizeId = initData.sizes.find((s:any) => s.name === selectedSize)?.id || 'fake-size';

      const res = await axios.post('/api/configurator/resolve', {
        garmentModelId: selectedProduct.id,
        sizeId: sizeId,
        colorId: colorId,
        designId: null, // ignoring transfer design for MVP logic simplification
        mainPlacement: 'front' // Simplified
      });
      
      setPrice(res.data.price);
      setIsValid(res.data.valid);
    } catch (e) {
      console.error(e);
      // Fallback if no backend
      if (selectedProduct) {
        setPrice(selectedProduct.basePrice);
        setIsValid(true);
      }
    }
  };

  const currentImage = selectedProduct 
    ? `/model-${selectedProduct.slug || 'oversize'}-${selectedColor}-${selectedView}.png`
    : '/model-oversize.png'; // Fallback

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        setLogoState({ src: evt.target?.result as string, x: 50, y: 50, width: 100 });
      };
      reader.readAsDataURL(file);
    }
  };

  // --- Screens ---

  if (screen === 'category') {
    return (
      <section className="flex flex-col justify-center items-center bg-[#113f27] min-h-screen text-white p-8">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-extrabold mb-2">Sin Registro</h1>
          <p className="opacity-80">Elegí qué querés personalizar hoy</p>
        </div>
        <div className="flex gap-8 w-full max-w-2xl">
          <button onClick={() => setScreen('product')} className="flex-1 h-48 rounded-2xl border border-white/40 bg-white/5 backdrop-blur-md flex flex-col items-center justify-center transition-all hover:-translate-y-2 hover:bg-white/10 hover:border-white">
            <span className="text-2xl font-light tracking-widest text-[#3b82f6]">INDUMENTARIA</span>
          </button>
          <button className="flex-1 h-48 rounded-2xl border border-white/40 bg-white/5 backdrop-blur-md flex flex-col items-center justify-center opacity-40 cursor-not-allowed">
            <span className="text-2xl font-light tracking-widest text-[#3b82f6]">ACCESORIOS</span>
          </button>
        </div>
        <a href="/admin" className="absolute top-4 right-4 text-white/50 hover:text-white underline text-sm">Panel Admin</a>
      </section>
    );
  }

  if (screen === 'product') {
    return (
      <section className="flex flex-col bg-[#113f27] h-screen overflow-hidden relative">
        <header className="flex justify-between p-6 absolute top-0 w-full z-10">
          <button onClick={() => setScreen('category')} className="w-11 h-11 bg-white/90 rounded-xl flex items-center justify-center shadow-lg"><ChevronLeft /></button>
          <button className="w-11 h-11 bg-white/90 rounded-xl flex items-center justify-center shadow-lg"><ShoppingCart /></button>
        </header>

        <div className="flex-1 flex justify-center items-center pb-[45vh]">
           <img src={currentImage} alt="Model" className="max-w-[90%] max-h-[50vh] object-contain drop-shadow-2xl translate-y-8" />
        </div>

        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[600px] h-[48vh] bg-white rounded-t-[40px] px-6 pt-20 pb-6 flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.2)] z-20">
          <div className="mb-4">
            <h2 className="text-2xl font-extrabold text-[#111827]">{selectedProduct?.name || 'REMERA OVERSIZE'}</h2>
          </div>
          <div className="flex gap-6 mb-4 text-sm font-semibold text-gray-800">
            <div className="flex items-center gap-1"><Star size={16} className="text-yellow-400" /> 4.8</div>
            <div className="flex items-center gap-1"><Leaf size={16} className="text-green-500" /> 100% Algodón</div>
            <div className="flex items-center gap-1"><Clock size={16} /> 5-10 Días</div>
          </div>
          <p className="text-gray-500 text-sm mb-4 flex-1">
            {selectedProduct?.description || 'Remera de corte amplio y relajado, ideal para un estilo urbano.'}
          </p>

          <div className="mb-4">
            <h3 className="font-semibold text-[#111827] mb-3">Talles Disponibles</h3>
            <div className="flex gap-3">
              {['S', 'M', 'L', 'XL'].map(s => (
                <button 
                  key={s}
                  onClick={() => setSelectedSize(s)}
                  className={`px-5 py-2 rounded-full border font-semibold transition-all ${selectedSize === s ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-800 border-gray-200 hover:border-gray-900'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <button 
            disabled={!selectedSize}
            onClick={() => setScreen('customizer')}
            className="w-full bg-[#111827] text-white p-4 rounded-full font-bold disabled:opacity-50 disabled:cursor-not-allowed mt-auto"
          >
            Continuar
          </button>
        </div>
      </section>
    );
  }

  // Customizer Screen
  return (
    <section className="bg-[#113f27] h-screen relative overflow-hidden flex flex-col">
      <header className="absolute top-6 left-6 z-50 flex items-center gap-4">
        <button onClick={() => setScreen('product')} className="w-11 h-11 bg-white/90 rounded-xl flex items-center justify-center shadow-lg"><ChevronLeft /></button>
        <div>
          <h1 className="text-2xl text-white font-bold leading-tight">Personalizar</h1>
          <p className="text-white/70 text-sm">{selectedProduct?.name} - Talle {selectedSize}</p>
        </div>
      </header>

      {/* T-Shirt Viewport */}
      <main className="absolute inset-0 flex justify-center items-center pb-[30vh] z-10 pointer-events-none">
        <div className="relative w-[600px] max-w-[90%] h-[600px] flex justify-center items-center pointer-events-none">
          <img src={currentImage} className="absolute inset-0 w-full h-full object-contain pointer-events-none" alt="T-Shirt" />
          
          <div className="absolute top-[25%] left-[30%] w-[40%] h-[50%] border-2 border-dashed border-black/10 z-20 pointer-events-none flex justify-center items-center">
            {logoState && (
              <img src={logoState.src} className="w-[100px] object-contain" alt="Logo" />
            )}
          </div>
        </div>
      </main>

      {/* Floating Controls */}
      <aside className="absolute right-6 top-1/2 -translate-y-[80%] flex flex-col gap-6 z-50">
        <div className="bg-white/15 backdrop-blur-md p-2 rounded-3xl flex flex-col gap-1 shadow-xl border border-white/30">
          <button onClick={()=>setSelectedView('front')} className={`py-4 px-2 writing-vertical rounded-xl font-semibold tracking-widest text-sm transition-all ${selectedView === 'front' ? 'bg-white text-[#113f27] shadow' : 'text-white/60'}`} style={{writingMode: 'vertical-rl'}}>Frente</button>
          <button onClick={()=>setSelectedView('back')} className={`py-4 px-2 writing-vertical rounded-xl font-semibold tracking-widest text-sm transition-all ${selectedView === 'back' ? 'bg-white text-[#113f27] shadow' : 'text-white/60'}`} style={{writingMode: 'vertical-rl'}}>Espalda</button>
        </div>

        <div className="bg-white/15 backdrop-blur-md p-2 rounded-full flex flex-col gap-2 shadow-xl border border-white/30">
          <button onClick={() => setSelectedColor('white')} className={`w-11 h-11 rounded-full bg-white transition-all ${selectedColor === 'white' ? 'ring-4 ring-[#113f27] border-2 border-white' : ''}`}></button>
          <button onClick={() => setSelectedColor('black')} className={`w-11 h-11 rounded-full bg-[#1a1a1a] transition-all ${selectedColor === 'black' ? 'ring-4 ring-white border-2 border-[#1a1a1a]' : ''}`}></button>
        </div>
      </aside>

      {/* Bottom Panel */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[600px] h-[30vh] bg-white rounded-t-[40px] px-6 py-8 flex shadow-[0_-10px_40px_rgba(0,0,0,0.2)] z-30 pointer-events-auto">
        
        <div className="flex-1 flex flex-col justify-center pr-6">
          <h3 className="font-bold text-[#111827] text-lg mb-1">Subí tu diseño</h3>
          <p className="text-gray-500 text-sm mb-3">Arrastrá una imagen o hacé clic</p>
          <div className="flex-1 border-2 border-dashed border-gray-200 rounded-2xl flex justify-center items-center bg-gray-50 text-gray-400 relative hover:border-[#113f27] hover:bg-[#113f27]/5 transition-all">
             <UploadCloud size={32} />
             <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileUpload} />
          </div>
          {logoState && <button className="mt-2 text-red-500 text-sm underline" onClick={() => setLogoState(null)}>Quitar Diseño</button>}
        </div>

        <div className="flex-[0.8] flex flex-col justify-between pl-6 border-l border-gray-100">
          <div>
            <p className="text-gray-500 text-sm">Total Estimado</p>
            <h3 className="text-3xl font-bold text-[#111827]">${price}</h3>
            {!isValid && <p className="text-red-500 text-xs">Sin stock</p>}
          </div>
          <button disabled={!isValid} className="w-full bg-[#111827] text-white p-4 rounded-xl font-bold disabled:opacity-50">
            Comprar Ahora
          </button>
        </div>

      </div>
    </section>
  );
}
