import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Package, Clock, CheckCircle, Truck, XCircle } from 'lucide-react';
import { getUserOrders } from '../api';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

const statusConfig = {
  pending:    { icon: Clock,       color: 'text-amber-400',   bg: 'bg-amber-400/10' },
  processing: { icon: Truck,       color: 'text-blue-400',    bg: 'bg-blue-400/10' },
  shipped:    { icon: Truck,       color: 'text-cyan-400',    bg: 'bg-cyan-400/10' },
  delivered:  { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
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
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUserOrders(userId)
      .then((d) => setOrders(Array.isArray(d) ? d : []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold mb-8">My Orders</h1>

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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
