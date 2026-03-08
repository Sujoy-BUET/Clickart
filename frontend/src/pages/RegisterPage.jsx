import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, Eye, EyeOff, Mail, Phone, MapPin } from 'lucide-react';
import { createUser, addUserAddress } from '../api';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ 
    user_name: '', 
    password: '',
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
      // Create user with basic info, email, and phone
      const newUser = await createUser({
        user_name: form.user_name,
        password: form.password,
        email: form.email || undefined,
        phone_number: form.phone_number || undefined
      });
      
      const userData = newUser.data;
      
      // Add address if provided
      if (form.address.postal_code && form.address.area && form.address.district && form.address.division) {
        try {
          await addUserAddress(userData.user_id, {
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
          setError('Account created but address could not be saved. You can add it later.');
        }
      }
      
      // Navigate to login with success message
      navigate('/login', { 
        state: { 
          message: 'Account created successfully! Please login with your credentials.' 
        } 
      });
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Create Account</h1>
          <p className="mt-2 text-sm text-gray-500">Join ClicKart today</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-800 bg-gray-900 p-6 sm:p-8 space-y-5">
          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-2.5 text-sm text-red-400">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Username *</label>
            <input
              required
              value={form.user_name}
              onChange={handleChange('user_name')}
              placeholder="johndoe"
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-violet-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Email *</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="email"
                required
                value={form.email}
                onChange={handleChange('email')}
                placeholder="john@example.com"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 pl-10 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-violet-500 transition"
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
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 pl-10 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-violet-500 transition"
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
                value={form.password}
                onChange={handleChange('password')}
                placeholder="Min 6 characters"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 pr-10 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-violet-500 transition"
              />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-gray-500" />
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Address (Optional)</label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={form.address.house_no}
                onChange={handleChange('address.house_no')}
                placeholder="House No."
                className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-violet-500 transition"
              />
              <input
                type="text"
                value={form.address.road_no}
                onChange={handleChange('address.road_no')}
                placeholder="Road No."
                className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-violet-500 transition"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={form.address.postal_code}
                onChange={handleChange('address.postal_code')}
                placeholder="Postal Code"
                className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-violet-500 transition"
              />
              <input
                type="text"
                value={form.address.area}
                onChange={handleChange('address.area')}
                placeholder="Area"
                className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-violet-500 transition"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={form.address.district}
                onChange={handleChange('address.district')}
                placeholder="District"
                className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-violet-500 transition"
              />
              <input
                type="text"
                value={form.address.division}
                onChange={handleChange('address.division')}
                placeholder="Division"
                className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-violet-500 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white hover:bg-violet-500 transition disabled:opacity-50"
          >
            <UserPlus className="h-4 w-4" />
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link to="/login" className="text-violet-400 hover:text-violet-300 font-medium transition">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
