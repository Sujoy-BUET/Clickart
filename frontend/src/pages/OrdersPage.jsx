import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Package, Clock, CheckCircle, Truck, XCircle } from 'lucide-react';
import { getUserOrders, markOrderReceived } from '../api';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { useAuth } from '../context/AuthContext';

const statusConfig = {
  pending:    { icon: Clock,       color: 'text-amber-400',   bg: 'bg-amber-400/10' },
  processing: { icon: Truck,       color: 'text-blue-400',    bg: 'bg-blue-400/10' },
  shipped:    { icon: Truck,       color: 'text-cyan-400',    bg: 'bg-cyan-400/10' },
  delivered:  { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  successful: { icon: CheckCircle, color: 'text-lime-300',    bg: 'bg-lime-400/10' },
  rejected:   { icon: XCircle,     color: 'text-rose-400',    bg: 'bg-rose-400/10' },
  cancelled:  { icon: XCircle,     color: 'text-red-400',     bg: 'bg-red-400/10' },
};

function StatusBadge({ status }) {
  const cfg = statusConfig[status?.toLowerCase()] || statusConfig.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${cfg.color} ${cfg.bg}`}>
      <Icon className="h-3.5 w-3.5" />
      {status ?? 'pending'}
    </span>
  );
}

export default function OrdersPage() {
  const { userId } = useParams();
  const { user, isCustomer } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingOrderId, setActionLoadingOrderId] = useState(null);
  const [actionError, setActionError] = useState('');

  const routeUserId = Number(userId || 0);
  const authUserId = Number(user?.user_id || 0);
  const effectiveUserId = useMemo(() => authUserId || routeUserId, [authUserId, routeUserId]);
  const hasOwnershipMismatch = Boolean(authUserId && routeUserId && authUserId !== routeUserId);

  useEffect(() => {
    if (!effectiveUserId || !isCustomer() || hasOwnershipMismatch) {
      setOrders([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    getUserOrders(effectiveUserId)
      .then((d) => setOrders(Array.isArray(d) ? d : []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [effectiveUserId, hasOwnershipMismatch, isCustomer]);

  const refreshOrders = async () => {
    const data = await getUserOrders(effectiveUserId).catch(() => []);
    setOrders(Array.isArray(data) ? data : []);
  };

  const handleMarkReceived = async (orderId) => {
    setActionError('');
    setActionLoadingOrderId(orderId);
    try {
      const response = await markOrderReceived(orderId, { user_id: effectiveUserId });
      if (!response?.success) {
        setActionError(response?.message || 'Failed to mark order as received.');
        return;
      }

      await refreshOrders();
    } catch (err) {
      setActionError(err?.message || 'Failed to mark order as received.');
    } finally {
      setActionLoadingOrderId(null);
    }
  };

  if (loading) return <LoadingSpinner />;

  if (!isCustomer()) {
    return <div className="py-24 text-center text-gray-500">Please login as a customer to view orders.</div>;
  }

  if (hasOwnershipMismatch) {
    return <div className="py-24 text-center text-gray-500">You cannot view another user's orders.</div>;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold mb-8">My Orders</h1>

      {actionError && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {actionError}
        </div>
      )}

      {orders.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No orders yet"
          message="Your order history will appear here after your first purchase."
          actionLabel="Start Shopping"
          actionTo="/products"
        />
      ) : (
        <div className="space-y-4">
          {orders.map((order, idx) => (
            <div
              key={order.order_id ?? idx}
              className="rounded-xl border border-gray-800 bg-gray-900 p-5 transition hover:border-gray-700"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div>
                  <span className="text-xs text-gray-500">Order #</span>
                  <span className="ml-1 text-sm font-semibold text-gray-200">{order.order_id}</span>
                </div>
                <StatusBadge status={order.order_status || order.status} />
              </div>

              {['CONFIRMED', 'SHIPPED', 'DELIVERED'].includes(String(order.order_status || '').toUpperCase()) && (
                <div className="mb-4">
                  <button
                    onClick={() => handleMarkReceived(order.order_id)}
                    disabled={actionLoadingOrderId === order.order_id}
                    className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                  >
                    {actionLoadingOrderId === order.order_id ? 'Updating...' : 'Mark As Received'}
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-500">Total</p>
                  <p className="font-bold text-violet-400">৳{Number(order.total_amount || 0).toLocaleString('en-BD')}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Date</p>
                  <p className="text-gray-300">{order.order_date ? new Date(order.order_date).toLocaleDateString() : '—'}</p>
                </div>
                {order.coupon_code && (
                  <div>
                    <p className="text-xs text-gray-500">Coupon</p>
                    <p className="text-emerald-400 font-medium">{order.coupon_code}</p>
                  </div>
                )}
                {order.city && (
                  <div>
                    <p className="text-xs text-gray-500">Delivery</p>
                    <p className="text-gray-300">{order.city}</p>
                  </div>
                )}
              </div>

              <div className="mt-4 border-t border-gray-800 pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">Items</p>

                {Array.isArray(order.items) && order.items.length > 0 ? (
                  <div className="space-y-2">
                    {order.items.map((item, itemIdx) => (
                      <div
                        key={item.order_item_id ?? `${order.order_id}-${item.product_variation_id}-${itemIdx}`}
                        className="flex items-center justify-between gap-3 rounded-lg bg-gray-800/60 px-3 py-2"
                      >
                        <div className="min-w-0">
                          {item.product_id ? (
                            <Link
                              to={`/products/${item.product_id}`}
                              className="block truncate text-sm font-medium text-gray-200 hover:text-violet-300"
                            >
                              {item.product_name}
                            </Link>
                          ) : (
                            <p className="truncate text-sm font-medium text-gray-200">{item.product_name}</p>
                          )}
                          {(item.variation_type || item.variation_value) && (
                            <p className="text-xs text-gray-400">
                              {item.variation_type || 'Variation'}: {item.variation_value || '-'}
                            </p>
                          )}
                        </div>
                        <div className="text-right text-sm">
                          <p className="text-gray-300">x{Number(item.quantity || 0)}</p>
                          <p className="font-semibold text-violet-300">
                            ৳{Number(item.unit_price || 0).toLocaleString('en-BD')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Items are not available for this order.</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
