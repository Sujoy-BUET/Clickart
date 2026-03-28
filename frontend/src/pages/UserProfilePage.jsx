import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getUserProfile, updateUserProfile } from '../api';
import { User, Mail, Phone, MapPin, Edit3, Save, X, Plus, Trash2 } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

function UserProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    user_name: '',
    password: '',
    emails: [''],
    phones: [''],
    addresses: [{
      house_no: '',
      road_no: '',
      postal_code: '',
      area: '',
      district: '',
      division: '',
      country: 'Bangladesh'
    }]
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    if (!user?.user_id) return;
    
    try {
      const profileData = await getUserProfile(user.user_id);
      setProfile(profileData);
      setFormData({
        user_name: profileData.user_name || '',
        password: '',
        emails: profileData.emails && profileData.emails.length > 0 ? profileData.emails : [''],
        phones: profileData.phones && profileData.phones.length > 0 ? profileData.phones : [''],
        addresses: profileData.addresses && profileData.addresses.length > 0 ? profileData.addresses : [{
          house_no: '',
          road_no: '',
          postal_code: '',
          area: '',
          district: '',
          division: '',
          country: 'Bangladesh'
        }]
      });
      setLoading(false);
    } catch (error) {
      console.error('Error loading profile:', error);
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEmailChange = (index, value) => {
    setFormData(prev => ({
      ...prev,
      emails: prev.emails.map((email, i) => i === index ? value : email)
    }));
  };

  const handlePhoneChange = (index, value) => {
    setFormData(prev => ({
      ...prev,
      phones: prev.phones.map((phone, i) => i === index ? value : phone)
    }));
  };

  const addEmailField = () => {
    setFormData(prev => ({
      ...prev,
      emails: [...prev.emails, '']
    }));
  };

  const addPhoneField = () => {
    setFormData(prev => ({
      ...prev,
      phones: [...prev.phones, '']
    }));
  };

  const removeEmailField = (index) => {
    if (formData.emails.length > 1) {
      setFormData(prev => ({
        ...prev,
        emails: prev.emails.filter((_, i) => i !== index)
      }));
    }
  };

  const removePhoneField = (index) => {
    if (formData.phones.length > 1) {
      setFormData(prev => ({
        ...prev,
        phones: prev.phones.filter((_, i) => i !== index)
      }));
    }
  };

  const handleAddressChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      addresses: prev.addresses.map((addr, i) => 
        i === index ? { ...addr, [field]: value } : addr
      )
    }));
  };

  const addAddressField = () => {
    setFormData(prev => ({
      ...prev,
      addresses: [...prev.addresses, {
        house_no: '',
        road_no: '',
        postal_code: '',
        area: '',
        district: '',
        division: '',
        country: 'Bangladesh'
      }]
    }));
  };

  const removeAddressField = (index) => {
    if (formData.addresses.length > 1) {
      setFormData(prev => ({
        ...prev,
        addresses: prev.addresses.filter((_, i) => i !== index)
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const updateData = {
        user_name: formData.user_name,
        emails: formData.emails.filter(email => email.trim() !== ''),
        phones: formData.phones.filter(phone => phone.trim() !== ''),
        addresses: formData.addresses.filter(addr => addr.postal_code.trim() !== '')
      };
      
      if (formData.password.trim()) {
        updateData.password = formData.password;
      }

      await updateUserProfile(user.user_id, updateData);
      setEditing(false);
      await loadProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Error updating profile. Please try again.');
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <LoadingSpinner />
    </div>
  );
  
  if (!profile) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <div className="text-red-400 text-lg font-semibold">Profile not found</div>
        <p className="text-gray-400 mt-2">Unable to load your profile information</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-600/15 text-violet-400">
              <User className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-100">My Profile</h1>
              <p className="text-gray-400">Manage your account information</p>
            </div>
          </div>
        </div>
      
        {!editing ? (
          <div className="space-y-6">
            {/* Profile Card */}
            <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-100">Profile Information</h2>
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 transition"
                >
                  <Edit3 className="h-4 w-4" />
                  Edit Profile
                </button>
              </div>
              
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4 text-violet-400" />
                    <label className="text-sm font-medium text-gray-300">Username</label>
                  </div>
                  <div className="rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-2">
                    <span className="text-gray-100">{profile.user_name}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
              <h3 className="text-lg font-semibold text-gray-100 mb-4">Contact Information</h3>
              
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="h-4 w-4 text-violet-400" />
                    <label className="text-sm font-medium text-gray-300">Email Addresses</label>
                  </div>
                  {profile.emails && profile.emails.length > 0 ? (
                    <div className="space-y-2">
                      {profile.emails.map((email, index) => (
                        <div key={index} className="rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-2">
                          <span className="text-gray-100">{email}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-gray-700 bg-gray-800/30 px-3 py-2">
                      <span className="text-gray-500">No emails added</span>
                    </div>
                  )}
                </div>
                
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Phone className="h-4 w-4 text-violet-400" />
                    <label className="text-sm font-medium text-gray-300">Phone Numbers</label>
                  </div>
                  {profile.phones && profile.phones.length > 0 ? (
                    <div className="space-y-2">
                      {profile.phones.map((phone, index) => (
                        <div key={index} className="rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-2">
                          <span className="text-gray-100">{phone}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-gray-700 bg-gray-800/30 px-3 py-2">
                      <span className="text-gray-500">No phones added</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Addresses */}
            <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="h-5 w-5 text-violet-400" />
                <h3 className="text-lg font-semibold text-gray-100">Saved Addresses</h3>
              </div>
              
              {profile.addresses && profile.addresses.length > 0 ? (
                <div className="space-y-3">
                  {profile.addresses.map((addr, index) => (
                    <div key={index} className="rounded-lg border border-gray-700 bg-gray-800/50 p-3 flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-gray-100">
                          {addr.house_no} {addr.road_no}, {addr.area}
                        </p>
                        <p className="text-gray-300 text-sm">
                          {addr.district}, {addr.division}, {addr.country} - {addr.postal_code}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-gray-700 bg-gray-800/30 px-3 py-2">
                  <span className="text-gray-500">No addresses added</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Edit Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-100">Edit Profile</h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="flex items-center gap-2 rounded-lg border border-gray-600 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800 transition"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 transition"
                >
                  <Save className="h-4 w-4" />
                  Save Changes
                </button>
              </div>
            </div>

            {/* Profile Form */}
            <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
              <h3 className="text-lg font-semibold text-gray-100 mb-4">Basic Information</h3>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Username</label>
                  <input
                    type="text"
                    name="user_name"
                    value={formData.user_name}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-gray-100 placeholder-gray-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">New Password <span className="text-gray-500">(optional)</span></label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-gray-100 placeholder-gray-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition"
                    placeholder="Leave empty to keep current password"
                  />
                </div>
              </div>
            </div>

            {/* Email Section */}
            <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-violet-400" />
                  <h3 className="text-lg font-semibold text-gray-100">Email Addresses</h3>
                </div>
                <button
                  type="button"
                  onClick={addEmailField}
                  className="flex items-center gap-1 rounded-lg bg-violet-600/20 px-3 py-1.5 text-sm font-medium text-violet-400 hover:bg-violet-600/30 transition"
                >
                  <Plus className="h-4 w-4" />
                  Add Email
                </button>
              </div>
              
              <div className="space-y-3">
                {formData.emails.map((email, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => handleEmailChange(index, e.target.value)}
                      className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-gray-100 placeholder-gray-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition"
                      placeholder="Enter email address"
                    />
                    <button
                      type="button"
                      onClick={() => removeEmailField(index)}
                      className="flex items-center justify-center w-10 h-10 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30 transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Phone Section */}
            <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Phone className="h-5 w-5 text-violet-400" />
                  <h3 className="text-lg font-semibold text-gray-100">Phone Numbers</h3>
                </div>
                <button
                  type="button"
                  onClick={addPhoneField}
                  className="flex items-center gap-1 rounded-lg bg-violet-600/20 px-3 py-1.5 text-sm font-medium text-violet-400 hover:bg-violet-600/30 transition"
                >
                  <Plus className="h-4 w-4" />
                  Add Phone
                </button>
              </div>
              
              <div className="space-y-3">
                {formData.phones.map((phone, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => handlePhoneChange(index, e.target.value)}
                      className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-gray-100 placeholder-gray-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition"
                      placeholder="Enter phone number"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoneField(index)}
                      className="flex items-center justify-center w-10 h-10 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30 transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Address Section */}
            <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-violet-400" />
                  <h3 className="text-lg font-semibold text-gray-100">Delivery Addresses</h3>
                </div>
                <button
                  type="button"
                  onClick={addAddressField}
                  className="flex items-center gap-1 rounded-lg bg-violet-600/20 px-3 py-1.5 text-sm font-medium text-violet-400 hover:bg-violet-600/30 transition"
                >
                  <Plus className="h-4 w-4" />
                  Add Address
                </button>
              </div>
              
              <div className="space-y-6">
                {formData.addresses.map((address, index) => (
                  <div key={index} className="rounded-lg border border-gray-700 bg-gray-800/30 p-4 space-y-3">
                    <div className="grid gap-3 md:grid-cols-2">
                      <input
                        type="text"
                        value={address.house_no || ''}
                        onChange={(e) => handleAddressChange(index, 'house_no', e.target.value)}
                        placeholder="House No"
                        className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-gray-100 placeholder-gray-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition"
                      />
                      <input
                        type="text"
                        value={address.road_no || ''}
                        onChange={(e) => handleAddressChange(index, 'road_no', e.target.value)}
                        placeholder="Road No"
                        className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-gray-100 placeholder-gray-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition"
                      />
                      <input
                        type="text"
                        required
                        value={address.postal_code || ''}
                        onChange={(e) => handleAddressChange(index, 'postal_code', e.target.value)}
                        placeholder="Postal Code (required)"
                        className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-gray-100 placeholder-gray-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition"
                      />
                      <input
                        type="text"
                        value={address.area || ''}
                        onChange={(e) => handleAddressChange(index, 'area', e.target.value)}
                        placeholder="Area"
                        className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-gray-100 placeholder-gray-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition"
                      />
                      <input
                        type="text"
                        value={address.district || ''}
                        onChange={(e) => handleAddressChange(index, 'district', e.target.value)}
                        placeholder="District"
                        className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-gray-100 placeholder-gray-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition"
                      />
                      <input
                        type="text"
                        value={address.division || ''}
                        onChange={(e) => handleAddressChange(index, 'division', e.target.value)}
                        placeholder="Division"
                        className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-gray-100 placeholder-gray-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition"
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      <input
                        type="text"
                        value={address.country || 'Bangladesh'}
                        onChange={(e) => handleAddressChange(index, 'country', e.target.value)}
                        placeholder="Country"
                        className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-gray-100 placeholder-gray-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition"
                      />
                      {formData.addresses.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeAddressField(index)}
                          className="flex items-center justify-center w-10 h-10 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30 transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default UserProfilePage;