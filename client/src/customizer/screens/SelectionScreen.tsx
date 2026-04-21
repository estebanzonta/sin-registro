import type { ReactNode } from 'react';
import { ChevronLeft, ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';

type Props = {
  title: string;
  subtitle: string;
  body: ReactNode;
  footerText: string;
  proceedDisabled: boolean;
  onBack: () => void;
  onProceed: () => void;
};

export default function SelectionScreen({ title, subtitle, body, footerText, proceedDisabled, onBack, onProceed }: Props) {
  return (
    <section className="relative flex min-h-screen flex-col overflow-hidden bg-black">
      <header className="absolute top-0 z-10 flex w-full justify-between p-6"><button onClick={onBack} className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/90 shadow-lg"><ChevronLeft /></button><Link to="/cart" className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/90 shadow-lg"><ShoppingCart /></Link></header>
      <div className="flex flex-1 items-center justify-center px-4 pb-10 pt-28">
        <div className="w-full max-w-5xl rounded-lg bg-white p-6 shadow-[0_24px_60px_rgba(0,0,0,0.22)] lg:p-8">
          <h2 className="text-3xl font-extrabold text-[#111827]">{title}</h2>
          <p className="mt-2 text-sm text-gray-500">{subtitle}</p>
          {body}
          <div className="mt-8 flex items-center justify-between gap-4 pt-6">
            <div className="text-sm text-gray-500">{footerText}</div>
            <button disabled={proceedDisabled} onClick={onProceed} className="rounded-md bg-[#111827] px-6 py-3 font-bold text-white disabled:opacity-50">Ir al mockup</button>
          </div>
        </div>
      </div>
    </section>
  );
}
