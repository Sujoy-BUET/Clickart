import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogIn, Eye, EyeOff, Store } from 'lucide-react';
import { loginSeller } from '../api';
import { useAuth } from '../context/AuthContext';

export default function SellerLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [sellerName, setSellerName] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (location.state?.message) {
      setSuccess(location.state.message);
    }
  }, [location.state]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    
    try {
      const response = await loginSeller({
        seller_name: sellerName,
        seller_password: password
      });
      
      if (response.success) {
        const sellerData = { ...response.data, type: 'seller' };
        login(sellerData);
        navigate('/seller/dashboard');
      } else {
        setError(response.message || 'Login failed');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 text-2xl text-white mb-4">
            <Store className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold">Seller Login</h1>
          <p className="mt-2 text-sm text-gray-500">Access your ClicKart seller dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-800 bg-gray-900 p-6 sm:p-8 space-y-5">
          {success && (
            <div className="rounded-lg bg-green-500/10 border border-green-500/20 px-4 py-2.5 text-sm text-green-400">
              {success}
            </div>
          )}
          
          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-2.5 text-sm text-red-400">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Seller Name</label>
            <input
              type="text"
              required
              value={sellerName}
              onChange={(e) => setSellerName(e.target.value)}
              placeholder="Your seller name"
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 pr-10 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-500 transition disabled:opacity-50"
          >
            <LogIn className="h-4 w-4" />
            {loading ? 'Signing in...' : 'Sign In as Seller'}
          </button>
        </form>

        <div className="space-y-3 text-center text-sm text-gray-500">
          <p>
            Don't have a seller account?{' '}
            <Link to="/seller/register" className="text-emerald-400 hover:text-emerald-300 font-medium transition">
              Register as Seller
            </Link>
          </p>
          <p>
            Looking for customer login?{' '}
            <Link to="/login" className="text-violet-400 hover:text-violet-300 font-medium transition">
              Customer Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}