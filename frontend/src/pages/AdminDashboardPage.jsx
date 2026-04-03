import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Trash2, ShieldAlert, PackageCheck, XCircle } from 'lucide-react';
import { adminDeleteSeller, adminVerifySeller, getOrders, getSellers, updateOrderStatus } from '../api';
import { useAuth } from '../context/AuthContext';

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [orders, setOrders] = useState([]);
  const [orderActionBusyId, setOrderActionBusyId] = useState(null);
  const [orderActionError, setOrderActionError] = useState('');

  const token = user?.admin_token || '';

  const loadSellers = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getSellers();
      setSellers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load sellers');
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async () => {
    setOrdersLoading(true);
    setOrderActionError('');
    try {
      const data = await getOrders();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      setOrders([]);
      setOrderActionError(err.message || 'Failed to load orders');
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin()) {
      navigate('/admin/login');
      return;
    }

    loadSellers();
    loadOrders();
  }, [isAdmin, navigate]);

  const pendingSellers = useMemo(() => sellers.filter((s) => !s.is_verified), [sellers]);
  const verifiedSellers = useMemo(() => sellers.filter((s) => s.is_verified), [sellers]);
  const pendingOrders = useMemo(
    () => orders.filter((order) => String(order.order_status || '').toUpperCase() === 'PENDING'),
    [orders]
  );

  const handleOrderDecision = async (orderId, nextStatus) => {
    setOrderActionBusyId(orderId);
    setOrderActionError('');

    try {
      const response = await updateOrderStatus(orderId, { order_status: nextStatus }, token);
      if (!response?.success) {
        setOrderActionError(response?.message || `Failed to mark order as ${nextStatus}`);
        return;
      }

      await loadOrders();
    } catch (err) {
      setOrderActionError(err.message || `Failed to mark order as ${nextStatus}`);
    } finally {
      setOrderActionBusyId(null);
    }
  };

  const handleVerify = async (sellerId) => {
    setBusyId(sellerId);
    setError('');
    try {
      const response = await adminVerifySeller(sellerId, token);
      if (!response.success) {
        setError(response.message || 'Failed to verify seller');
      } else {
        await loadSellers();
      }
    } catch (err) {
      setError(err.message || 'Failed to verify seller');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (sellerId) => {
    const confirmed = window.confirm('Are you sure you want to delete this seller? This action cannot be undone.');
    if (!confirmed) return;

    setBusyId(sellerId);
    setError('');
    try {
      const response = await adminDeleteSeller(sellerId, token);
      if (!response.success) {
        setError(response.message || 'Failed to delete seller');
      } else {
        await loadSellers();
      }
    } catch (err) {
      setError(err.message || 'Failed to delete seller');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="mt-2 text-sm text-gray-400">Verify pending sellers and delete seller accounts.</p>
        </div>
      </div>

      {error && (
        <div className="mb-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-6">
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <p className="text-xs uppercase tracking-wide text-gray-400">Pending Sellers</p>
          <p className="mt-2 text-3xl font-semibold text-amber-300">{pendingSellers.length}</p>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <p className="text-xs uppercase tracking-wide text-gray-400">Verified Sellers</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-300">{verifiedSellers.length}</p>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <p className="text-xs uppercase tracking-wide text-gray-400">Pending Orders</p>
          <p className="mt-2 text-3xl font-semibold text-violet-300">{pendingOrders.length}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-800 bg-gray-900 overflow-hidden">
        <div className="border-b border-gray-800 px-5 py-4">
          <h2 className="text-lg font-semibold">Seller Management</h2>
        </div>

        {loading ? (
          <div className="px-5 py-8 text-sm text-gray-400">Loading sellers...</div>
        ) : sellers.length === 0 ? (
          <div className="px-5 py-8 text-sm text-gray-400">No sellers found.</div>
        ) : (
          <div className="divide-y divide-gray-800">
            {sellers.map((seller) => {
              const isBusy = busyId === seller.seller_id;
              return (
                <div key={seller.seller_id} className="flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-medium text-gray-100">{seller.store_name}</p>
                    <p className="text-sm text-gray-400">@{seller.seller_name} • ID: {seller.seller_id}</p>
                    <p className="mt-1 text-xs">
                      {seller.is_verified ? (
                        <span className="text-emerald-400">Verified</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-400"><ShieldAlert className="h-3.5 w-3.5" />Pending verification</span>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {!seller.is_verified && (
                      <button
                        onClick={() => handleVerify(seller.seller_id)}
                        disabled={isBusy}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Verify
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(seller.seller_id)}
                      disabled={isBusy}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-8 rounded-2xl border border-gray-800 bg-gray-900 overflow-hidden">
        <div className="border-b border-gray-800 px-5 py-4">
          <h2 className="text-lg font-semibold">Order History</h2>
          <p className="mt-1 text-xs text-gray-500">Approve pending orders to move them to delivered. Reject restores stock if already deducted.</p>
        </div>

        {orderActionError && (
          <div className="mx-5 mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {orderActionError}
          </div>
        )}

        {ordersLoading ? (
          <div className="px-5 py-8 text-sm text-gray-400">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="px-5 py-8 text-sm text-gray-400">No orders found.</div>
        ) : (
          <div className="divide-y divide-gray-800">
            {orders.map((order) => {
              const status = String(order.order_status || '').toUpperCase();
              const canDecide = status === 'PENDING';
              const isBusy = orderActionBusyId === order.order_id;
              const userLabel = String(order.user_name || '').trim()
                ? order.user_name
                : `User ID: ${order.user_id}`;

              return (
                <div key={order.order_id} className="flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-medium text-gray-100">Order #{order.order_id}</p>
                    <p className="text-sm text-gray-400">{userLabel} • {order.order_date ? new Date(order.order_date).toLocaleString() : '-'}</p>
                    <p className="mt-1 text-xs text-gray-500">Total: ৳{Number(order.total_amount || 0).toLocaleString('en-BD')}</p>
                    <p className="mt-1 text-xs">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ${status === 'DELIVERED' || status === 'SUCCESSFUL' ? 'bg-emerald-500/10 text-emerald-300' : status === 'REJECTED' ? 'bg-red-500/10 text-red-300' : 'bg-amber-500/10 text-amber-300'}`}>
                        <PackageCheck className="h-3.5 w-3.5" />
                        {status || 'PENDING'}
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOrderDecision(order.order_id, 'DELIVERED')}
                      disabled={!canDecide || isBusy}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleOrderDecision(order.order_id, 'REJECTED')}
                      disabled={!canDecide || isBusy}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50"
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
