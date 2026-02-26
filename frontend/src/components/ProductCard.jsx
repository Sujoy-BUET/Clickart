import { Link } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import StarRating from './StarRating';

export default function ProductCard({ product }) {
  const { product_id, product_name, price, brand_name, category_name, store_name } = product;

  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-gray-800 bg-gray-900 transition hover:border-gray-700 hover:shadow-lg hover:shadow-violet-500/5">
      {/* Image placeholder */}
      <div className="relative aspect-square bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
        <span className="text-5xl font-bold text-gray-700 select-none group-hover:scale-110 transition-transform">
          {product_name?.[0] ?? 'P'}
        </span>
        {category_name && (
          <span className="absolute top-2 left-2 rounded-md bg-violet-600/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
            {category_name}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <div className="flex items-start justify-between gap-2">
          <Link to={`/products/${product_id}`} className="text-sm font-semibold text-gray-100 leading-snug hover:text-violet-400 transition line-clamp-2">
            {product_name}
          </Link>
        </div>

        {brand_name && <p className="text-xs text-gray-500">{brand_name}</p>}
        {store_name && <p className="text-[11px] text-gray-600">Sold by {store_name}</p>}

        <StarRating rating={4.2} size={13} showValue />

        <div className="mt-auto flex items-center justify-between pt-3 border-t border-gray-800">
          <span className="text-lg font-bold text-violet-400">
            ₹{Number(price).toLocaleString('en-IN')}
          </span>
          <Link
            to={`/products/${product_id}`}
            className="flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-500 transition"
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            View
          </Link>
        </div>
      </div>
    </div>
  );
}
