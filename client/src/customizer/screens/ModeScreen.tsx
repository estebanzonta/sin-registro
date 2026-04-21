import { ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';
import logoAssetUrl from '../../assets/Logo.svg';

type Props = {
  onSelectBrandDesign: () => void;
  onSelectUserUpload: () => void;
};

export default function ModeScreen({ onSelectBrandDesign, onSelectUserUpload }: Props) {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center bg-black p-8 text-white">
      <div className="fixed top-[18%] left-1/2 w-[40vw] -translate-x-1/2 opacity-70 pointer-events-none">
        <img src={logoAssetUrl} alt="Logo" className="mx-auto h-auto w-full" />
      </div>
      <header className="absolute top-0 z-10 flex w-full justify-between p-6">
        <div className="h-11 w-11" />
        <Link to="/cart" className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/90 text-black shadow-lg">
          <ShoppingCart />
        </Link>
      </header>
      <div className="relative z-10 mt-28 mb-8 text-center">
        <p className="text-base font-medium opacity-80" style={{ fontFamily: 'var(--font-body)' }}>Elegí como queres vestirte hoy</p>
      </div>
      <div className="relative z-10 flex w-full max-w-2xl gap-8">
        <button
          onClick={onSelectBrandDesign}
          className="flex h-48 flex-1 items-center justify-center rounded-2xl bg-white/5 text-2xl font-extrabold tracking-widest"
          style={{ fontFamily: 'var(--font-heading)', color: '#ffffff' }}
        >
          DE LA CASA
        </button>
        <button
          onClick={onSelectUserUpload}
          className="flex h-48 flex-1 items-center justify-center rounded-2xl bg-white/5 text-2xl font-extrabold tracking-widest"
          style={{ fontFamily: 'var(--font-heading)', color: '#ffffff' }}
        >
          MODO CREADOR
        </button>
      </div>
    </section>
  );
}
