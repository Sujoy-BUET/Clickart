import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Store, Star, ArrowRight } from 'lucide-react';
import { getSellers } from '../api';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

export default function SellersPage() {
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSellers()
      .then((d) => setSellers(Array.isArray(d) ? d : []))
      .catch(() => setSellers([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Our Sellers</h1>
        <p className="mt-1 text-sm text-gray-500">Browse verified sellers on ClicKart</p>
      </div>

      {sellers.length === 0 ? (
        <EmptyState icon={Store} title="No sellers yet" message="Be the first to join our marketplace!" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {sellers.map((s) => (
            <div
              key={s.seller_id}
              className="rounded-xl border border-gray-800 bg-gray-900 p-6 transition hover:border-gray-700 hover:shadow-lg hover:shadow-violet-500/5"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-xl font-bold text-white">
                  {s.store_name?.[0] ?? 'S'}
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-100 truncate">{s.store_name}</h3>
                  <p className="text-xs text-gray-500">{s.seller_name}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-sm text-gray-400 mb-4">
                <span className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" /> 4.5
                </span>
                {s.is_verified && (
                  <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                    Verified
                  </span>
                )}
              </div>

              <Link
                to={`/seller/dashboard/${s.seller_id}`}
                className="flex items-center gap-1.5 text-sm font-medium text-violet-400 hover:text-violet-300 transition"
              >
                View Dashboard <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
