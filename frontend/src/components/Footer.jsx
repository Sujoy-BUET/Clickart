import { Link } from 'react-router-dom';
import { Github, Twitter, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Footer() {
  const { user, isSeller } = useAuth();

  const accountLinks = [
    { label: 'Login', to: '/login' },
    { label: 'Register', to: '/register' },
    { label: 'My Orders', to: user?.user_id ? `/orders/user/${user.user_id}` : '/login' },
  ];

  const sellerLinks = [
    { label: 'Seller Dashboard', to: isSeller() ? '/seller/dashboard' : '/seller/login' },
    { label: 'Become a Seller', to: '/seller/register' },
    { label: 'All Sellers', to: '/sellers' },
  ];

  return (
    <footer className="border-t border-gray-800 bg-gray-950 mt-auto">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <Link to="/" className="flex items-center gap-2 text-xl font-bold tracking-tight">
              <span className="rounded-lg bg-violet-600 px-2 py-0.5 text-white">Clic</span>
              <span className="text-gray-100">Kart</span>
            </Link>
            <p className="mt-3 text-sm text-gray-500 leading-relaxed">
              Your one-stop shop for the latest electronics, fashion, and lifestyle products.
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Shop</h4>
            <ul className="mt-3 space-y-2">
              {['All Products', 'Electronics', 'Fashion', 'Home & Living'].map((item) => (
                <li key={item}>
                  <Link to="/products" className="text-sm text-gray-500 hover:text-violet-400 transition">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Account */}
          <div>
            <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Account</h4>
            <ul className="mt-3 space-y-2">
              {accountLinks.map(({ label, to }) => (
                <li key={label}>
                  <Link to={to} className="text-sm text-gray-500 hover:text-violet-400 transition">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Sellers */}
          <div>
            <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Sellers</h4>
            <ul className="mt-3 space-y-2">
              {sellerLinks.map(({ label, to }) => (
                <li key={label}>
                  <Link to={to} className="text-sm text-gray-500 hover:text-violet-400 transition">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-gray-800 pt-8 sm:flex-row">
          <p className="text-xs text-gray-600">&copy; {new Date().getFullYear()} ClicKart. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <a href="#" className="text-gray-600 hover:text-violet-400 transition"><Github className="h-4 w-4" /></a>
            <a href="#" className="text-gray-600 hover:text-violet-400 transition"><Twitter className="h-4 w-4" /></a>
            <a href="#" className="text-gray-600 hover:text-violet-400 transition"><Mail className="h-4 w-4" /></a>
          </div>
        </div>
      </div>
    </footer>
  );
}
