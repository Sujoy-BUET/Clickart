import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Store, Eye, EyeOff, Mail, Phone, MapPin, FileText } from 'lucide-react';
import { createSeller, addSellerEmail, addSellerPhone, addSellerAddress } from '../api';

export default function SellerRegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ 
    seller_name: '', 
    seller_password: '',
    store_name: '',
    store_description: '',
    email: '',
    phone_number: '',
    address: {
      house_no: '',
      road_no: '',
      postal_code: '',
      area: '',
      district: '',
      division: '',
      country: 'Bangladesh'
    }
  });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (field) => (e) => {
    const value = e.target.value;
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setForm(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setForm(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      // Create seller with basic info
      const newSeller = await createSeller({
        seller_name: form.seller_name,
        seller_password: form.seller_password,
        store_name: form.store_name,
        store_description: form.store_description || null
      });
      
      const sellerData = newSeller.data;
      
      // Add email if provided
      if (form.email) {
        try {
          await addSellerEmail(sellerData.seller_id, { email: form.email });
        } catch (emailError) {
          console.warn('Email creation failed:', emailError.message);
        }
      }
      
      // Add phone if provided
      if (form.phone_number) {
        try {
          await addSellerPhone(sellerData.seller_id, { phone_number: form.phone_number });
        } catch (phoneError) {
          console.warn('Phone creation failed:', phoneError.message);
        }
      }
      
      // Add address if provided
      if (form.address.postal_code && form.address.area && form.address.district && form.address.division) {
        try {
          await addSellerAddress(sellerData.seller_id, {
            house_no: form.address.house_no || null,
            road_no: form.address.road_no || null,
            postal_code: form.address.postal_code,
            area: form.address.area,
            district: form.address.district,
            division: form.address.division,
            country: form.address.country
          });
        } catch (addressError) {
          console.warn('Address creation failed:', addressError.message);
        }
      }
      
      // Navigate to seller login with success message
      navigate('/seller/login', { 
        state: { 
          message: 'Seller account created successfully! Please login with your credentials.' 
        } 
      });
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 text-2xl text-white mb-4">
            <Store className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold">Become a Seller</h1>
          <p className="mt-2 text-sm text-gray-500">Start selling on ClicKart today</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-800 bg-gray-900 p-6 sm:p-8 space-y-5">
          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-2.5 text-sm text-red-400">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Seller Name *</label>
            <input
              required
              value={form.seller_name}
              onChange={handleChange('seller_name')}
              placeholder="Your seller name"
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-emerald-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Store Name *</label>
            <div className="relative">
              <Store className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                required
                value={form.store_name}
                onChange={handleChange('store_name')}
                placeholder="Your store name"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 pl-10 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-emerald-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Store Description (Optional)</label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
              <textarea
                value={form.store_description}
                onChange={handleChange('store_description')}
                placeholder="Describe your store and products"
                rows="3"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 pl-10 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-emerald-500 transition resize-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Email (Optional)</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="email"
                value={form.email}
                onChange={handleChange('email')}
                placeholder="seller@example.com"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 pl-10 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-emerald-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Phone Number (Optional)</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="tel"
                value={form.phone_number}
                onChange={handleChange('phone_number')}
                placeholder="+880 1234 567890"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 pl-10 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-emerald-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Password *</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                required
                minLength={6}
                value={form.seller_password}
                onChange={handleChange('seller_password')}
                placeholder="Min 6 characters"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 pr-10 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-emerald-500 transition"
              />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-gray-500" />
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Store Address (Optional)</label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={form.address.house_no}
                onChange={handleChange('address.house_no')}
                placeholder="House No."
                className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-emerald-500 transition"
              />
              <input
                type="text"
                value={form.address.road_no}
                onChange={handleChange('address.road_no')}
                placeholder="Road No."
                className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-emerald-500 transition"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={form.address.postal_code}
                onChange={handleChange('address.postal_code')}
                placeholder="Postal Code"
                className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-emerald-500 transition"
              />
              <input
                type="text"
                value={form.address.area}
                onChange={handleChange('address.area')}
                placeholder="Area"
                className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-emerald-500 transition"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={form.address.district}
                onChange={handleChange('address.district')}
                placeholder="District"
                className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-emerald-500 transition"
              />
              <input
                type="text"
                value={form.address.division}
                onChange={handleChange('address.division')}
                placeholder="Division"
                className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-emerald-500 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-500 transition disabled:opacity-50"
          >
            <Store className="h-4 w-4" />
            {loading ? 'Creating Account...' : 'Create Seller Account'}
          </button>
        </form>

        <div className="space-y-3 text-center text-sm text-gray-500">
          <p>
            Already have a seller account?{' '}
            <Link to="/seller/login" className="text-emerald-400 hover:text-emerald-300 font-medium transition">
              Sign in as Seller
            </Link>
          </p>
          <p>
            Want to shop instead?{' '}
            <Link to="/register" className="text-violet-400 hover:text-violet-300 font-medium transition">
              Customer Registration
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}