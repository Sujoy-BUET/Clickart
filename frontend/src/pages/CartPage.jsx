import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Trash2, ShoppingBag, Minus, Plus, ArrowRight } from 'lucide-react';
import { getCart, getOrCreateCartByUser, removeFromCart, setCartItemQuantity } from '../api';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

export default function CartPage() {
  const { userId } = useParams();
  const [items, setItems] = useState([]);
  const [cartId, setCartId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cartMsg, setCartMsg] = useState('');

  const fetchCart = () => {
    setLoading(true);
    getOrCreateCartByUser(userId)
      .then((cart) => {
        setCartId(cart?.cart_id ?? null);
        if (!cart?.cart_id) {
          setItems([]);
          return null;
        }
        return getCart(cart.cart_id);
      })
      .then((d) => {
        if (d === null) return;
        setItems(Array.isArray(d) ? d.filter((row) => row.product_variation_id) : []);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  useEffect(fetchCart, [userId]);

  const handleRemove = async (product_variation_id) => {
    if (!cartId) return;

    try {
      const res = await removeFromCart({ cart_id: Number(cartId), product_variation_id });
      if (!res?.success) {
        setCartMsg(res?.message || 'Failed to remove item');
        return;
      }
      fetchCart();
    } catch { /* ignore */ }
  };

  const handleQty = async (item, newQty) => {
    if (!cartId) return;

    if (newQty < 1) return handleRemove(item.product_variation_id);

    try {
      const res = await setCartItemQuantity({
        cart_id: Number(cartId),
        product_variation_id: item.product_variation_id,
        quantity: newQty,
      });

      if (!res?.success) {
        setCartMsg(res?.message || 'Failed to update quantity');
        return;
      }

      setCartMsg('');
      fetchCart();
    } catch { /* ignore */ }
  };

  const total = items.reduce((s, i) => s + Number(i.price || 0) * Number(i.quantity || 1), 0);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>

      {items.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="Your cart is empty"
          message="Browse products and add them to your cart."
          actionLabel="Browse Products"
          actionTo="/products"
        />
      ) : (
        <>
          {cartMsg && (
            <div className="mb-4 rounded-lg border border-amber-600/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-300">
              {cartMsg}
            </div>
          )}
          <div className="space-y-4">
            {items.map((item, idx) => (
              <div
                key={item.product_variation_id ?? idx}
                className="flex items-center gap-4 rounded-xl border border-gray-800 bg-gray-900 p-4 transition hover:border-gray-700"
              >
                {/* Thumb */}
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-gray-800 text-2xl font-bold text-gray-600">
                  {item.product_name?.[0] ?? 'P'}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <Link to={`/products/${item.product_id}`} className="text-sm font-semibold text-gray-100 hover:text-violet-400 transition line-clamp-1">
                    {item.product_name ?? 'Product'}
                  </Link>
                  {item.variation_value && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {item.variation_type}: {item.variation_value}
                    </p>
                  )}
                  <p className="mt-1 text-sm font-bold text-violet-400">₹{Number(item.price || 0).toLocaleString('en-IN')}</p>
                </div>

                {/* Qty */}
                <div className="flex items-center gap-1 rounded-lg border border-gray-700">
                  <button
                    onClick={() => handleQty(item, Number(item.quantity) - 1)}
                    className="px-2.5 py-1.5 text-gray-400 hover:text-white transition"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-7 text-center text-xs font-medium">{item.quantity}</span>
                  <button
                    onClick={() => handleQty(item, Number(item.quantity) + 1)}
                    className="px-2.5 py-1.5 text-gray-400 hover:text-white transition"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Subtotal */}
                <span className="hidden sm:block w-24 text-right text-sm font-semibold text-gray-200">
                  ₹{(Number(item.price || 0) * Number(item.quantity || 1)).toLocaleString('en-IN')}
                </span>

                {/* Remove */}
                <button onClick={() => handleRemove(item.product_variation_id)} className="p-2 text-gray-500 hover:text-red-400 transition">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="mt-8 rounded-xl border border-gray-800 bg-gray-900 p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-gray-400">Subtotal ({items.length} items)</span>
              <span className="text-xl font-bold text-violet-400">₹{total.toLocaleString('en-IN')}</span>
            </div>
            <Link
              to={`/checkout/${userId}`}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-3.5 text-sm font-semibold text-white hover:bg-violet-500 transition shadow-lg shadow-violet-600/20"
            >
              Proceed to Checkout <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
