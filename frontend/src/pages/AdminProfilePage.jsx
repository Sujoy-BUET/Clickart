import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Save, ShieldCheck, User, Mail, Phone, Lock } from 'lucide-react';
import { getAdminProfile, updateAdminCredentials } from '../api';
import { useAuth } from '../context/AuthContext';

const EMPTY_FORM = {
  current_password: '',
  new_admin_name: '',
  new_admin_email: '',
  new_admin_phone: '',
  new_password: '',
};

export default function AdminProfilePage() {
  const navigate = useNavigate();
  const { user, isAdmin, login } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [profile, setProfile] = useState({
    admin_name: '',
    admin_email: '',
    admin_phone: '',
  });
  const [form, setForm] = useState(EMPTY_FORM);

  const token = user?.admin_token || '';

  useEffect(() => {
    if (!isAdmin()) {
      navigate('/admin/login');
      return;
    }

    loadProfile();
  }, [isAdmin, navigate]);

  const loadProfile = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await getAdminProfile(token);
      if (!response?.success) {
        throw new Error(response?.message || 'Failed to load admin profile');
      }

      const nextProfile = {
        admin_name: response?.data?.admin_name || user?.admin_name || '',
        admin_email: response?.data?.admin_email || user?.admin_email || '',
        admin_phone: response?.data?.admin_phone || user?.admin_phone || '',
      };

      setProfile(nextProfile);
      setForm({
        ...EMPTY_FORM,
        new_admin_name: nextProfile.admin_name,
        new_admin_email: nextProfile.admin_email,
        new_admin_phone: nextProfile.admin_phone,
      });
    } catch (err) {
      setError(err.message || 'Failed to load admin profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const currentPassword = String(form.current_password || '');
    if (!currentPassword) {
      setError('Current password is required.');
      return;
    }

    const trimmedName = String(form.new_admin_name || '').trim();
    const trimmedEmail = String(form.new_admin_email || '').trim();
    const trimmedPhone = String(form.new_admin_phone || '').trim();
    const newPassword = String(form.new_password || '');

    const payload = {
      current_password: currentPassword,
    };

    if (trimmedName && trimmedName !== profile.admin_name) {
      payload.new_admin_name = trimmedName;
    }

    if (trimmedEmail && trimmedEmail !== profile.admin_email) {
      payload.new_admin_email = trimmedEmail;
    }

    if (trimmedPhone && trimmedPhone !== profile.admin_phone) {
      payload.new_admin_phone = trimmedPhone;
    }

    if (newPassword.trim()) {
      payload.new_password = newPassword;
    }

    if (Object.keys(payload).length === 1) {
      setError('Change at least one field before saving.');
      return;
    }

    setSaving(true);

    try {
      const response = await updateAdminCredentials(payload, token);
      if (!response?.success) {
        throw new Error(response?.message || 'Failed to update admin profile');
      }

      const updatedProfile = {
        admin_name: response?.data?.admin_name || profile.admin_name,
        admin_email: response?.data?.admin_email || profile.admin_email,
        admin_phone: response?.data?.admin_phone || profile.admin_phone,
      };

      setProfile(updatedProfile);
      setForm((prev) => ({
        ...EMPTY_FORM,
        new_admin_name: updatedProfile.admin_name,
        new_admin_email: updatedProfile.admin_email,
        new_admin_phone: updatedProfile.admin_phone,
      }));

      login({
        ...user,
        admin_name: updatedProfile.admin_name,
        admin_email: updatedProfile.admin_email,
        admin_phone: updatedProfile.admin_phone,
      });

      setSuccess('Admin profile updated successfully.');
    } catch (err) {
      setError(err.message || 'Failed to update admin profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-gray-800 bg-gray-900 px-5 py-8 text-sm text-gray-400">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-600/15 text-amber-400">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-100">Admin Profile</h1>
            <p className="mt-1 text-sm text-gray-400">Update admin name, email, phone, and password.</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-800 bg-gray-900 overflow-hidden">
        <div className="border-b border-gray-800 px-5 py-4">
          <h2 className="text-lg font-semibold">Profile Details</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-5 py-5">
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
              {success}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
                <User className="h-3.5 w-3.5" />
                Admin Name
              </label>
              <input
                type="text"
                value={form.new_admin_name}
                onChange={(e) => handleChange('new_admin_name', e.target.value)}
                placeholder="Admin name"
                autoComplete="off"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
                <Mail className="h-3.5 w-3.5" />
                Email
              </label>
              <input
                type="email"
                value={form.new_admin_email}
                onChange={(e) => handleChange('new_admin_email', e.target.value)}
                placeholder="admin@example.com"
                autoComplete="off"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
                <Phone className="h-3.5 w-3.5" />
                Phone Number
              </label>
              <input
                type="text"
                value={form.new_admin_phone}
                onChange={(e) => handleChange('new_admin_phone', e.target.value)}
                placeholder="01XXXXXXXXX"
                autoComplete="off"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
                <Lock className="h-3.5 w-3.5" />
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={form.new_password}
                  onChange={(e) => handleChange('new_password', e.target.value)}
                  placeholder="Leave empty to keep current"
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 pr-10 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
              <Lock className="h-3.5 w-3.5" />
              Current Password (required)
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                required
                value={form.current_password}
                onChange={(e) => handleChange('current_password', e.target.value)}
                placeholder="Enter current password"
                autoComplete="new-password"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 pr-10 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-amber-500"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Update Profile'}
          </button>
        </form>
      </div>
    </div>
  );
}
