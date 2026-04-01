import { Link } from 'react-router-dom';
import type { AppSession } from '../App';

type Tone = 'dark' | 'light';

function navClass(tone: Tone, solid = false) {
  if (tone === 'dark') {
    return solid
      ? 'rounded-full bg-white px-4 py-2 text-sm text-[#113f27]'
      : 'rounded-full bg-white/10 px-4 py-2 text-sm text-white';
  }

  return solid
    ? 'rounded-full bg-stone-900 px-4 py-2 text-sm text-white'
    : 'rounded-full border border-stone-200 bg-white px-4 py-2 text-sm text-stone-700';
}

export default function StorefrontTopBar({
  session,
  onLogout,
  cartCount,
  tone = 'dark',
}: {
  session: AppSession | null;
  onLogout: () => void;
  cartCount?: number;
  tone?: Tone;
}) {
  const isCustomer = session?.user.role === 'customer';

  return (
    <div className="flex flex-wrap items-center gap-3">
      {isCustomer ? (
        <Link to="/auth" className={navClass(tone)}>
          {session.user.email}
        </Link>
      ) : null}

      {!session ? (
        <Link to="/auth" className={navClass(tone)}>
          Ingresar
        </Link>
      ) : null}

      {session ? (
        <button onClick={onLogout} className={navClass(tone)}>
          Salir
        </button>
      ) : null}

      {typeof cartCount === 'number' ? (
        <Link to="/cart" className={navClass(tone, true)}>
          Carrito {cartCount}
        </Link>
      ) : null}

      {isCustomer ? (
        <Link to="/orders" className={navClass(tone)}>
          Mis pedidos
        </Link>
      ) : null}
    </div>
  );
}
