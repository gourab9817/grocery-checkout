import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { ShoppingBasket, Menu, X, Leaf } from 'lucide-react';
import { useCartContext } from '../lib/cartContext.jsx';

const NAV_LINKS = [
  { to: '/',        label: 'Shop' },
  { to: '/orders',  label: 'Orders' },
];

export function Navbar() {
  const { itemCount } = useCartContext();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 bg-canvas/90 backdrop-blur-md border-b border-stone">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-full bg-forest flex items-center justify-center transition-transform duration-300 group-hover:rotate-12">
              <Leaf size={14} strokeWidth={1.5} className="text-canvas" />
            </div>
            <span className="font-serif font-bold text-forest text-xl tracking-tight">
              Ansrmart
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ` +
                  (isActive
                    ? 'bg-forest text-canvas'
                    : 'text-forest/70 hover:text-forest hover:bg-parchment')
                }
              >
                {label}
              </NavLink>
            ))}
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ` +
                (isActive
                  ? 'bg-forest text-canvas'
                  : 'text-forest/70 hover:text-forest hover:bg-parchment')
              }
            >
              Admin
            </NavLink>
          </nav>

          {/* Cart + mobile toggle */}
          <div className="flex items-center gap-3">
            <Link
              to="/cart"
              className="relative flex items-center gap-2 px-4 py-2 rounded-full bg-parchment border border-stone text-forest text-sm font-medium transition-all duration-300 hover:bg-clay/30 hover:border-clay"
            >
              <ShoppingBasket size={16} strokeWidth={1.5} />
              <span className="hidden sm:inline">Cart</span>
              {itemCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-terra text-white text-[10px] font-bold flex items-center justify-center leading-none">
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
            </Link>

            <button
              className="md:hidden p-2 rounded-full hover:bg-parchment transition-colors duration-300"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Toggle menu"
            >
              {menuOpen ? <X size={20} strokeWidth={1.5} /> : <Menu size={20} strokeWidth={1.5} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile overlay */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-30 bg-canvas/95 backdrop-blur-sm md:hidden flex flex-col pt-20 px-8"
          onClick={() => setMenuOpen(false)}
        >
          <nav className="flex flex-col gap-2">
            {[...NAV_LINKS, { to: '/cart', label: 'Cart' }, { to: '/admin', label: 'Admin' }].map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `px-6 py-4 rounded-2xl text-xl font-serif font-semibold transition-all duration-300 ` +
                  (isActive ? 'bg-forest text-canvas' : 'text-forest hover:bg-parchment')
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}
