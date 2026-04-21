import type { ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';
import type { AppSession } from '../../App';
import StorefrontTopBar from '../../storefront/StorefrontTopBar';

type Props = {
  isDarkGarment: boolean;
  productName?: string;
  session: AppSession | null;
  cartCount: number;
  selectedModeLabel: string;
  selectedContentLabel: string;
  selectedViewLabel: string;
  transferSummary: string;
  totalPrice: string;
  configurationCode: string;
  stockValidationMessage: string | null;
  isInvalid: boolean;
  saving: boolean;
  customizerActionDisabled: boolean;
  customizerDisabledReason: string | null;
  saveError: string | null;
  leftSidebar: ReactNode;
  mainContent: ReactNode;
  desktopViewSelector: ReactNode;
  mobileControls: ReactNode;
  onBack: () => void;
  onLogout: () => void;
  onAddToCart: () => void;
};

export default function CustomizerScreen({
  isDarkGarment,
  productName,
  session,
  cartCount,
  selectedModeLabel,
  selectedContentLabel,
  selectedViewLabel,
  transferSummary,
  totalPrice,
  configurationCode,
  stockValidationMessage,
  isInvalid,
  saving,
  customizerActionDisabled,
  customizerDisabledReason,
  saveError,
  leftSidebar,
  mainContent,
  desktopViewSelector,
  mobileControls,
  onBack,
  onLogout,
  onAddToCart,
}: Props) {
  return (
    <section className={`relative flex min-h-screen flex-col overflow-hidden lg:h-screen ${isDarkGarment ? 'bg-white' : 'bg-black'}`}>
      <header className="absolute left-4 top-4 z-50 flex items-center gap-4 lg:left-6 lg:top-6"><button onClick={onBack} className={`flex h-11 w-11 items-center justify-center rounded-xl shadow-lg ${isDarkGarment ? 'border border-black/10 bg-white text-[#111827]' : 'bg-white/90 text-[#111827]'}`}><ChevronLeft /></button><div><h1 className={`text-2xl font-bold ${isDarkGarment ? 'text-[#111827]' : 'text-white'}`}>Personalizar</h1><p className={`text-sm ${isDarkGarment ? 'text-gray-500' : 'text-white/70'}`}>{productName}</p></div></header>
      <aside className="absolute right-4 top-4 z-50 lg:right-6 lg:top-6">
        <StorefrontTopBar session={session} onLogout={onLogout} cartCount={cartCount} tone="dark" />
      </aside>
      {leftSidebar}
      <main className="relative z-10 flex flex-1 items-start justify-center px-4 pb-[22rem] pt-24 sm:pb-[18rem] lg:pb-[8rem] lg:pt-20">{mainContent}</main>
      <aside className="absolute right-4 top-[45%] z-50 hidden -translate-y-[80%] flex-col gap-6 lg:right-6 lg:flex">{desktopViewSelector}</aside>
      <div className="absolute bottom-[9.75rem] left-4 right-4 z-30 space-y-3 lg:hidden">{mobileControls}</div>
      <div className="relative z-30 mt-auto flex w-full max-w-[760px] flex-col overflow-hidden rounded-t-[34px] bg-white px-5 py-3 shadow-[0_-10px_40px_rgba(0,0,0,0.2)] lg:absolute lg:bottom-0 lg:left-1/2 lg:w-[92vw] lg:max-w-[760px] lg:-translate-x-1/2 lg:flex-row lg:rounded-t-[40px] lg:px-6 lg:py-3">
        <div className="min-w-0 flex flex-1 flex-col justify-center pr-0 lg:pr-6">
          <h3 className="mb-1 text-lg font-bold text-[#111827]">Composición final</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700">{selectedModeLabel}</span>
            <span className="max-w-full truncate rounded-full bg-gray-100 px-4 py-2 text-sm text-gray-700">{selectedContentLabel}</span>
            <span className="rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700">{selectedViewLabel}</span>
          </div>
          <p className="mt-2 text-xs text-gray-500">{transferSummary}</p>
        </div>
        <div className="mt-3 flex w-full flex-col justify-between border-t border-gray-100 pt-3 lg:mt-0 lg:w-[250px] lg:flex-none lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <div>
            <p className="text-sm text-gray-500">Total estimado</p>
            <h3 className="text-3xl font-bold text-[#111827]">{totalPrice}</h3>
            <p className="mt-1 break-all text-xs text-gray-500">{configurationCode || 'Configuración pendiente'}</p>
            {stockValidationMessage ? <p className={`mt-1 text-xs ${isInvalid ? 'text-red-500' : 'text-amber-600'}`}>{stockValidationMessage}</p> : null}
          </div>
          {session ? (
            <>
              <button disabled={customizerActionDisabled} onClick={onAddToCart} className="mt-3 w-full rounded-xl bg-[#111827] p-3 font-bold text-white disabled:opacity-50">{saving ? 'Guardando...' : 'Comprar ahora'}</button>
              {customizerDisabledReason ? <p className="mt-2 text-xs text-amber-700">{customizerDisabledReason}</p> : null}
            </>
          ) : null}
          {saveError ? <p className="mt-2 text-sm text-rose-600">{saveError}</p> : null}
        </div>
      </div>
    </section>
  );
}
