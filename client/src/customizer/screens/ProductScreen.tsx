import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight, ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';

type Props = {
  currentImage: string;
  productName: string;
  productDescription: string;
  productIndex: number;
  productsCount: number;
  sizeSelector: ReactNode;
  colorDesktop: ReactNode;
  colorMobile: ReactNode;
  canContinue: boolean;
  onBack: () => void;
  onPrev: () => void;
  onNext: () => void;
  onContinue: () => void;
};

export default function ProductScreen({
  currentImage,
  productName,
  productDescription,
  productIndex,
  productsCount,
  sizeSelector,
  colorDesktop,
  colorMobile,
  canContinue,
  onBack,
  onPrev,
  onNext,
  onContinue,
}: Props) {
  return (
    <section className="relative flex h-screen flex-col overflow-hidden bg-black">
      <header className="absolute top-0 z-10 flex w-full justify-between p-6"><button onClick={onBack} className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/90 shadow-lg"><ChevronLeft /></button><Link to="/cart" className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/90 shadow-lg"><ShoppingCart /></Link></header>
      <div className="relative flex flex-1 items-center justify-center px-4 pb-[34vh] sm:px-8 lg:px-16">
        <button type="button" onClick={onPrev} disabled={productsCount < 2} className="absolute left-4 top-1/2 z-30 flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full border border-black/10 bg-white/95 text-gray-700 shadow-lg transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40 sm:left-6 lg:left-[10%] lg:h-16 lg:w-16">
          <ChevronLeft size={28} />
        </button>
        <img src={currentImage} alt="Model" className="relative z-10 max-h-[50vh] max-w-[82%] translate-y-8 object-contain drop-shadow-2xl sm:max-w-[74%] lg:max-w-[62%]" />
        <button type="button" onClick={onNext} disabled={productsCount < 2} className="absolute right-4 top-1/2 z-30 flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full border border-black/10 bg-white/95 text-gray-700 shadow-lg transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40 sm:right-6 lg:right-[10%] lg:h-16 lg:w-16">
          <ChevronRight size={28} />
        </button>
      </div>
      <div className="absolute bottom-0 left-1/2 z-20 flex min-h-[24vh] w-full max-w-[600px] -translate-x-1/2 flex-col rounded-t-[40px] bg-white px-6 pb-4 pt-4 shadow-[0_-10px_40px_rgba(0,0,0,0.2)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500">Indumentaria</p>
            <h2 className="mt-2 text-[1.9rem] font-extrabold uppercase leading-none tracking-[0.06em] text-[#111827]" style={{ fontFamily: 'var(--font-heading)' }}>{productName}</h2>
            <p className="mt-2 text-sm text-gray-500">{productDescription}</p>
          </div>
          {productsCount > 1 ? <p className="shrink-0 text-sm font-medium text-gray-400">{productIndex} / {productsCount}</p> : null}
        </div>
        {sizeSelector}
        <button disabled={!canContinue} onClick={onContinue} className="w-full rounded-2xl bg-[#111827] px-6 py-3.5 text-sm font-extrabold uppercase tracking-[0.12em] text-white disabled:opacity-50" style={{ fontFamily: 'var(--font-heading)' }}>Continuar</button>
      </div>
      <aside className="absolute right-4 top-[45%] z-40 hidden -translate-y-1/2 md:flex lg:right-6">{colorDesktop}</aside>
      <div className="absolute bottom-[12.5rem] left-4 right-4 z-30 md:hidden">{colorMobile}</div>
    </section>
  );
}
