import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Store, Mail, Phone, MapPin, Star, Package, Plus, Edit, Trash2 } from 'lucide-react';
import { getSeller, getSellerReviews, getProducts } from '../api';
import { useAuth } from '../context/AuthContext';
import StarRating from '../components/StarRating';
import LoadingSpinner from '../components/LoadingSpinner';

export default function SellerDashboardPage() {
  const { sellerId } = useParams();
  const navigate = useNavigate();
  const { user, isSeller, isAuthenticated } = useAuth();
  const [seller, setSeller] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('products');

  // Determine which seller to show
  const targetSellerId = sellerId || (isSeller() ? user?.seller_id : null);

  useEffect(() => {
    // Redirect if not authenticated and accessing /seller/dashboard
    if (!sellerId && !isAuthenticated()) {
      navigate('/seller/login');
      return;
    }
    
    // Redirect if not a seller and accessing /seller/dashboard
    if (!sellerId && !isSeller()) {
      navigate('/login');
      return;
    }

    if (!targetSellerId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    Promise.all([
      getSeller(targetSellerId),
      getSellerReviews(targetSellerId).catch(() => []),
      getProducts().catch(() => []),
    ])
      .then(([s, r, p]) => {
        setSeller(s.data || s);
        setReviews(Array.isArray(r) ? r : []);
        const all = Array.isArray(p) ? p : [];
        setProducts(all.filter((x) => x.seller_id === Number(targetSellerId)));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [targetSellerId, sellerId, isAuthenticated, isSeller, navigate]);

  if (loading) return <LoadingSpinner />;
  
  if (!seller) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 space-y-4">
        <Store className="w-12 h-12 text-gray-400" />
        <h2 className="text-xl font-semibold text-gray-600">Seller not found</h2>
        <p className="text-gray-500">The seller you're looking for doesn't exist.</p>
        <Link to="/sellers" className="text-emerald-600 hover:underline">
          Browse all sellers
        </Link>
      </div>
    );
  }

  const isOwnDashboard = !sellerId && isSeller() && targetSellerId === user?.seller_id;

  const tabs = [
    { key: 'products', label: 'Products', count: products.length },
    { key: 'reviews', label: 'Reviews', count: reviews.length },
    { key: 'info', label: 'Info' },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start gap-6 mb-8">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-3xl font-bold text-white shadow-lg shadow-violet-600/20">
          {seller.store_name?.[0] ?? 'S'}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">{seller.store_name}</h1>
            {seller.is_verified && (
              <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-400">
                Verified Seller
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-400">{seller.first_name} {seller.last_name}</p>
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1"><Package className="h-4 w-4" /> {products.length} products</span>
            <span className="flex items-center gap-1"><Star className="h-4 w-4 text-amber-400" /> {reviews.length} reviews</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-800 mb-8">
        {tabs.map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-3 text-sm font-medium transition border-b-2 -mb-px ${
              tab === key
                ? 'border-violet-500 text-violet-400'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            {label} {count !== undefined && <span className="ml-1 text-xs text-gray-600">({count})</span>}
          </button>
        ))}
      </div>

      {/* Products tab */}
      {tab === 'products' && (
        <div>
          {/* Add Product Button - only show on own dashboard */}
          {isOwnDashboard && (
            <div className="mb-6">
              <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition">
                <Plus className="w-4 h-4" />
                Add Product
              </button>
            </div>
          )}
          
          {products.length === 0 ? (
            <div className="text-center py-10">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">
                {isOwnDashboard ? "You haven't listed any products yet." : "No products listed yet."}
              </p>
              {isOwnDashboard && (
                <button className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition">
                  List Your First Product
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {products.map((p) => (
                <div
                  key={p.product_id}
                  className="flex items-center gap-4 rounded-xl border border-gray-800 bg-gray-900 p-4 transition hover:border-gray-700"
                >
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-gray-800 text-lg font-bold text-gray-600">
                    {p.product_name?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link to={`/products/${p.product_id}`} className="text-sm font-semibold text-gray-100 hover:text-violet-400 transition truncate block">
                      {p.product_name}
                    </Link>
                    <p className="text-xs text-gray-500">{p.brand_name} · {p.category_name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-violet-400">₹{Number(p.price).toLocaleString('en-IN')}</span>
                    {isOwnDashboard && (
                      <div className="flex gap-1">
                        <button className="p-1 text-gray-400 hover:text-blue-400 transition">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button className="p-1 text-gray-400 hover:text-red-400 transition">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reviews tab */}
      {tab === 'reviews' && (
        <div>
          {reviews.length === 0 ? (
            <p className="text-center text-sm text-gray-600 py-10">No reviews yet.</p>
          ) : (
            <div className="space-y-4">
              {reviews.map((r, i) => (
                <div key={r.review_id ?? i} className="rounded-xl border border-gray-800 bg-gray-900 p-5">
                  <div className="flex items-center justify-between mb-2">
                    <StarRating rating={r.rating} size={14} />
                    <span className="text-xs text-gray-600">{r.created_at ? new Date(r.created_at).toLocaleDateString() : ''}</span>
                  </div>
                  <p className="text-sm text-gray-300">{r.comment}</p>
                  {r.first_name && <p className="mt-2 text-xs text-gray-500">— {r.first_name} {r.last_name ?? ''}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Info tab */}
      {tab === 'info' && (
        <div className="space-y-4">
          {/* Emails */}
          {seller.emails?.length > 0 && (
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-3"><Mail className="h-4 w-4 text-violet-400" /> Email Addresses</h3>
              <div className="space-y-1">
                {seller.emails.map((e, i) => (
                  <p key={i} className="text-sm text-gray-400">{e.email ?? e}</p>
                ))}
              </div>
            </div>
          )}

          {/* Phones */}
          {seller.phones?.length > 0 && (
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-3"><Phone className="h-4 w-4 text-violet-400" /> Phone Numbers</h3>
              <div className="space-y-1">
                {seller.phones.map((p, i) => (
                  <p key={i} className="text-sm text-gray-400">{p.phone ?? p}</p>
                ))}
              </div>
            </div>
          )}

          {/* Addresses */}
          {seller.addresses?.length > 0 && (
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-3"><MapPin className="h-4 w-4 text-violet-400" /> Addresses</h3>
              <div className="space-y-2">
                {seller.addresses.map((a, i) => (
                  <p key={i} className="text-sm text-gray-400">
                    {a.address_line}, {a.city} — {a.postal_code}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
