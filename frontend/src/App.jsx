import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import ProductListPage from './pages/ProductListPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import OrdersPage from './pages/OrdersPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import SellersPage from './pages/SellersPage';
import SellerDashboardPage from './pages/SellerDashboardPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="products" element={<ProductListPage />} />
          <Route path="products/:id" element={<ProductDetailPage />} />
          <Route path="cart/:userId" element={<CartPage />} />
          <Route path="checkout/:userId" element={<CheckoutPage />} />
          <Route path="orders/user/:userId" element={<OrdersPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="sellers" element={<SellersPage />} />
          <Route path="sellers/dashboard/:sellerId" element={<SellerDashboardPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
