import { useEffect, useState } from 'react';
import { getProducts } from '../api';
import ProductCard from '../components/ProductCard';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { SlidersHorizontal, Package } from 'lucide-react';

export default function ProductListPage() {
  const [products, setProducts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('default');

  useEffect(() => {
    getProducts()
      .then((d) => { setProducts(d); setFiltered(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let result = [...products];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.product_name?.toLowerCase().includes(q) ||
          p.brand_name?.toLowerCase().includes(q) ||
          p.category_name?.toLowerCase().includes(q)
      );
    }

    if (sortBy === 'price-asc')  result.sort((a, b) => Number(a.price) - Number(b.price));
    if (sortBy === 'price-desc') result.sort((a, b) => Number(b.price) - Number(a.price));
    if (sortBy === 'name')       result.sort((a, b) => a.product_name.localeCompare(b.product_name));

    setFiltered(result);
  }, [search, sortBy, products]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">All Products</h1>
        <p className="mt-1 text-sm text-gray-500">{filtered.length} products found</p>
      </div>

      {/* Toolbar */}
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, brand, or category..."
          className="flex-1 rounded-lg border border-gray-700 bg-gray-900 px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition w-full sm:max-w-sm"
        />
        <div className="flex items-center gap-2">
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
