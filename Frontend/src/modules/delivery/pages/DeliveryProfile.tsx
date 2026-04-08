import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DeliveryBottomNav from '../components/DeliveryBottomNav';
import { useDeliveryUser } from '../context/DeliveryUserContext';
import { getDeliveryProfile, updateProfile } from '../../../services/api/delivery/deliveryService';

export default function DeliveryProfile() {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const { userName, setUserName } = useDeliveryUser();

  const [profileData, setProfileData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    vehicleNumber: '',
    vehicleType: 'Bike',
    joinDate: '',
    totalDeliveries: 0,
    rating: 0,
    accountName: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
  });

  // Fetch profile data on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await getDeliveryProfile();
        setProfileData({
          name: data.name,
          phone: data.mobile,
          email: data.email,
          address: data.address,
          vehicleNumber: data.vehicleNumber || '',
          vehicleType: data.vehicleType || 'Bike',
          joinDate: new Date(data.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
          totalDeliveries: data.totalDeliveredCount || 0, // Assuming backend sends this or we need to fetch dashboard stats
          rating: 4.8, // Mock for now
          accountName: data.accountName || '',
          bankName: data.bankName || '',
          accountNumber: data.accountNumber || '',
          ifscCode: data.ifscCode || '',
        });
        setUserName(data.name);
      } catch (error) {
        console.error("Failed to fetch profile", error);
      }
    };
    fetchProfile();
  }, [setUserName]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFieldErrors({});
    // Re-fetch or reset to previous state
  };

  const validateProfile = () => {
    const errors: Record<string, string> = {};

    const normalizedEmail = profileData.email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      errors.email = 'Email should be in format (ex: aaa@gmail.com)';
    }

    const normalizedVehicle = profileData.vehicleNumber.trim().toUpperCase();
    if (normalizedVehicle && !/^[A-Z]{2}[ -]?\d{1,2}[ -]?[A-Z]{1,3}[ -]?\d{4}$/.test(normalizedVehicle)) {
      errors.vehicleNumber = 'Vehicle no. should be in valid format (ex: MP09AB1234)';
    }

    if (profileData.bankName.trim() && !/^[A-Za-z ]+$/.test(profileData.bankName.trim())) {
      errors.bankName = 'Bank name should contain only alphabets';
    }

    if (profileData.accountName.trim() && !/^[A-Za-z ]+$/.test(profileData.accountName.trim())) {
      errors.accountName = 'Account holder name should contain only alphabets';
    }

    if (profileData.accountNumber.trim() && !/^\d{9,15}$/.test(profileData.accountNumber.trim())) {
      errors.accountNumber = 'Account no. should be 9 to 15 digits';
    }

    const normalizedIfsc = profileData.ifscCode.trim().toUpperCase();
    if (normalizedIfsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(normalizedIfsc)) {
      errors.ifscCode = 'IFSC Code should be in format (ex: HDFC0001015)';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateProfile()) {
      return;
    }

    try {
      await updateProfile({
        name: profileData.name.trim(),
        email: profileData.email.trim(),
        address: profileData.address.trim(),
        vehicleNumber: profileData.vehicleNumber.trim().toUpperCase(),
        vehicleType: profileData.vehicleType,
        accountName: profileData.accountName.trim(),
        bankName: profileData.bankName.trim(),
        accountNumber: profileData.accountNumber.trim(),
        ifscCode: profileData.ifscCode.trim().toUpperCase(),
      });
      setUserName(profileData.name.trim());
      setIsEditing(false);
      setFieldErrors({});
      // You could add a toast notification here
    } catch (error) {
      console.error("Failed to update profile", error);
      alert("Failed to update profile");
    }
  };

  const handleInputChange = (field: string, value: string) => {
    let nextValue = value;

    if (field === 'bankName' || field === 'accountName') {
      nextValue = value.replace(/[^A-Za-z ]/g, '');
    }

    if (field === 'accountNumber') {
      nextValue = value.replace(/\D/g, '').slice(0, 15);
    }

    if (field === 'ifscCode') {
      nextValue = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11);
    }

    if (field === 'vehicleNumber') {
      nextValue = value.toUpperCase().replace(/[^A-Z0-9 -]/g, '').slice(0, 15);
    }

    setProfileData((prev) => ({
      ...prev,
      [field]: nextValue,
    }));

    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="min-h-screen bg-neutral-100 pb-20">
      <div className="px-4 py-4">
        <div className="flex items-center mb-4">
          <button
            onClick={() => navigate(-1)}
            className="mr-3 p-2 hover:bg-neutral-200 rounded-full transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M15 18L9 12L15 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <h2 className="text-neutral-900 text-xl font-semibold">Profile</h2>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-neutral-200 mb-4">
          <div className="flex flex-col items-center mb-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center mb-4">
              <span className="text-white text-3xl font-bold">
                {profileData.name.split(' ').map(n => n[0]).join('')}
              </span>
            </div>
            {isEditing ? (
              <div className="w-full max-w-xs">
                <input
                  type="text"
                  value={profileData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full text-center text-neutral-900 text-xl font-semibold mb-2 px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <input
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="w-full text-center text-neutral-600 text-sm px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            ) : (
              <>
                <h3 className="text-neutral-900 text-xl font-semibold mb-1">{profileData.name}</h3>
                <p className="text-neutral-600 text-sm">{profileData.phone}</p>
              </>
            )}
            <div className="flex items-center gap-1 mt-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                  fill="#22c55e"
                />
              </svg>
              <span className="text-neutral-900 font-semibold">{profileData.rating}</span>
            </div>

          </div>
        </div>

        {/* Profile Details */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
          <div className="p-4 border-b border-neutral-200">
            <h3 className="text-neutral-900 font-semibold">Personal Information</h3>
          </div>
          <div className="divide-y divide-neutral-200">
            <div className="p-4">
              <p className="text-neutral-500 text-xs mb-1">Email</p>
              {isEditing ? (
                <input
                  type="email"
                  value={profileData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full text-neutral-900 text-sm px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              ) : (
                <p className="text-neutral-900 text-sm">{profileData.email}</p>
              )}
              {isEditing && fieldErrors.email && <p className="text-red-600 text-xs mt-1">{fieldErrors.email}</p>}
            </div>
            <div className="p-4">
              <p className="text-neutral-500 text-xs mb-1">Address</p>
              {isEditing ? (
                <textarea
                  value={profileData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  rows={2}
                  className="w-full text-neutral-900 text-sm px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                />
              ) : (
                <p className="text-neutral-900 text-sm">{profileData.address}</p>
              )}
            </div>
            <div className="p-4">
              <p className="text-neutral-500 text-xs mb-1">Vehicle Number</p>
              {isEditing ? (
                <input
                  type="text"
                  value={profileData.vehicleNumber}
                  onChange={(e) => handleInputChange('vehicleNumber', e.target.value)}
                  className="w-full text-neutral-900 text-sm px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              ) : (
                <p className="text-neutral-900 text-sm">{profileData.vehicleNumber}</p>
              )}
              {isEditing && fieldErrors.vehicleNumber && <p className="text-red-600 text-xs mt-1">{fieldErrors.vehicleNumber}</p>}
            </div>
            <div className="p-4">
              <p className="text-neutral-500 text-xs mb-1">Vehicle Type</p>
              {isEditing ? (
                <select
                  value={profileData.vehicleType}
                  onChange={(e) => handleInputChange('vehicleType', e.target.value)}
                  className="w-full text-neutral-900 text-sm px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="Bike">Bike</option>
                  <option value="Scooter">Scooter</option>
                  <option value="Car">Car</option>
                  <option value="Cycle">Cycle</option>
                </select>
              ) : (
                <p className="text-neutral-900 text-sm">{profileData.vehicleType}</p>
              )}
            </div>
          </div>
        </div>

        {/* Bank Details */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden mt-4">
          <div className="p-4 border-b border-neutral-200">
            <h3 className="text-neutral-900 font-semibold">Bank Details</h3>
          </div>
          <div className="divide-y divide-neutral-200">
            <div className="p-4">
              <p className="text-neutral-500 text-xs mb-1">Account Holder Name</p>
              {isEditing ? (
                <input
                  type="text"
                  value={profileData.accountName}
                  onChange={(e) => handleInputChange('accountName', e.target.value)}
                  className="w-full text-neutral-900 text-sm px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Enter account holder name"
                />
              ) : (
                <p className="text-neutral-900 text-sm">{profileData.accountName || 'Not Set'}</p>
              )}
              {isEditing && fieldErrors.accountName && <p className="text-red-600 text-xs mt-1">{fieldErrors.accountName}</p>}
            </div>
            <div className="p-4">
              <p className="text-neutral-500 text-xs mb-1">Bank Name</p>
              {isEditing ? (
                <input
                  type="text"
                  value={profileData.bankName}
                  onChange={(e) => handleInputChange('bankName', e.target.value)}
                  className="w-full text-neutral-900 text-sm px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="e.g. HDFC Bank"
                />
              ) : (
                <p className="text-neutral-900 text-sm">{profileData.bankName || 'Not Set'}</p>
              )}
              {isEditing && fieldErrors.bankName && <p className="text-red-600 text-xs mt-1">{fieldErrors.bankName}</p>}
            </div>
            <div className="p-4">
              <p className="text-neutral-500 text-xs mb-1">Account Number</p>
              {isEditing ? (
                <input
                  type="text"
                  value={profileData.accountNumber}
                  onChange={(e) => handleInputChange('accountNumber', e.target.value)}
                  className="w-full text-neutral-900 text-sm px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Enter account number"
                />
              ) : (
                <p className="text-neutral-900 text-sm">{profileData.accountNumber ? `XXXX${profileData.accountNumber.slice(-4)}` : 'Not Set'}</p>
              )}
              {isEditing && fieldErrors.accountNumber && <p className="text-red-600 text-xs mt-1">{fieldErrors.accountNumber}</p>}
            </div>
            <div className="p-4">
              <p className="text-neutral-500 text-xs mb-1">IFSC Code</p>
              {isEditing ? (
                <input
                  type="text"
                  value={profileData.ifscCode}
                  onChange={(e) => handleInputChange('ifscCode', e.target.value)}
                  className="w-full text-neutral-900 text-sm px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="e.g. HDFC0001234"
                />
              ) : (
                <p className="text-neutral-900 text-sm">{profileData.ifscCode || 'Not Set'}</p>
              )}
              {isEditing && fieldErrors.ifscCode && <p className="text-red-600 text-xs mt-1">{fieldErrors.ifscCode}</p>}
            </div>
          </div>
        </div>

        {/* Stats Card */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 mt-4 p-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-neutral-500 text-xs mb-1">Total Deliveries</p>
              <p className="text-neutral-900 text-2xl font-bold">{profileData.totalDeliveries}</p>
            </div>
            <div className="text-center">
              <p className="text-neutral-500 text-xs mb-1">Joined On</p>
              <p className="text-neutral-900 text-sm font-semibold">{profileData.joinDate}</p>
            </div>
          </div>
        </div>

        {/* Edit/Save/Cancel Buttons */}
        {isEditing ? (
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleCancel}
              className="flex-1 bg-neutral-200 text-neutral-900 rounded-xl py-3 font-semibold hover:bg-neutral-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 bg-orange-500 text-white rounded-xl py-3 font-semibold hover:bg-orange-600 transition-colors"
            >
              Save Changes
            </button>
          </div>
        ) : (
          <button
            onClick={handleEdit}
            className="w-full mt-4 bg-orange-500 text-white rounded-xl py-3 font-semibold hover:bg-orange-600 transition-colors"
          >
            Edit Profile
          </button>
        )}
      </div>
      <DeliveryBottomNav />
    </div>
  );
}

