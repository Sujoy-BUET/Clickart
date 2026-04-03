import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Store, Mail, Phone, MapPin, Star, Package, Plus, Edit, Trash2 } from 'lucide-react';
import { createProduct, createSellerReview, deleteProduct, getProduct, getSeller, getSellerOrders, getSellerReviews, getProducts, getSellerSalesSummary, sellerRespondToOrder, updateProduct } from '../api';
import { useAuth } from '../context/AuthContext';
import StarRating from '../components/StarRating';
import LoadingSpinner from '../components/LoadingSpinner';

const DEFAULT_PRODUCT_IMAGE = '/default-product.svg';

const resolveProductImage = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return DEFAULT_PRODUCT_IMAGE;
  if (/^https?:\/\//i.test(raw) || raw.startsWith('/')) return raw;
  return `/${raw}`;
};

const toInitCap = (value) => {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';

  return trimmed
    .split(/\s+/)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1).toLowerCase())
    .join(' ');
};

const isPlainObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

const toObjectArray = (value) => {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => isPlainObject(item));
};

export default function SellerDashboardPage() {
  const { sellerId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [seller, setSeller] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [products, setProducts] = useState([]);
  const [salesSummary, setSalesSummary] = useState({
    total_units_sold: 0,
    total_sales_amount: 0,
    total_orders: 0,
    sales_history: [],
    monthly_breakdown: [],
  });
  const [sellerOrders, setSellerOrders] = useState([]);
  const [selectedMonthKey, setSelectedMonthKey] = useState('all');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('products');
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [orderActionLoading, setOrderActionLoading] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    rating: '5',
    comment: '',
  });
  const [editingProductId, setEditingProductId] = useState(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [brandOptions, setBrandOptions] = useState([]);
  const [productForm, setProductForm] = useState({
    product_name: '',
    description: '',
    price: '',
    stock_quantity: '',
    product_image: '',
    category_id: '',
    category_name: '',
    category_input: '',
    brand_id: '',
    brand_name: '',
    brand_input: '',
    variations: [],
  });

  const isAuthenticatedUser = Boolean(user);
  const isSellerUser = Boolean(user?.seller_id);

  // Determine which seller to show
  const targetSellerId = sellerId || (isSellerUser ? user?.seller_id : null);
  const isOwnDashboard = isSellerUser && Number(targetSellerId) === Number(user?.seller_id);

  const buildCategoryAndBrandOptions = (allProducts) => {
    const categoryMap = new Map();
    const brandMap = new Map();

    toObjectArray(allProducts).forEach((item) => {
      if (item.category_id) {
        categoryMap.set(item.category_id, {
          category_id: item.category_id,
          category_name: item.category_name || `Category ${item.category_id}`,
        });
      }

      if (item.brand_id) {
        brandMap.set(item.brand_id, {
          brand_id: item.brand_id,
          brand_name: item.brand_name || `Brand ${item.brand_id}`,
        });
      }
    });

    setCategoryOptions(Array.from(categoryMap.values()));
    setBrandOptions(Array.from(brandMap.values()));
  };

  const refreshSellerProducts = useCallback(async () => {
    const all = await getProducts().catch(() => []);
    const allProducts = toObjectArray(all);
    setProducts(allProducts.filter((x) => Number(x.seller_id) === Number(targetSellerId)));
    buildCategoryAndBrandOptions(allProducts);
  }, [targetSellerId]);

  const refreshSellerOrders = useCallback(async () => {
    const orders = await getSellerOrders(targetSellerId).catch(() => []);
    setSellerOrders(toObjectArray(orders));
  }, [targetSellerId]);

  const loadSellerReviews = useCallback(async () => {
    const reviewRows = await getSellerReviews(targetSellerId).catch(() => []);
    const reviewPayload = Array.isArray(reviewRows) ? reviewRows : (Array.isArray(reviewRows?.data) ? reviewRows.data : []);
    setReviews(toObjectArray(reviewPayload));
  }, [targetSellerId]);

  const resetProductForm = () => {
    setProductForm({
      product_name: '',
      description: '',
      price: '',
      stock_quantity: '',
      product_image: '',
      category_id: '',
      category_name: '',
      category_input: '',
      brand_id: '',
      brand_name: '',
      brand_input: '',
      variations: [],
    });
  };

  const openCreateProductForm = () => {
    setActionError('');
    setActionSuccess('');
    setEditingProductId(null);
    resetProductForm();
    setShowProductForm(true);
  };

  const openEditProductForm = async (product) => {
    setActionError('');
    setActionSuccess('');

    setSubmitting(true);
    try {
      const details = await getProduct(product.product_id);
      const safeProduct = details || product;
      const safeVariations = Array.isArray(safeProduct.variations) ? safeProduct.variations : [];

      setEditingProductId(safeProduct.product_id);
      setProductForm({
        product_name: safeProduct.product_name || '',
        description: safeProduct.description || '',
        price: safeProduct.price ?? '',
        stock_quantity: safeProduct.stock_quantity ?? '',
        product_image: safeProduct.product_image || '',
        category_id: safeProduct.category_id ?? '',
        category_name: '',
        category_input: safeProduct.category_name || '',
        brand_id: safeProduct.brand_id ?? '',
        brand_name: '',
        brand_input: safeProduct.brand_name || '',
        variations: safeVariations.map((variation) => ({
          variation_type: variation.variation_type || '',
          variation_value: variation.variation_value || '',
          price: variation.price ?? '',
          stock_quantity: variation.stock_quantity ?? '',
        })),
      });
      setShowProductForm(true);
    } catch (err) {
      setActionError(err?.message || 'Failed to load product details for edit.');
    } finally {
      setSubmitting(false);
    }
  };

  const closeProductForm = () => {
    setShowProductForm(false);
    setEditingProductId(null);
    resetProductForm();
  };

  const handleProductFormChange = (field, value) => {
    setProductForm((prev) => ({ ...prev, [field]: value }));
  };

  const matchSuggestion = (inputValue, options, nameKey) => {
    const normalized = String(inputValue || '').trim().toLowerCase();
    if (!normalized) return null;
    return options.find((option) => String(option[nameKey] || '').trim().toLowerCase() === normalized) || null;
  };

  const handleCategoryInputChange = (value) => {
    const matched = matchSuggestion(value, categoryOptions, 'category_name');
    if (matched) {
      setProductForm((prev) => ({
        ...prev,
        category_input: matched.category_name,
        category_id: matched.category_id,
        category_name: '',
      }));
      return;
    }

    setProductForm((prev) => ({
      ...prev,
      category_input: value,
      category_id: '',
      category_name: value,
    }));
  };

  const handleBrandInputChange = (value) => {
    const matched = matchSuggestion(value, brandOptions, 'brand_name');
    if (matched) {
      setProductForm((prev) => ({
        ...prev,
        brand_input: matched.brand_name,
        brand_id: matched.brand_id,
        brand_name: '',
      }));
      return;
    }

    setProductForm((prev) => ({
      ...prev,
      brand_input: value,
      brand_id: '',
      brand_name: value,
    }));
  };

  const normalizeAutocompleteInputs = () => {
    setProductForm((prev) => {
      const next = { ...prev };

      if (!next.category_id && String(next.category_input || '').trim()) {
        const formattedCategory = toInitCap(next.category_input);
        next.category_input = formattedCategory;
        next.category_name = formattedCategory;
      }

      if (!next.brand_id && String(next.brand_input || '').trim()) {
        const formattedBrand = toInitCap(next.brand_input);
        next.brand_input = formattedBrand;
        next.brand_name = formattedBrand;
      }

      return next;
    });
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();

    setActionError('');
    setActionSuccess('');

    if (!isOwnDashboard) {
      setActionError('You can only manage products from your own dashboard.');
      return;
    }

    const normalizedCategoryName = toInitCap(productForm.category_name || productForm.category_input);
    const normalizedBrandName = toInitCap(productForm.brand_name || productForm.brand_input);

    if (!productForm.brand_id && !normalizedBrandName) {
      setActionError('Please select or enter a brand.');
      return;
    }

    if (!productForm.category_id && !normalizedCategoryName) {
      setActionError('Please select or enter a category.');
      return;
    }

    const payload = {
      product_name: String(productForm.product_name).trim(),
      description: String(productForm.description).trim() || null,
      price: Number(productForm.price),
      stock_quantity: productForm.stock_quantity === '' ? 0 : Number(productForm.stock_quantity),
      product_image: String(productForm.product_image).trim() || null,
    };

    if (productForm.brand_id) {
      payload.brand_id = Number(productForm.brand_id);
    } else {
      payload.brand_name = normalizedBrandName;
    }

    if (productForm.category_id) {
      payload.category_id = Number(productForm.category_id);
    } else {
      payload.category_name = normalizedCategoryName;
    }

    const shouldSendVariations = editingProductId
      ? Array.isArray(productForm.variations)
      : (Array.isArray(productForm.variations) && productForm.variations.length > 0);

    if (shouldSendVariations) {
      payload.variations = productForm.variations
        .filter((variation) => String(variation.variation_type || '').trim() && String(variation.variation_value || '').trim())
        .map((variation) => ({
          variation_type: String(variation.variation_type).trim(),
          variation_value: String(variation.variation_value).trim(),
          price: variation.price === '' ? undefined : Number(variation.price),
          stock_quantity: variation.stock_quantity === '' ? undefined : Number(variation.stock_quantity),
        }));
    }

    if (!payload.product_name || Number.isNaN(payload.price) || Number.isNaN(payload.stock_quantity) || payload.stock_quantity < 0) {
      setActionError('Please provide valid product name, price, and stock.');
      return;
    }

    setSubmitting(true);
    try {
      let response;

      if (editingProductId) {
        response = await updateProduct(editingProductId, payload);
      } else {
        response = await createProduct({
          ...payload,
          seller_id: Number(targetSellerId),
        });
      }

      if (!response?.success) {
        setActionError(response?.message || 'Failed to save product.');
        return;
      }

      await refreshSellerProducts();
      setActionSuccess(editingProductId ? 'Product updated successfully.' : 'Product created successfully.');
      closeProductForm();
    } catch (err) {
      setActionError(err?.message || 'Failed to save product.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSellerOrderResponse = async (orderId, approvalStatus) => {
    if (!isOwnDashboard) {
      setActionError('You can only act on orders from your own dashboard.');
      return;
    }

    setActionError('');
    setActionSuccess('');
    setOrderActionLoading(true);
    try {
      const response = await sellerRespondToOrder(orderId, {
        seller_id: Number(targetSellerId),
        approval_status: approvalStatus,
      });

      if (!response?.success) {
        setActionError(response?.message || 'Failed to update seller order response.');
        return;
      }

      setActionSuccess(`Order #${orderId} ${approvalStatus === 'CONFIRMED' ? 'confirmed' : 'rejected'} successfully.`);
      await refreshSellerOrders();
    } catch (err) {
      setActionError(err?.message || 'Failed to update seller order response.');
    } finally {
      setOrderActionLoading(false);
    }
  };

  const handleDeleteProduct = async (productId) => {
    setActionError('');
    setActionSuccess('');

    if (!isOwnDashboard) {
      setActionError('You can only delete products from your own dashboard.');
      return;
    }

    const confirmed = window.confirm('Are you sure you want to delete this product?');
    if (!confirmed) return;

    setSubmitting(true);
    try {
      const response = await deleteProduct(productId);
      if (!response?.success) {
        setActionError(response?.message || 'Failed to delete product.');
        return;
      }

      await refreshSellerProducts();
      setActionSuccess('Product deleted successfully.');
    } catch (err) {
      setActionError(err?.message || 'Failed to delete product.');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    setError('');

    // Redirect if not authenticated and accessing /seller/dashboard
    if (!sellerId && !isAuthenticatedUser) {
      navigate('/seller/login');
      return;
    }
    
    // Redirect if not a seller and accessing /seller/dashboard
    if (!sellerId && !isSellerUser) {
      navigate('/login');
      return;
    }

    if (!targetSellerId) {
      setLoading(false);
      return;
    }

    let active = true;

    const loadDashboard = async () => {
      setLoading(true);

      try {
        const sellerResponse = await getSeller(targetSellerId).catch(() => null);
        if (!active) return;

        const sellerPayload = isPlainObject(sellerResponse?.data)
          ? sellerResponse.data
          : (isPlainObject(sellerResponse) ? sellerResponse : null);

        if (!sellerPayload || !sellerPayload.seller_id) {
          setSeller(null);
          setError('Seller not found.');
          setLoading(false);
          return;
        }

        setSeller(sellerPayload);
        setLoading(false);

        const reviewsPromise = getSellerReviews(targetSellerId).catch(() => []);
        const productsPromise = getProducts().catch(() => []);
        const salesPromise = isOwnDashboard
          ? getSellerSalesSummary(targetSellerId).catch(() => null)
          : Promise.resolve(null);
        const sellerOrdersPromise = isOwnDashboard
          ? getSellerOrders(targetSellerId).catch(() => [])
          : Promise.resolve([]);

        const [r, p, sales, sellerOrderRows] = await Promise.all([
          reviewsPromise,
          productsPromise,
          salesPromise,
          sellerOrdersPromise,
        ]);

        if (!active) return;

        const reviewPayload = Array.isArray(r) ? r : (Array.isArray(r?.data) ? r.data : []);
        setReviews(toObjectArray(reviewPayload));

        const all = toObjectArray(p);
        const sellerProducts = all.filter((x) => Number(x.seller_id) === Number(targetSellerId));
        setProducts(sellerProducts);
        buildCategoryAndBrandOptions(all);

        setSellerOrders(toObjectArray(sellerOrderRows));

        if (sales) {
          setSalesSummary({
            total_units_sold: Number(sales.total_units_sold || 0),
            total_sales_amount: Number(sales.total_sales_amount || 0),
            total_orders: Number(sales.total_orders || 0),
            sales_history: Array.isArray(sales.sales_history) ? sales.sales_history : [],
            monthly_breakdown: Array.isArray(sales.monthly_breakdown) ? sales.monthly_breakdown : [],
          });
        }
      } catch {
        if (!active) return;
        setLoading(false);
        setError('Failed to load seller dashboard data.');
      }
    };

    void loadDashboard();

    return () => {
      active = false;
    };
  }, [targetSellerId, sellerId, isAuthenticatedUser, isSellerUser, navigate, isOwnDashboard]);

  const reviewFeed = useMemo(() => {
    return toObjectArray(reviews).sort((a, b) => {
      const aTime = a?.review_date ? new Date(a.review_date).getTime() : 0;
      const bTime = b?.review_date ? new Date(b.review_date).getTime() : 0;
      return bTime - aTime;
    });
  }, [reviews]);

  const averageSellerRating = useMemo(() => {
    if (!reviewFeed.length) return 0;
    const total = reviewFeed.reduce((sum, item) => sum + Number(item.rating || 0), 0);
    return total / reviewFeed.length;
  }, [reviewFeed]);

  const canUserReviewSeller = Boolean(user?.user_id) && !isOwnDashboard;

  const handleCreateSellerReview = async (e) => {
    e.preventDefault();
    if (!canUserReviewSeller) return;

    setActionError('');
    setActionSuccess('');
    setReviewSubmitting(true);

    try {
      const response = await createSellerReview({
        reviewer_user_id: Number(user.user_id),
        seller_id: Number(targetSellerId),
        rating: Number(reviewForm.rating),
        comment: String(reviewForm.comment || '').trim(),
      });

      if (!response?.success) {
        setActionError(response?.message || 'Failed to submit seller review.');
        return;
      }

      setReviewForm({ rating: '5', comment: '' });
      setActionSuccess('Seller review submitted successfully.');
      await loadSellerReviews();
    } catch (err) {
      setActionError(err?.message || 'Failed to submit seller review.');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const tabs = isOwnDashboard
    ? [
      { key: 'products', label: 'Products', count: products.length },
      { key: 'orders', label: 'Orders', count: sellerOrders.length },
      { key: 'sales', label: 'Sales', count: salesSummary.sales_history.length },
      { key: 'reviews', label: 'Reviews', count: reviewFeed.length },
      { key: 'info', label: 'Info' },
    ]
    : [
      { key: 'products', label: 'Products', count: products.length },
      { key: 'reviews', label: 'Reviews', count: reviewFeed.length },
      { key: 'info', label: 'Info' },
    ];

  useEffect(() => {
    if (!tabs.some((item) => item.key === tab)) {
      setTab('products');
    }
  }, [tab, tabs]);

  const monthlyRows = Array.isArray(salesSummary?.monthly_breakdown) ? salesSummary.monthly_breakdown : [];

  const monthlyOptions = Array.from(
    new Map(
      monthlyRows.map((row) => {
        const key = `${row.year}-${String(row.month).padStart(2, '0')}`;
        return [key, { key, label: row.month_year }];
      })
    ).values()
  );
  const filteredMonthlyRows = selectedMonthKey === 'all'
    ? monthlyRows
    : monthlyRows.filter((row) => `${row.year}-${String(row.month).padStart(2, '0')}` === selectedMonthKey);

  if (loading) return <LoadingSpinner />;

  if (!seller) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 space-y-4">
        <Store className="w-12 h-12 text-gray-400" />
        <h2 className="text-xl font-semibold text-gray-600">Seller not found</h2>
        <p className="text-gray-500">The seller you're looking for doesn't exist.</p>
        <Link to="/sellers" className="text-emerald-600 hover:underline">
          Browse all sellers
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      {error && (
        <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="mb-8 flex flex-col items-start gap-6 sm:flex-row">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-3xl font-bold text-white shadow-lg shadow-violet-600/20">
          {seller.store_name?.[0] ?? 'S'}
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold">{seller.store_name}</h1>
            {seller.is_verified && (
              <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-400">
                Verified Seller
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-400">{seller.seller_name}</p>
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1"><Package className="h-4 w-4" /> {products.length} products</span>
            <span className="flex items-center gap-1"><Star className="h-4 w-4 text-amber-400" /> {reviewFeed.length > 0 ? `${averageSellerRating.toFixed(1)} (${reviewFeed.length})` : 'No ratings yet'}</span>
          </div>
        </div>
      </div>

      <div className="mb-8 flex gap-1 border-b border-gray-800">
        {tabs.map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`-mb-px border-b-2 px-4 py-3 text-sm font-medium transition ${
              tab === key
                ? 'border-violet-500 text-violet-400'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            {label} {count !== undefined && <span className="ml-1 text-xs text-gray-600">({count})</span>}
          </button>
        ))}
      </div>

      {tab === 'products' && (
        <div>
          {actionSuccess && (
            <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
              {actionSuccess}
            </div>
          )}

          {actionError && (
            <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {actionError}
            </div>
          )}

          {isOwnDashboard && (
            <div className="mb-6">
              <button
                onClick={openCreateProductForm}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
              >
                <Plus className="w-4 h-4" />
                Add Product
              </button>
            </div>
          )}

          {isOwnDashboard && showProductForm && (
            <form onSubmit={handleProductSubmit} className="mb-6 space-y-4 rounded-xl border border-gray-800 bg-gray-900 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-gray-200">
                  {editingProductId ? 'Edit Product' : 'Create Product'}
                </h3>
                <button
                  type="button"
                  onClick={closeProductForm}
                  className="text-xs text-gray-400 transition hover:text-gray-200"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  required
                  value={productForm.product_name}
                  onChange={(e) => handleProductFormChange('product_name', e.target.value)}
                  placeholder="Product name"
                  className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-emerald-500"
                />
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={productForm.price}
                  onChange={(e) => handleProductFormChange('price', e.target.value)}
                  placeholder="Price"
                  className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-emerald-500"
                />
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={productForm.stock_quantity}
                  onChange={(e) => handleProductFormChange('stock_quantity', e.target.value)}
                  placeholder="Stock quantity (optional)"
                  className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-emerald-500"
                />
                <input
                  value={productForm.product_image}
                  onChange={(e) => handleProductFormChange('product_image', e.target.value)}
                  placeholder="Image URL (optional)"
                  className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-emerald-500"
                />
                <input
                  required
                  list="seller-category-options"
                  value={productForm.category_input}
                  onChange={(e) => handleCategoryInputChange(e.target.value)}
                  onBlur={normalizeAutocompleteInputs}
                  placeholder="Search or type category"
                  className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-emerald-500"
                />
                <datalist id="seller-category-options">
                  {categoryOptions.map((option) => (
                    <option key={option.category_id} value={option.category_name} />
                  ))}
                </datalist>
                <input
                  required
                  list="seller-brand-options"
                  value={productForm.brand_input}
                  onChange={(e) => handleBrandInputChange(e.target.value)}
                  onBlur={normalizeAutocompleteInputs}
                  placeholder="Search or type brand"
                  className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-emerald-500"
                />
                <datalist id="seller-brand-options">
                  {brandOptions.map((option) => (
                    <option key={option.brand_id} value={option.brand_name} />
                  ))}
                </datalist>
              </div>

              <textarea
                value={productForm.description}
                onChange={(e) => handleProductFormChange('description', e.target.value)}
                placeholder="Product description (optional)"
                rows={3}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-emerald-500"
              />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-200">Variations (optional)</p>
                  <button
                    type="button"
                    onClick={() => {
                      setProductForm((prev) => ({
                        ...prev,
                        variations: [
                          ...prev.variations,
                          { variation_type: '', variation_value: '', price: '', stock_quantity: '' },
                        ],
                      }));
                    }}
                    className="rounded-md border border-gray-700 px-2 py-1 text-xs text-gray-300 hover:bg-gray-800"
                  >
                    Add variation
                  </button>
                </div>

                {productForm.variations.map((variation, index) => (
                  <div key={`variation-${index}`} className="grid grid-cols-1 gap-2 sm:grid-cols-5">
                    <input
                      value={variation.variation_type}
                      onChange={(e) => {
                        const next = [...productForm.variations];
                        next[index] = { ...next[index], variation_type: e.target.value };
                        handleProductFormChange('variations', next);
                      }}
                      placeholder="Type (Color, Size)"
                      className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-emerald-500"
                    />
                    <input
                      value={variation.variation_value}
                      onChange={(e) => {
                        const next = [...productForm.variations];
                        next[index] = { ...next[index], variation_value: e.target.value };
                        handleProductFormChange('variations', next);
                      }}
                      placeholder="Value (Red, XL)"
                      className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-emerald-500"
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={variation.price}
                      onChange={(e) => {
                        const next = [...productForm.variations];
                        next[index] = { ...next[index], price: e.target.value };
                        handleProductFormChange('variations', next);
                      }}
                      placeholder="Price"
                      className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-emerald-500"
                    />
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={variation.stock_quantity}
                      onChange={(e) => {
                        const next = [...productForm.variations];
                        next[index] = { ...next[index], stock_quantity: e.target.value };
                        handleProductFormChange('variations', next);
                      }}
                      placeholder="Stock"
                      className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const next = productForm.variations.filter((_, itemIndex) => itemIndex !== index);
                        handleProductFormChange('variations', next);
                      }}
                      className="rounded-lg border border-red-500/40 px-3 py-2 text-xs text-red-300 hover:bg-red-500/10"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {submitting ? 'Saving...' : (editingProductId ? 'Update Product' : 'Create Product')}
              </button>
            </form>
          )}

          {products.length === 0 ? (
            <div className="py-10 text-center">
              <Package className="mx-auto mb-3 h-12 w-12 text-gray-400" />
              <p className="text-gray-500">
                {isOwnDashboard ? "You haven't listed any products yet." : 'No products listed yet.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {products.map((p) => (
                <div
                  key={p.product_id}
                  className="flex items-center gap-4 rounded-xl border border-gray-800 bg-gray-900 p-4 transition hover:border-gray-700"
                >
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-800">
                    <img
                      src={resolveProductImage(p.product_image)}
                      alt={p.product_name || 'Product image'}
                      loading="lazy"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = DEFAULT_PRODUCT_IMAGE;
                      }}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link to={`/products/${p.product_id}`} className="block truncate text-sm font-semibold text-gray-100 transition hover:text-violet-400">
                      {p.product_name}
                    </Link>
                    <p className="text-xs text-gray-500">{p.brand_name} · {p.category_name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-violet-400">৳{Number(p.price).toLocaleString('en-BD')}</span>
                    {isOwnDashboard && (
                      <div className="flex gap-1">
                        <button onClick={() => openEditProductForm(p)} className="p-1 text-gray-400 transition hover:text-blue-400">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteProduct(p.product_id)} className="p-1 text-gray-400 transition hover:text-red-400">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'sales' && isOwnDashboard && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-400">Total Units Sold</p>
              <p className="mt-2 text-2xl font-semibold text-emerald-300">{salesSummary.total_units_sold}</p>
            </div>
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-400">Total Sales Amount</p>
              <p className="mt-2 text-2xl font-semibold text-violet-300">৳{Number(salesSummary.total_sales_amount || 0).toLocaleString('en-BD')}</p>
            </div>
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-400">Total Orders</p>
              <p className="mt-2 text-2xl font-semibold text-amber-300">{salesSummary.total_orders}</p>
            </div>
          </div>

          <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
            <h3 className="text-sm font-semibold text-gray-200 mb-4">Sales History (When and How Much Sold)</h3>
            {salesSummary.sales_history.length === 0 ? (
              <p className="text-sm text-gray-500">No sold items yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800 text-left text-gray-400">
                      <th className="px-2 py-2">Date & Time</th>
                      <th className="px-2 py-2">Product</th>
                      <th className="px-2 py-2">Qty</th>
                      <th className="px-2 py-2">Unit Price</th>
                      <th className="px-2 py-2">Line Total</th>
                      <th className="px-2 py-2">Order</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesSummary.sales_history.map((row) => (
                      <tr key={row.order_item_id} className="border-b border-gray-800/70 text-gray-300">
                        <td className="px-2 py-2 whitespace-nowrap">{row.order_date ? new Date(row.order_date).toLocaleString() : '-'}</td>
                        <td className="px-2 py-2">
                          <div>{row.product_name}</div>
                          {(row.variation_type || row.variation_value) && (
                            <div className="text-xs text-gray-500">{row.variation_type}: {row.variation_value}</div>
                          )}
                        </td>
                        <td className="px-2 py-2">{row.quantity}</td>
                        <td className="px-2 py-2">৳{Number(row.unit_price || 0).toLocaleString('en-BD')}</td>
                        <td className="px-2 py-2">৳{Number(row.line_total || 0).toLocaleString('en-BD')}</td>
                        <td className="px-2 py-2">#{row.order_id}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-sm font-semibold text-gray-200">Products Sold by Month & Year</h3>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-400">Month, Year</label>
                <select
                  value={selectedMonthKey}
                  onChange={(e) => setSelectedMonthKey(e.target.value)}
                  className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs text-gray-100 outline-none focus:border-violet-500"
                >
                  <option value="all">All months</option>
                  {monthlyOptions.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {filteredMonthlyRows.length === 0 ? (
              <p className="text-sm text-gray-500">No monthly sales records yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800 text-left text-gray-400">
                      <th className="px-2 py-2">Month, Year</th>
                      <th className="px-2 py-2">Product</th>
                      <th className="px-2 py-2">Units Sold</th>
                      <th className="px-2 py-2">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMonthlyRows.map((row, idx) => (
                      <tr key={`${row.year}-${row.month}-${row.product_id}-${idx}`} className="border-b border-gray-800/70 text-gray-300">
                        <td className="px-2 py-2 whitespace-nowrap">{row.month_year}</td>
                        <td className="px-2 py-2">{row.product_name}</td>
                        <td className="px-2 py-2">{row.units_sold}</td>
                        <td className="px-2 py-2">৳{Number(row.total_amount || 0).toLocaleString('en-BD')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'orders' && isOwnDashboard && (
        <div>
          {actionSuccess && (
            <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
              {actionSuccess}
            </div>
          )}

          {actionError && (
            <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {actionError}
            </div>
          )}

          {sellerOrders.length === 0 ? (
            <p className="text-center text-sm text-gray-600 py-10">No seller orders yet.</p>
          ) : (
            <div className="space-y-4">
              {sellerOrders.map((order) => {
                const sellerApproval = String(order.approval_status || 'PENDING').toUpperCase();
                const canTakeAction = isOwnDashboard && sellerApproval === 'PENDING' && !['REJECTED', 'SUCCESSFUL', 'CANCELLED'].includes(String(order.order_status || '').toUpperCase());
                return (
                  <div key={order.order_id} className="rounded-xl border border-gray-800 bg-gray-900 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-gray-200">Order #{order.order_id}</p>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded-full bg-violet-500/10 px-2.5 py-1 text-violet-300">Order: {order.order_status}</span>
                        <span className={`rounded-full px-2.5 py-1 ${sellerApproval === 'CONFIRMED' ? 'bg-emerald-500/10 text-emerald-300' : sellerApproval === 'REJECTED' ? 'bg-red-500/10 text-red-300' : 'bg-amber-500/10 text-amber-300'}`}>
                          Seller: {sellerApproval}
                        </span>
                      </div>
                    </div>

                    <p className="mt-2 text-xs text-gray-500">{order.order_date ? new Date(order.order_date).toLocaleString() : ''}</p>
                    <p className="mt-2 text-sm text-gray-400">Your units: {Number(order.seller_units || 0)} | Amount: ৳{Number(order.seller_amount || 0).toLocaleString('en-BD')}</p>

                    {Array.isArray(order.items) && order.items.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {order.items.map((item) => (
                          <div key={item.order_item_id} className="rounded-lg bg-gray-800/60 px-3 py-2">
                            <p className="text-sm font-medium text-gray-200">{item.product_name}</p>
                            <p className="text-xs text-gray-400">Qty: {item.quantity} | Unit: ৳{Number(item.unit_price || 0).toLocaleString('en-BD')}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {canTakeAction && (
                      <div className="mt-4 flex items-center gap-2">
                        <button
                          onClick={() => handleSellerOrderResponse(order.order_id, 'CONFIRMED')}
                          disabled={orderActionLoading}
                          className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => handleSellerOrderResponse(order.order_id, 'REJECTED')}
                          disabled={orderActionLoading}
                          className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'reviews' && (
        <div>
          {canUserReviewSeller && (
            <form onSubmit={handleCreateSellerReview} className="mb-5 rounded-xl border border-gray-800 bg-gray-900 p-4">
              <p className="mb-3 text-sm font-semibold text-gray-200">Rate this shop</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[140px_1fr_auto]">
                <select
                  value={reviewForm.rating}
                  onChange={(e) => setReviewForm((prev) => ({ ...prev, rating: e.target.value }))}
                  className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 outline-none focus:border-violet-500"
                >
                  <option value="5">5 - Excellent</option>
                  <option value="4">4 - Good</option>
                  <option value="3">3 - Average</option>
                  <option value="2">2 - Poor</option>
                  <option value="1">1 - Very Poor</option>
                </select>
                <input
                  value={reviewForm.comment}
                  onChange={(e) => setReviewForm((prev) => ({ ...prev, comment: e.target.value }))}
                  placeholder="Write your review (optional)"
                  className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-violet-500"
                />
                <button
                  type="submit"
                  disabled={reviewSubmitting}
                  className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
                >
                  {reviewSubmitting ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </form>
          )}

          {actionSuccess && tab === 'reviews' && (
            <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
              {actionSuccess}
            </div>
          )}

          {actionError && tab === 'reviews' && (
            <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {actionError}
            </div>
          )}

          {reviewFeed.length === 0 ? (
            <p className="text-center text-sm text-gray-600 py-10">No reviews yet.</p>
          ) : (
            <div className="space-y-4">
              {reviewFeed.map((r, i) => (
                <div key={r.review_id ?? i} className="rounded-xl border border-gray-800 bg-gray-900 p-5">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <StarRating rating={r.rating} size={14} />
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">Seller Review</span>
                    </div>
                    <span className="text-xs text-gray-600">{r.review_date ? new Date(r.review_date).toLocaleDateString() : ''}</span>
                  </div>

                  {(r.reviewer_name || r.reviewer_user_id) && (
                    <p className="mb-2 text-xs text-gray-500">By: {r.reviewer_name || `User #${r.reviewer_user_id}`}</p>
                  )}

                  <p className="text-sm text-gray-300">{String(r.comment || '').trim() || 'No written review.'}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'info' && (
        <div className="space-y-4">
          {/* Emails */}
          {Array.isArray(seller.emails) && seller.emails.length > 0 && (
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-3"><Mail className="h-4 w-4 text-violet-400" /> Email Addresses</h3>
              <div className="space-y-1">
                {seller.emails.map((e, i) => (
                  <p key={i} className="text-sm text-gray-400">{e.email ?? e}</p>
                ))}
              </div>
            </div>
          )}

          {/* Phones */}
          {Array.isArray(seller.phones) && seller.phones.length > 0 && (
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-3"><Phone className="h-4 w-4 text-violet-400" /> Phone Numbers</h3>
              <div className="space-y-1">
                {seller.phones.map((p, i) => (
                  <p key={i} className="text-sm text-gray-400">{p.phone ?? p}</p>
                ))}
              </div>
            </div>
          )}

          {/* Addresses */}
          {Array.isArray(seller.addresses) && seller.addresses.length > 0 && (
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-3"><MapPin className="h-4 w-4 text-violet-400" /> Addresses</h3>
              <div className="space-y-2">
                {seller.addresses.map((a, i) => (
                  <p key={i} className="text-sm text-gray-400">
                    {[a.house_no, a.road_no, a.area, a.district, a.division, a.country].filter(Boolean).join(', ')}{a.postal_code ? ` - ${a.postal_code}` : ''}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
