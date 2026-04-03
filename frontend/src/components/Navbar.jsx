import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingCart, User, Store, Home, Package, Menu, X, LogOut } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAuthenticated, isSeller, isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const cartTo = user?.user_id ? `/cart/${user.user_id}` : '/login';

  const links = isAdmin() ? [
    { to: '/', label: 'Home', icon: Home },
    { to: '/products', label: 'Products', icon: Package },
    { to: '/sellers', label: 'Sellers', icon: Store },
    { to: '/admin/dashboard', label: 'Admin Dashboard', icon: Store },
    { to: '/admin/profile', label: 'Update Profile', icon: User },
  ] : isSeller() ? [
    { to: '/',         label: 'Home',      icon: Home },
    { to: '/products', label: 'Products',  icon: Package },
    { to: '/seller/dashboard', label: 'Dashboard', icon: Store },
    { to: '/sellers',  label: 'Sellers',   icon: Store },
    { to: '/seller/profile',   label: 'Profile',   icon: User },
  ] : [
    { to: '/',         label: 'Home',     icon: Home },
    { to: '/products', label: 'Products', icon: Package },
    { to: user?.user_id ? `/orders/user/${user.user_id}` : '/login', label: 'Orders', icon: Package },
    { to: '/sellers',  label: 'Sellers',  icon: Store },
    { to: '/profile',  label: 'Profile',  icon: User },
  ];

  const isActive = (to) => pathname === to;

  const handleLogout = () => {
    logout();
    setOpen(false);
    navigate('/');
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-800 bg-gray-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 text-xl font-bold tracking-tight">
          <span className="rounded-lg bg-violet-600 px-2 py-0.5 text-white">Clic</span>
          <span className="text-gray-100">Kart</span>
        </Link>

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
          {!isSeller() && !isAdmin() && (
            <Link
              to={cartTo}
              className={`ml-1 flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive(cartTo) ? 'bg-violet-600/20 text-violet-400' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
              }`}
            >
              <ShoppingCart className="h-4 w-4" />
              Cart
            </Link>
          )}
          {isAuthenticated() ? (
            <div className="ml-2 flex items-center gap-2">
              <span className="text-sm text-gray-300">
                Hi, {isAdmin() ? user.admin_name || 'Admin' : isSeller() ? user.store_name || `${user.first_name} ${user.last_name}` : user.user_name}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 transition"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="ml-2 flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 transition"
            >
              <User className="h-4 w-4" />
              Login
            </Link>
          )}
        </div>

        {/* Mobile hamburger */}
        <div className="md:hidden flex items-center gap-1">
          {!isSeller() && !isAdmin() && (
            <Link to={cartTo} className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-gray-200">
              <ShoppingCart className="h-5 w-5" />
            </Link>
          )}
          <button onClick={() => setOpen(!open)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-800">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-gray-800 bg-gray-950 px-4 pb-4 pt-2">
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
          {isAuthenticated() ? (
            <div className="mt-2 space-y-2">
              <div className="px-3 py-2 text-sm text-gray-300">
                Hi, {isAdmin() ? user.admin_name || 'Admin' : isSeller() ? user.store_name || `${user.first_name} ${user.last_name}` : user.user_name}
              </div>
              <button
                onClick={handleLogout}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-500 transition"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              onClick={() => setOpen(false)}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-500 transition"
            >
              <User className="h-4 w-4" />
              Login
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
