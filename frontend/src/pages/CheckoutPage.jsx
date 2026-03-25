import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CreditCard, MapPin, Tag, CheckCircle, AlertCircle } from 'lucide-react';
import {
  getCart,
  getOrCreateCartByUser,
  getUserProfile,
  createOrder,
  createPayment,
  setCartItemQuantity,
} from '../api';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

const paymentChoices = [
  { label: 'Cash on Delivery', value: 'COD' },
  { label: 'Card', value: 'CARD' },
  { label: 'Mobile Banking', value: 'MOBILE_BANKING' },
];

export default function CheckoutPage() {
  const { userId: userIdParam } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const userId = Number(userIdParam || user?.user_id || 0);

  const [cartId, setCartId] = useState(null);
  const [items, setItems] = useState([]);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [addressMode, setAddressMode] = useState('default');
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [newAddress, setNewAddress] = useState({
    house_no: '',
    road_no: '',
    postal_code: '',
    area: '',
    district: '',
    division: '',
    country: 'Bangladesh',
  });

  const [couponCode, setCouponCode] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('COD');

  const handleRefreshCart = async () => {
    setError('');
    setNotice('');
    try {
      const cart = await getOrCreateCartByUser(userId);
      setCartId(cart?.cart_id ?? null);
      
      if (!cart?.cart_id) {
        setItems([]);
        setError('Your cart is empty. Please add products before checkout.');
        return;
      }

      const cartRows = await getCart(cart.cart_id);
      const cartItems = Array.isArray(cartRows) ? cartRows.filter((row) => row.product_variation_id) : [];

      const needsAdjustment = cartItems.filter((item) => Number(item.quantity || 0) > Number(item.stock_quantity || 0));

      if (needsAdjustment.length > 0) {
        await Promise.all(
          needsAdjustment.map((item) =>
            setCartItemQuantity({
              cart_id: Number(cart.cart_id),
              product_variation_id: item.product_variation_id,
              quantity: Math.max(0, Number(item.stock_quantity || 0)),
            })
          )
        );
      }

      const refreshedRows = await getCart(cart.cart_id);
      const refreshedItems = Array.isArray(refreshedRows)
        ? refreshedRows.filter((row) => row.product_variation_id)
        : [];
      setItems(refreshedItems);

      if (refreshedItems.length === 0) {
        setError('Your cart is empty. Please add products before checkout.');
      } else if (needsAdjustment.length > 0) {
        setNotice('Cart was refreshed and adjusted to current stock. You can place the order now.');
      } else {
        setError('');
        setNotice('Cart is up to date with current stock.');
      }
    } catch (err) {
      setError('Failed to refresh cart. Please try again.');
    }
  };

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      setItems([]);
      return;
    }

    setLoading(true);

    Promise.all([
      getOrCreateCartByUser(userId),
      getUserProfile(userId).catch(() => null),
    ])
      .then(async ([cart, profile]) => {
        setCartId(cart?.cart_id ?? null);

        const addresses = Array.isArray(profile?.addresses) ? profile.addresses : [];
        setSavedAddresses(addresses);

        if (addresses.length > 0) {
          setSelectedAddressId(String(addresses[0].address_id));
        }

        if (!cart?.cart_id) {
          setItems([]);
          return;
        }

        const cartRows = await getCart(cart.cart_id);
        const cartItems = Array.isArray(cartRows) ? cartRows.filter((row) => row.product_variation_id) : [];
        setItems(cartItems);
      })
      .catch(() => {
        setItems([]);
        setSavedAddresses([]);
      })
      .finally(() => setLoading(false));
  }, [userId]);

  const total = useMemo(
    () => items.reduce((s, i) => s + Number(i.price || 0) * Number(i.quantity || 1), 0),
    [items]
  );

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');

    if (!userId || !cartId || items.length === 0) {
      setError('Your cart is empty. Please add products before checkout.');
      return;
    }

    // Validate stock before placing order
    const outOfStockItems = items.filter((item) => {
      const stockQty = Number(item.stock_quantity || 0);
      const reqQty = Number(item.quantity || 1);
      return reqQty > stockQty;
    });

    if (outOfStockItems.length > 0) {
      const itemNames = outOfStockItems
        .map(
          (item) =>
            `${item.product_name} (${item.variation_value || 'Standard'}) - Only ${item.stock_quantity} available, you need ${item.quantity}`
        )
        .join('; ');
      setError(`Stock unavailable: ${itemNames}. Please adjust quantities or refresh cart.`);
      return;
    }

    if (addressMode === 'saved' && !selectedAddressId) {
      setError('Please select a saved delivery address.');
      return;
    }

    if (addressMode === 'new' && !newAddress.postal_code.trim()) {
      setError('Postal code is required for a new delivery address.');
      return;
    }

    setPlacing(true);

    try {
      const orderPayload = {
        user_id: userId,
        cart_id: Number(cartId),
        coupon_code: couponCode.trim() || undefined,
      };

      if (addressMode === 'default') {
        orderPayload.use_default_address = true;
      } else if (addressMode === 'saved') {
        orderPayload.address_id = Number(selectedAddressId);
      } else {
        orderPayload.new_address = {
          house_no: newAddress.house_no || null,
          road_no: newAddress.road_no || null,
          postal_code: newAddress.postal_code,
          area: newAddress.area || null,
          district: newAddress.district || null,
          division: newAddress.division || null,
          country: newAddress.country || 'Bangladesh',
        };
      }

      const orderRes = await createOrder(orderPayload);
      if (!orderRes?.success) {
        throw new Error(orderRes?.message || 'Order creation failed');
      }

      const orderData = orderRes?.data ?? orderRes;
      const orderId = orderData?.order_id;

      if (!orderId) {
        throw new Error(orderRes?.message || 'Order creation failed');
      }

      const paymentRes = await createPayment({
        order_id: orderId,
        payment_method: paymentMethod,
      });

      if (!paymentRes?.success) {
        throw new Error(paymentRes?.message || 'Payment request failed');
      }

      setSuccess(true);
    } catch (err) {
      const msg = err?.message || 'Failed to place order. Please try again.';
      setError(msg);
      if (msg.includes('Stock changed')) {
        await handleRefreshCart();
        setError('Stock changed while ordering. Your cart has been refreshed with latest stock. Please review and place order again.');
      }
    } finally {
      setPlacing(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  if (!userId) {
    return <div className="py-24 text-center text-gray-500">Please login first to continue checkout.</div>;
  }

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
        {notice && (
          <div className="rounded-lg border border-emerald-600/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            {notice}
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-600/30 bg-red-500/10 px-4 py-3 text-sm text-red-300 space-y-3">
            <div className="flex gap-2">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p>{error}</p>
              </div>
            </div>
            {(error.includes('Stock changed') || error.includes('Stock unavailable')) && (
              <button
                type="button"
                onClick={handleRefreshCart}
                className="text-sm font-semibold text-red-400 hover:text-red-300 underline transition"
              >
                ↻ Refresh Cart & Continue
              </button>
            )}
          </div>
        )}

        <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 space-y-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-300 uppercase tracking-wider">
            <MapPin className="h-4 w-4 text-violet-400" /> Delivery Address
          </h2>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setAddressMode('default')}
              className={`rounded-lg border px-4 py-2 text-sm transition ${
                addressMode === 'default'
                  ? 'border-violet-500 bg-violet-600/15 text-violet-400'
                  : 'border-gray-700 text-gray-400 hover:border-gray-600'
              }`}
            >
              Default Home Address
            </button>
            <button
              type="button"
              onClick={() => setAddressMode('saved')}
              className={`rounded-lg border px-4 py-2 text-sm transition ${
                addressMode === 'saved'
                  ? 'border-violet-500 bg-violet-600/15 text-violet-400'
                  : 'border-gray-700 text-gray-400 hover:border-gray-600'
              }`}
            >
              Saved Address
            </button>
            <button
              type="button"
              onClick={() => setAddressMode('new')}
              className={`rounded-lg border px-4 py-2 text-sm transition ${
                addressMode === 'new'
                  ? 'border-violet-500 bg-violet-600/15 text-violet-400'
                  : 'border-gray-700 text-gray-400 hover:border-gray-600'
              }`}
            >
              New Address
            </button>
          </div>

          {addressMode === 'saved' && (
            <select
              value={selectedAddressId}
              onChange={(e) => setSelectedAddressId(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-gray-100 outline-none focus:border-violet-500"
            >
              <option value="">Select address</option>
              {savedAddresses.map((a) => (
                <option key={a.address_id} value={a.address_id}>
                  {`${a.house_no || ''} ${a.road_no || ''}, ${a.area || ''}, ${a.district || ''}, ${a.postal_code || ''}`.replace(/\s+/g, ' ').trim()}
                </option>
              ))}
            </select>
          )}

          {addressMode === 'new' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                value={newAddress.house_no}
                onChange={(e) => setNewAddress({ ...newAddress, house_no: e.target.value })}
                placeholder="House No"
                className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-gray-100 outline-none focus:border-violet-500"
              />
              <input
                value={newAddress.road_no}
                onChange={(e) => setNewAddress({ ...newAddress, road_no: e.target.value })}
                placeholder="Road No"
                className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-gray-100 outline-none focus:border-violet-500"
              />
              <input
                required
                value={newAddress.postal_code}
                onChange={(e) => setNewAddress({ ...newAddress, postal_code: e.target.value })}
                placeholder="Postal Code"
                className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-gray-100 outline-none focus:border-violet-500"
              />
              <input
                value={newAddress.area}
                onChange={(e) => setNewAddress({ ...newAddress, area: e.target.value })}
                placeholder="Area"
                className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-gray-100 outline-none focus:border-violet-500"
              />
              <input
                value={newAddress.district}
                onChange={(e) => setNewAddress({ ...newAddress, district: e.target.value })}
                placeholder="District"
                className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-gray-100 outline-none focus:border-violet-500"
              />
              <input
                value={newAddress.division}
                onChange={(e) => setNewAddress({ ...newAddress, division: e.target.value })}
                placeholder="Division"
                className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-gray-100 outline-none focus:border-violet-500"
              />
            </div>
          )}
        </div>

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

        <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-300 uppercase tracking-wider">
            <CreditCard className="h-4 w-4 text-violet-400" /> Payment Method
          </h2>
          <div className="flex flex-wrap gap-2">
            {paymentChoices.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setPaymentMethod(m.value)}
                className={`rounded-lg border px-4 py-2 text-sm transition ${
                  paymentMethod === m.value
                    ? 'border-violet-500 bg-violet-600/15 text-violet-400'
                    : 'border-gray-700 text-gray-400 hover:border-gray-600'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Order Summary</h2>
          <div className="space-y-3">
            {items.map((item, idx) => (
              <div key={item.product_variation_id ?? idx} className="flex justify-between text-sm">
                <span className="text-gray-400 truncate max-w-[70%]">
                  {item.product_name ?? 'Product'} x {item.quantity}
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
