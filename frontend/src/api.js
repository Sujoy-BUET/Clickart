const BASE = '/api';

async function request(url, options = {}) {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

  // Handle non-JSON responses (e.g. proxy errors)
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(res.ok ? 'Invalid server response' : `Server error (${res.status})`);
  }

  if (!res.ok) throw new Error(data.message || 'Something went wrong');
  return data;
}

/* ── Products ── */
export const getProducts     = ()     => request('/products');
export const getProduct      = (id)   => request(`/products/${id}`);
export const createProduct   = (body) => request('/products', { method: 'POST', body: JSON.stringify(body) });
export const updateProduct   = (id, body) => request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(body) });
export const deleteProduct   = (id)   => request(`/products/${id}`, { method: 'DELETE' });
export const addProductVariation = (id, body) => request(`/products/${id}/variations`, { method: 'POST', body: JSON.stringify(body) });

/* ── Users ── */
export const getUsers        = ()     => request('/users');
export const getUser         = (id)   => request(`/users/${id}`);
export const createUser      = (body) => request('/users', { method: 'POST', body: JSON.stringify(body) });
export const updateUser      = (id, body) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(body) });
export const deleteUser      = (id)   => request(`/users/${id}`, { method: 'DELETE' });
export const addUserAddress  = (id, body) => request(`/users/${id}/address`, { method: 'POST', body: JSON.stringify(body) });

/* ── Sellers ── */
export const getSellers      = ()     => request('/sellers');
export const getSeller       = (id)   => request(`/sellers/${id}`);
export const createSeller    = (body) => request('/sellers', { method: 'POST', body: JSON.stringify(body) });
export const updateSeller    = (id, body) => request(`/sellers/${id}`, { method: 'PUT', body: JSON.stringify(body) });
export const deleteSeller    = (id)   => request(`/sellers/${id}`, { method: 'DELETE' });
export const addSellerEmail  = (id, body) => request(`/sellers/${id}/email`, { method: 'POST', body: JSON.stringify(body) });
export const addSellerPhone  = (id, body) => request(`/sellers/${id}/phone`, { method: 'POST', body: JSON.stringify(body) });

/* ── Cart ── */
export const getCarts        = ()     => request('/cart');
export const getCart         = (id)   => request(`/cart/${id}`);
export const createCart      = (body) => request('/cart', { method: 'POST', body: JSON.stringify(body) });
export const addToCart       = (body) => request('/cart/add', { method: 'POST', body: JSON.stringify(body) });
export const removeFromCart  = (body) => request('/cart/remove', { method: 'DELETE', body: JSON.stringify(body) });
export const deleteCart      = (id)   => request(`/cart/${id}`, { method: 'DELETE' });

/* ── Orders ── */
export const getOrders       = ()     => request('/orders');
export const getOrder        = (id)   => request(`/orders/${id}`);
export const getUserOrders   = (uid)  => request(`/orders/user/${uid}`);
export const createOrder     = (body) => request('/orders', { method: 'POST', body: JSON.stringify(body) });
export const updateOrderStatus = (id, body) => request(`/orders/${id}/status`, { method: 'PUT', body: JSON.stringify(body) });
export const deleteOrder     = (id)   => request(`/orders/${id}`, { method: 'DELETE' });

/* ── Payments ── */
export const getPayments     = ()     => request('/payments');
export const getPayment      = (id)   => request(`/payments/${id}`);
export const getPaymentsByOrder = (oid) => request(`/payments/order/${oid}`);
export const createPayment   = (body) => request('/payments', { method: 'POST', body: JSON.stringify(body) });
export const updatePaymentStatus = (id, body) => request(`/payments/${id}/status`, { method: 'PUT', body: JSON.stringify(body) });

/* ── Reviews ── */
export const getReviews          = ()     => request('/reviews');
export const getReview           = (id)   => request(`/reviews/${id}`);
export const getProductReviews   = (pid)  => request(`/reviews/product/${pid}`);
export const getSellerReviews    = (sid)  => request(`/reviews/seller/${sid}`);
export const getUserReviews      = (uid)  => request(`/reviews/user/${uid}`);
export const createProductReview = (body) => request('/reviews/product', { method: 'POST', body: JSON.stringify(body) });
export const createSellerReview  = (body) => request('/reviews/seller', { method: 'POST', body: JSON.stringify(body) });
export const updateReview        = (id, body) => request(`/reviews/${id}`, { method: 'PUT', body: JSON.stringify(body) });
export const deleteReview        = (id)   => request(`/reviews/${id}`, { method: 'DELETE' });
