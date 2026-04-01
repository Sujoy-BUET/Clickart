const BASE = '/api';

async function request(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const res = await fetch(`${BASE}${url}`, {
    ...options,
    headers,
  });

  const raw = await res.text();

  if (!raw || !raw.trim()) {
    if (res.ok) {
      return { success: true };
    }

    return {
      success: false,
      message: `Request failed (${res.status})`,
      status: res.status,
    };
  }

  try {
    return JSON.parse(raw);
  } catch {
    if (res.ok) {
      return {
        success: false,
        message: 'Server returned an invalid response format.',
        status: res.status,
      };
    }

    return {
      success: false,
      message: raw.trim() || `Request failed (${res.status})`,
      status: res.status,
    };
  }
}

/* ── Products ── */
export const getProducts     = async (category) => {
  const query = category ? `?category=${encodeURIComponent(category)}` : '';
  return (await request(`/products${query}`)).data;
};
export const getProduct      = async (id)   => (await request(`/products/${id}`)).data;
export const getCategories   = async ()     => (await request('/products/categories')).data;
export const createProduct   = (body) => request('/products', { method: 'POST', body: JSON.stringify(body) });
export const updateProduct   = (id, body) => request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(body) });
export const deleteProduct   = (id)   => request(`/products/${id}`, { method: 'DELETE' });
export const addProductVariation = (id, body) => request(`/products/${id}/variations`, { method: 'POST', body: JSON.stringify(body) });

/* ── Authentication ── */
export const loginUser       = (body) => request('/users/login', { method: 'POST', body: JSON.stringify(body) });
export const loginSeller     = (body) => request('/sellers/login', { method: 'POST', body: JSON.stringify(body) });
export const loginAdmin      = (body) => request('/admin/login', { method: 'POST', body: JSON.stringify(body) });

/* ── Users ── */
export const getUsers        = async ()     => (await request('/users')).data;
export const getUser         = async (id)   => (await request(`/users/${id}`)).data;
export const getUserProfile  = async (id)   => (await request(`/users/${id}/profile`)).data;
export const createUser      = (body) => request('/users', { method: 'POST', body: JSON.stringify(body) });
export const updateUser      = (id, body) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(body) });
export const updateUserProfile = (id, body) => request(`/users/${id}/profile`, { method: 'PUT', body: JSON.stringify(body) });
export const deleteUser      = (id)   => request(`/users/${id}`, { method: 'DELETE' });
export const addUserAddress  = (id, body) => request(`/users/${id}/address`, { method: 'POST', body: JSON.stringify(body) });

/* ── Sellers ── */
export const getSellers      = async ()     => (await request('/sellers')).data;
export const getSeller       = async (id)   => (await request(`/sellers/${id}`)).data;
export const getSellerProfile = async (id)   => (await request(`/sellers/${id}/profile`)).data;
export const getSellerSalesSummary = async (id) => (await request(`/sellers/${id}/sales-summary`)).data;
export const createSeller    = (body) => request('/sellers', { method: 'POST', body: JSON.stringify(body) });
export const updateSeller    = (id, body) => request(`/sellers/${id}`, { method: 'PUT', body: JSON.stringify(body) });
export const updateSellerProfile = (id, body) => request(`/sellers/${id}/profile`, { method: 'PUT', body: JSON.stringify(body) });
export const deleteSeller    = (id)   => request(`/sellers/${id}`, { method: 'DELETE' });
export const addSellerEmail  = (id, body) => request(`/sellers/${id}/email`, { method: 'POST', body: JSON.stringify(body) });
export const addSellerPhone  = (id, body) => request(`/sellers/${id}/phone`, { method: 'POST', body: JSON.stringify(body) });
export const addSellerAddress = (id, body) => request(`/sellers/${id}/address`, { method: 'POST', body: JSON.stringify(body) });
export const adminVerifySeller = (id, token) => request(`/admin/sellers/${id}/verify`, {
  method: 'PATCH',
  headers: { Authorization: `Bearer ${token}` },
});
export const adminDeleteSeller = (id, token) => request(`/admin/sellers/${id}/remove`, {
  method: 'DELETE',
  headers: { Authorization: `Bearer ${token}` },
});

/* ── Cart ── */
export const getCarts        = async ()     => (await request('/cart')).data;
export const getOrCreateCartByUser = async (userId) => (await request(`/cart/user/${userId}`)).data;
export const getCart         = async (id)   => (await request(`/cart/${id}`)).data;
export const createCart      = (body) => request('/cart', { method: 'POST', body: JSON.stringify(body) });
export const addToCart       = (body) => request('/cart/add', { method: 'POST', body: JSON.stringify(body) });
export const setCartItemQuantity = (body) => request('/cart/quantity', { method: 'PUT', body: JSON.stringify(body) });
export const removeFromCart  = (body) => request('/cart/remove', { method: 'DELETE', body: JSON.stringify(body) });
export const deleteCart      = (id)   => request(`/cart/${id}`, { method: 'DELETE' });

/* ── Orders ── */
export const getOrders       = async ()     => (await request('/orders')).data;
export const getOrder        = async (id)   => (await request(`/orders/${id}`)).data;
export const getUserOrders   = async (uid)  => (await request(`/orders/user/${uid}`)).data;
export const getSellerOrders = async (sellerId) => (await request(`/orders/seller/${sellerId}`)).data;
export const createOrder     = (body) => request('/orders', { method: 'POST', body: JSON.stringify(body) });
export const updateOrderStatus = (id, body) => request(`/orders/${id}/status`, { method: 'PUT', body: JSON.stringify(body) });
export const sellerRespondToOrder = (id, body) => request(`/orders/${id}/seller-response`, { method: 'PUT', body: JSON.stringify(body) });
export const markOrderReceived = (id, body) => request(`/orders/${id}/received`, { method: 'PUT', body: JSON.stringify(body) });
export const deleteOrder     = (id)   => request(`/orders/${id}`, { method: 'DELETE' });

/* ── Payments ── */
export const getPayments     = async ()     => (await request('/payments')).data;
export const getPayment      = async (id)   => (await request(`/payments/${id}`)).data;
export const getPaymentsByOrder = async (oid) => (await request(`/payments/order/${oid}`)).data;
export const createPayment   = (body) => request('/payments', { method: 'POST', body: JSON.stringify(body) });
export const updatePaymentStatus = (id, body) => request(`/payments/${id}/status`, { method: 'PUT', body: JSON.stringify(body) });

/* ── Reviews ── */
export const getReviews          = async ()     => (await request('/reviews')).data;
export const getReview           = async (id)   => (await request(`/reviews/${id}`)).data;
export const getProductReviews   = async (pid)  => (await request(`/reviews/product/${pid}`)).data;
export const getSellerReviews    = async (sid)  => (await request(`/reviews/seller/${sid}`)).data;
export const getUserReviews      = async (uid)  => (await request(`/reviews/user/${uid}`)).data;
export const createProductReview = (body) => request('/reviews/product', { method: 'POST', body: JSON.stringify(body) });
export const createSellerReview  = (body) => request('/reviews/seller', { method: 'POST', body: JSON.stringify(body) });
export const updateReview        = (id, body) => request(`/reviews/${id}`, { method: 'PUT', body: JSON.stringify(body) });
export const deleteReview        = (id)   => request(`/reviews/${id}`, { method: 'DELETE' });
