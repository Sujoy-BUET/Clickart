import { useEffect, useState } from 'react';
import { getCategories, getProducts } from '../api';
import ProductCard from '../components/ProductCard';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { SlidersHorizontal, Package, Search } from 'lucide-react';

export default function ProductListPage() {
  const [products, setProducts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('default');

  useEffect(() => {
    Promise.all([
      getProducts(),
      getCategories().catch(() => []),
    ])
      .then(([productRows, categoryRows]) => {
        const safeProducts = Array.isArray(productRows) ? productRows : [];
        const safeCategories = Array.isArray(categoryRows) ? categoryRows : [];
        setProducts(safeProducts);
        setFiltered(safeProducts);
        setCategories(safeCategories);
      })
      .catch(() => {
        setProducts([]);
        setFiltered([]);
        setCategories([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let result = [...products];

    if (selectedCategory !== 'all') {
      result = result.filter((p) => p.category_name === selectedCategory);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.product_name?.toLowerCase().includes(q) ||
          p.brand_name?.toLowerCase().includes(q) ||
          p.category_name?.toLowerCase().includes(q)
      );
    }

    if (sortBy === 'price-asc')  result.sort((a, b) => Number(a.display_price ?? a.price) - Number(b.display_price ?? b.price));
    if (sortBy === 'price-desc') result.sort((a, b) => Number(b.display_price ?? b.price) - Number(a.display_price ?? a.price));
    if (sortBy === 'name')       result.sort((a, b) => a.product_name.localeCompare(b.product_name));

    setFiltered(result);
  }, [search, sortBy, products, selectedCategory]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">All Products</h1>
        <p className="mt-1 text-sm text-gray-500">{filtered.length} products found</p>
      </div>

      {/* Toolbar */}
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, brand, or category..."
            className="w-full rounded-lg border border-gray-700 bg-gray-900 pl-10 pr-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full sm:w-auto rounded-lg border border-gray-700 bg-gray-900 px-3 py-2.5 text-sm text-gray-300 outline-none focus:border-violet-500 cursor-pointer"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.category_id} value={c.category_name}>{c.category_name}</option>
            ))}
          </select>
          <SlidersHorizontal className="h-4 w-4 text-gray-500" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2.5 text-sm text-gray-300 outline-none focus:border-violet-500 cursor-pointer"
          >
            <option value="default">Sort by</option>
            <option value="name">Name A–Z</option>
            <option value="price-asc">Price: Low → High</option>
            <option value="price-desc">Price: High → Low</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <LoadingSpinner />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Package} title="No products found" message="Try a different search term or remove filters." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((p) => (
            <ProductCard key={p.product_id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
