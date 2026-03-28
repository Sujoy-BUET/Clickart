import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShoppingCart, Minus, Plus, ArrowLeft, Star, Send } from 'lucide-react';
import { getProduct, getProductReviews, addToCart, createProductReview, getOrCreateCartByUser } from '../api';
import StarRating from '../components/StarRating';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';

const DEFAULT_IMAGE = '/default-product.svg';

export default function ProductDetailPage() {
  const { id } = useParams();
  const { user, isCustomer } = useAuth();
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVariation, setSelectedVariation] = useState(null);
  const [qty, setQty] = useState(1);
  const [cartMsg, setCartMsg] = useState('');
  const [currentImage, setCurrentImage] = useState(DEFAULT_IMAGE);
  const [imageError, setImageError] = useState(false);

  // Review form
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const selectedStock = Number(selectedVariation?.stock_quantity ?? 0);

  useEffect(() => {
    setLoading(true);
    Promise.all([getProduct(id), getProductReviews(id).catch(() => [])])
      .then(([p, r]) => {
        setProduct(p);
        setReviews(Array.isArray(r) ? r : []);
        if (p.variations?.length) setSelectedVariation(p.variations[0]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const handleAddToCart = async () => {
    if (!selectedVariation) return;

    if (!isCustomer()) {
      setCartMsg('Please login as a user to add items to cart.');
      return;
    }

    if (selectedStock <= 0) {
      setCartMsg('This variation is out of stock.');
      return;
    }

    if (qty > selectedStock) {
      setCartMsg(`Only ${selectedStock} item(s) available in stock.`);
      return;
    }

    try {
      const cart = await getOrCreateCartByUser(user.user_id);
      const res = await addToCart({
        cart_id: cart.cart_id,
        product_variation_id: selectedVariation.product_variation_id,
        quantity: qty,
      });

      if (!res?.success) {
        setCartMsg(res?.message || 'Failed to add');
        return;
      }

      setCartMsg('Added to cart!');
      setTimeout(() => setCartMsg(''), 2500);
    } catch {
      setCartMsg('Failed to add');
    }
  };

  const handleReview = async (e) => {
    e.preventDefault();

    if (!isCustomer()) {
      setCartMsg('Please login as a user to submit a review.');
      return;
    }

    setSubmitting(true);
    try {
      const created = await createProductReview({ product_id: Number(id), reviewer_user_id: user.user_id, rating, comment });

      if (!created?.success) {
        setCartMsg(created?.message || 'Failed to submit review.');
        setSubmitting(false);
        return;
      }

      const r = await getProductReviews(id).catch(() => []);
      setReviews(Array.isArray(r) ? r : []);
      setComment('');
      setRating(5);
    } catch { /* ignore */ }
    setSubmitting(false);
  };

  const normalizedImage = useMemo(() => {
    const raw = String(product?.product_image || '').trim();
    if (!raw) return null;
    if (/^https?:\/\//i.test(raw) || raw.startsWith('/')) return raw;
    return `/${raw}`;
  }, [product?.product_image]);

  useEffect(() => {
    setImageError(false);
    setCurrentImage(normalizedImage || DEFAULT_IMAGE);
  }, [normalizedImage]);

  useEffect(() => {
    if (!selectedVariation) return;
    if (selectedStock <= 0) {
      setQty(1);
      return;
    }
    setQty((prev) => Math.min(Math.max(1, prev), selectedStock));
  }, [selectedVariation, selectedStock]);

  const handleImageError = () => {
    if (currentImage !== DEFAULT_IMAGE) {
      setCurrentImage(DEFAULT_IMAGE);
      return;
    }
    setImageError(true);
  };

  if (loading) return <LoadingSpinner />;
  if (!product) return <div className="py-24 text-center text-gray-500">Product not found.</div>;

  const price = selectedVariation?.price ?? product.price;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Back */}
      <Link to="/products" className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-violet-400 transition">
        <ArrowLeft className="h-4 w-4" /> All Products
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Product image */}
        <div className="aspect-square rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center border border-gray-800">
          {!imageError ? (
            <img
              src={currentImage}
              alt={product.product_name}
              onError={handleImageError}
              className="h-full w-full rounded-2xl object-cover"
            />
          ) : (
            <span className="text-8xl font-extrabold text-gray-700 select-none">{product.product_name?.[0]}</span>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col gap-5">
          {product.category_name && (
            <span className="self-start rounded-md bg-violet-600/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-violet-400">
              {product.category_name}
            </span>
          )}

          <h1 className="text-3xl font-bold leading-snug">{product.product_name}</h1>

          <div className="flex items-center gap-3 text-sm text-gray-400">
            {product.brand_name && <span>Brand: <span className="text-gray-200">{product.brand_name}</span></span>}
            {product.store_name && <><span className="text-gray-700">|</span> <span>Seller: <span className="text-gray-200">{product.store_name}</span></span></>}
          </div>

          <p className="text-sm text-gray-400 leading-relaxed">{product.description || 'No description available.'}</p>

          {/* Variations */}
          {product.variations?.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Variations</p>
              <div className="flex flex-wrap gap-2">
                {product.variations.map((v) => (
                  <button
                    key={v.product_variation_id}
                    onClick={() => { setSelectedVariation(v); setQty(1); }}
                    className={`rounded-lg border px-4 py-2 text-sm transition ${
                      selectedVariation?.product_variation_id === v.product_variation_id
                        ? 'border-violet-500 bg-violet-600/15 text-violet-400'
                        : 'border-gray-700 text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    {v.variation_type}: {v.variation_value}
                    {v.price && <span className="ml-2 text-xs text-gray-500">৳{Number(v.price).toLocaleString('en-BD')}</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Price + cart */}
          <div className="flex items-end gap-6 mt-2">
            <span className="text-3xl font-extrabold text-violet-400">৳{Number(price).toLocaleString('en-BD')}</span>

            <div className="flex items-center gap-1 rounded-lg border border-gray-700">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="px-3 py-2 text-gray-400 hover:text-white transition">
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-8 text-center text-sm font-medium">{qty}</span>
              <button
                onClick={() => setQty((q) => (selectedStock > 0 ? Math.min(q + 1, selectedStock) : q))}
                disabled={selectedStock <= 0 || qty >= selectedStock}
                className="px-3 py-2 text-gray-400 hover:text-white transition disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          <button
            onClick={handleAddToCart}
            disabled={selectedStock <= 0}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-3.5 text-sm font-semibold text-white hover:bg-violet-500 transition shadow-lg shadow-violet-600/20"
          >
            <ShoppingCart className="h-4 w-4" /> {selectedStock <= 0 ? 'Out of Stock' : 'Add to Cart'}
          </button>
          {cartMsg && <p className="text-center text-sm text-emerald-400">{cartMsg}</p>}

          {selectedVariation && (
            <p className="text-xs text-gray-600">
              Stock: {selectedVariation.stock_quantity ?? '∞'} available
            </p>
          )}
        </div>
      </div>

      {/* Reviews */}
      <section className="mt-16">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
          <Star className="h-5 w-5 text-amber-400" /> Reviews ({reviews.length})
        </h2>

        {/* Write review */}
        <form onSubmit={handleReview} className="mb-8 rounded-xl border border-gray-800 bg-gray-900 p-5 space-y-4">
          <p className="text-sm font-semibold text-gray-300">Write a review</p>
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-500">Rating</label>
            <select
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-200 outline-none"
            >
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>{n} Star{n > 1 ? 's' : ''}</option>
              ))}
            </select>
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            required
            placeholder="Share your thoughts..."
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-violet-500 resize-none"
          />
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2 text-sm font-medium text-white hover:bg-violet-500 transition disabled:opacity-50"
          >
            <Send className="h-4 w-4" /> {submitting ? 'Submitting...' : 'Submit Review'}
          </button>
        </form>

        {/* List */}
        {reviews.length === 0 ? (
          <p className="text-sm text-gray-600">No reviews yet. Be the first!</p>
        ) : (
          <div className="space-y-4">
            {reviews.map((r, i) => (
              <div key={r.review_id ?? i} className="rounded-xl border border-gray-800 bg-gray-900 p-5">
                <div className="flex items-center justify-between mb-2">
                  <StarRating rating={r.rating} size={14} />
                  <span className="text-xs text-gray-600">{r.review_date ? new Date(r.review_date).toLocaleDateString() : ''}</span>
                </div>
                <p className="text-sm text-gray-300">{r.comment}</p>
                {r.first_name && <p className="mt-2 text-xs text-gray-500">— {r.first_name} {r.last_name ?? ''}</p>}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
