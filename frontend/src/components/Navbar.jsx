import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart, Search, User, Store, Home, Package, Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function Navbar() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  const links = [
    { to: '/',         label: 'Home',     icon: Home },
    { to: '/products', label: 'Products', icon: Package },
    { to: '/cart/1',   label: 'Cart',     icon: ShoppingCart },
    { to: '/orders/user/1', label: 'Orders', icon: Package },
    { to: '/sellers',  label: 'Sellers',  icon: Store },
  ];

  const isActive = (to) => pathname === to;

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-800 bg-gray-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 text-xl font-bold tracking-tight">
          <span className="rounded-lg bg-violet-600 px-2 py-0.5 text-white">Clic</span>
          <span className="text-gray-100">Kart</span>
        </Link>

        {/* Search bar (desktop) */}
        <div className="hidden md:flex mx-4 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search products..."
              className="w-full rounded-lg border border-gray-700 bg-gray-900 py-2 pl-10 pr-4 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition"
            />
          </div>
        </div>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {links.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition
                ${isActive(to) ? 'bg-violet-600/20 text-violet-400' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
          <Link
            to="/login"
            className="ml-2 flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 transition"
          >
            <User className="h-4 w-4" />
            Login
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button onClick={() => setOpen(!open)} className="md:hidden rounded-lg p-2 text-gray-400 hover:bg-gray-800">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-gray-800 bg-gray-950 px-4 pb-4 pt-2">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search products..."
              className="w-full rounded-lg border border-gray-700 bg-gray-900 py-2 pl-10 pr-4 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-violet-500"
            />
          </div>
          {links.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition
                ${isActive(to) ? 'bg-violet-600/20 text-violet-400' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
          <Link
            to="/login"
            onClick={() => setOpen(false)}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-500 transition"
          >
            <User className="h-4 w-4" />
            Login
          </Link>
        </div>
      )}
    </nav>
  );
}
