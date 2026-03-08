import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Truck, ShieldCheck, CreditCard, Headphones } from 'lucide-react';
import { getProducts } from '../api';
import { useAuth } from '../context/AuthContext';
import ProductCard from '../components/ProductCard';
import LoadingSpinner from '../components/LoadingSpinner';

const features = [
  { icon: Truck, title: 'Free Shipping', desc: 'On orders above ₹499' },
  { icon: ShieldCheck, title: 'Secure Payments', desc: '256-bit SSL encryption' },
  { icon: CreditCard, title: 'Easy Returns', desc: '7-day return policy' },
  { icon: Headphones, title: '24/7 Support', desc: 'Dedicated help centre' },
];

export default function HomePage() {
  const { isSeller } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProducts()
      .then((d) => setProducts(d.slice(0, 8)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-900/30 via-gray-950 to-gray-950" />
        <div className="relative mx-auto max-w-7xl px-4 py-28 sm:px-6 lg:px-8 text-center">
          <span className="inline-block rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-violet-400 mb-6">
            New Arrivals 2025
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
            Discover Products You'll <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">Absolutely Love</span>
          </h1>
          <p className="mt-5 text-lg text-gray-400 max-w-2xl mx-auto">
            Shop the latest electronics, fashion, and lifestyle essentials — all in one place.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/products"
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-7 py-3 text-sm font-semibold text-white hover:bg-violet-500 transition shadow-lg shadow-violet-600/20"
            >
              Shop Now <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-700 px-7 py-3 text-sm font-semibold text-gray-300 hover:bg-gray-800 transition"
            >
              Create Account
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-y border-gray-800 bg-gray-900/50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-600/15 text-violet-400">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-200">{title}</p>
                  <p className="text-xs text-gray-500">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold">Featured Products</h2>
            <p className="mt-1 text-sm text-gray-500">Handpicked just for you</p>
          </div>
          <Link to="/products" className="flex items-center gap-1 text-sm font-medium text-violet-400 hover:text-violet-300 transition">
            View All <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {products.map((p) => (
              <ProductCard key={p.product_id} product={p} />
            ))}
          </div>
        )}
      </section>

      {/* CTA */}
      {!isSeller() && (
        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-2xl border border-gray-800 bg-gradient-to-br from-violet-900/20 via-gray-900 to-gray-900 p-10 text-center lg:p-14">
            <h2 className="text-2xl lg:text-3xl font-bold">Start Selling on ClicKart</h2>
            <p className="mt-3 text-gray-400 max-w-lg mx-auto">
              Join thousands of sellers and reach millions of customers. Easy setup, powerful tools, and dedicated support.
            </p>
            <Link
              to="/seller/register"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-7 py-3 text-sm font-semibold text-white hover:bg-violet-500 transition"
            >
              Become a Seller <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      )}
    </>
  );
}
