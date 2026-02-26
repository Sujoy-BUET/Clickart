import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CreditCard, MapPin, Tag, CheckCircle } from 'lucide-react';
import { getCart, createOrder, createPayment } from '../api';
import LoadingSpinner from '../components/LoadingSpinner';

export default function CheckoutPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [success, setSuccess] = useState(false);

  const [address, setAddress] = useState({ address_line: '', city: '', postal_code: '' });
  const [couponCode, setCouponCode] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');

  useEffect(() => {
    getCart(userId)
      .then((d) => setItems(Array.isArray(d) ? d : d.items ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [userId]);

  const total = items.reduce((s, i) => s + Number(i.price || 0) * Number(i.quantity || 1), 0);

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setPlacing(true);
    try {
      const orderRes = await createOrder({
        user_id: Number(userId),
        total_amount: total,
        address_line: address.address_line,
        city: address.city,
        postal_code: address.postal_code,
        coupon_code: couponCode || undefined,
      });
      const orderId = orderRes.order_id ?? orderRes.id;
      if (orderId) {
        await createPayment({
          order_id: orderId,
          amount: total,
          payment_method: paymentMethod,
          status: 'completed',
        });
      }
      setSuccess(true);
    } catch { /* ignore */ }
    setPlacing(false);
  };

  if (loading) return <LoadingSpinner />;

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-28 gap-4 text-center">
        <div className="rounded-full bg-emerald-600/20 p-5">
          <CheckCircle className="h-12 w-12 text-emerald-400" />
        </div>
        <h2 className="text-2xl font-bold">Order Placed!</h2>
        <p className="text-gray-400">Your order has been placed successfully. Thank you for shopping with ClicKart.</p>
        <button
          onClick={() => navigate(`/orders/user/${userId}`)}
          className="mt-4 rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white hover:bg-violet-500 transition"
        >
          View My Orders
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>

      <form onSubmit={handlePlaceOrder} className="space-y-6">
        {/* Delivery address */}
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 space-y-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-300 uppercase tracking-wider">
            <MapPin className="h-4 w-4 text-violet-400" /> Delivery Address
          </h2>
          <input
            required
            value={address.address_line}
            onChange={(e) => setAddress({ ...address, address_line: e.target.value })}
            placeholder="Address line"
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-violet-500"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              required
              value={address.city}
              onChange={(e) => setAddress({ ...address, city: e.target.value })}
              placeholder="City"
              className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-violet-500"
            />
            <input
              required
              value={address.postal_code}
              onChange={(e) => setAddress({ ...address, postal_code: e.target.value })}
              placeholder="Postal code"
              className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-violet-500"
            />
          </div>
        </div>

        {/* Coupon */}
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-300 uppercase tracking-wider">
            <Tag className="h-4 w-4 text-violet-400" /> Coupon Code
          </h2>
          <input
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value)}
            placeholder="Enter coupon code (optional)"
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-violet-500"
          />
        </div>

        {/* Payment method */}
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-300 uppercase tracking-wider">
            <CreditCard className="h-4 w-4 text-violet-400" /> Payment Method
          </h2>
          <div className="flex flex-wrap gap-2">
            {['UPI', 'Credit Card', 'Debit Card', 'Net Banking', 'COD'].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setPaymentMethod(m)}
                className={`rounded-lg border px-4 py-2 text-sm transition ${
                  paymentMethod === m
                    ? 'border-violet-500 bg-violet-600/15 text-violet-400'
                    : 'border-gray-700 text-gray-400 hover:border-gray-600'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Order summary */}
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Order Summary</h2>
          <div className="space-y-3">
            {items.map((item, idx) => (
              <div key={idx} className="flex justify-between text-sm">
                <span className="text-gray-400 truncate max-w-[70%]">
                  {item.product_name ?? 'Product'} × {item.quantity}
                </span>
                <span className="text-gray-200 font-medium">
                  ₹{(Number(item.price || 0) * Number(item.quantity || 1)).toLocaleString('en-IN')}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-800 flex justify-between">
            <span className="font-semibold text-gray-200">Total</span>
            <span className="text-xl font-bold text-violet-400">₹{total.toLocaleString('en-IN')}</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={placing || items.length === 0}
          className="w-full rounded-xl bg-violet-600 py-3.5 text-sm font-semibold text-white hover:bg-violet-500 transition shadow-lg shadow-violet-600/20 disabled:opacity-50"
        >
          {placing ? 'Placing Order...' : 'Place Order'}
        </button>
      </form>
    </div>
  );
}
