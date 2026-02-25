import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getProfile, CustomerProfile } from '../../services/api/customerService';
import { motion, AnimatePresence } from 'framer-motion';

export default function Account() {
  const navigate = useNavigate();
  const { user, logout: authLogout } = useAuth();
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showGstModal, setShowGstModal] = useState(false);
  const [gstNumber, setGstNumber] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      // Skip API call if backend is not available
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');
        const response = await getProfile();
        if (response.success) {
          setProfile(response.data);
        }
      } catch (err: any) {
        // Silently handle all errors - just use auth context data
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const handleLogout = () => {
    authLogout();
    navigate('/login');
  };

  const handleGstSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowGstModal(false);
  };

  // Show login/signup prompt for unregistered users
  if (!user) {
    return (
      <div className="pb-24 md:pb-8 bg-neutral-50 min-h-screen">
        <div className="bg-white pb-12 pt-16 rounded-b-[40px] shadow-sm border-b border-neutral-100">
          <div className="px-6 flex flex-col items-center">
            <div className="w-24 h-24 rounded-full bg-neutral-100 flex items-center justify-center mb-6 border-4 border-white shadow-md">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-neutral-400">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-neutral-900 mb-2">Welcome to Mandi Bazaar</h1>
            <p className="text-neutral-500 text-center max-w-xs">
              Sign in to manage your orders, wishlist, and profile details.
            </p>
          </div>
        </div>

        <div className="px-6 mt-12 max-w-md mx-auto">
          <button
            onClick={() => navigate('/login')}
            className="w-full py-4 rounded-2xl font-bold text-lg bg-teal-600 text-white hover:bg-teal-700 transition-all shadow-xl shadow-teal-500/20 active:scale-[0.98]"
          >
            Sign In / Register
          </button>

          <div className="mt-8 flex items-center gap-4 text-neutral-400">
            <div className="h-px flex-1 bg-neutral-200"></div>
            <span className="text-xs font-bold uppercase tracking-widest">Connect with us</span>
            <div className="h-px flex-1 bg-neutral-200"></div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="pb-24 bg-white min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-4">
            <div className="absolute inset-0 border-4 border-emerald-100 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-emerald-500 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <p className="text-sm font-medium text-neutral-500">Updating your profile...</p>
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="pb-24 md:pb-8 bg-white min-h-screen flex items-center justify-center">
        <div className="text-center px-4">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-red-500">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
              <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const displayName = profile?.name || user?.name || 'Valued Customer';
  const displayPhone = profile?.phone || user?.phone || '';
  const displayDateOfBirth = profile?.dateOfBirth;

  return (
    <div className="pb-24 bg-[#FAFAFA] min-h-screen">
      {/* Premium Header */}
      <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 px-6 pt-16 pb-16 rounded-b-[48px] shadow-xl relative overflow-hidden">
        {/* Subtle Background Pattern */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full -ml-32 -mb-32 blur-3xl"></div>

        <div className="max-w-4xl mx-auto relative flex flex-col items-center">
          <div className="relative group">
            <div className="absolute inset-0 bg-white/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative w-28 h-28 rounded-full bg-white border-4 border-white/30 shadow-2xl flex items-center justify-center overflow-hidden">
              <span className="text-4xl font-black text-emerald-600 uppercase">
                {displayName.charAt(0)}
              </span>
            </div>
            <button className="absolute bottom-1 right-1 w-8 h-8 bg-white rounded-full border-2 border-emerald-500 text-emerald-500 flex items-center justify-center shadow-lg transition-transform hover:scale-110 active:scale-90">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
            </button>
          </div>

          <div className="mt-6 text-center">
            <h1 className="text-2xl font-bold text-white tracking-tight drop-shadow-sm">{displayName}</h1>
            <div className="flex items-center justify-center gap-3 mt-2">
              <span className="text-sm font-medium text-emerald-50 flex items-center gap-1.5 opacity-90">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                {displayPhone}
              </span>
              {displayDateOfBirth && (
                <>
                  <div className="w-1 h-1 bg-white/30 rounded-full"></div>
                  <span className="text-sm font-medium text-emerald-50 flex items-center gap-1.5 opacity-90">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                    {formatDate(displayDateOfBirth)}
                  </span>
                </>
              )}
              <div className="w-1 h-1 bg-white/30 rounded-full"></div>
              <span className="px-2 py-0.5 bg-white/20 rounded-full text-[10px] font-bold text-white uppercase tracking-wider backdrop-blur-sm border border-white/20">
                Premium
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Sections */}
      <div className="px-6 mt-8 max-w-4xl mx-auto space-y-8">
        {/* Quick Actions Card */}
        <div className="flex items-center justify-between gap-3">
          <QuickAction
            icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>}
            label="Orders"
            onClick={() => navigate('/orders')}
          />
          <QuickAction
            icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>}
            label="Wishlist"
            onClick={() => navigate('/wishlist')}
          />
          <QuickAction
            icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>}
            label="Support"
            onClick={() => navigate('/faq')}
          />
        </div>

        {/* Account Details Group */}
        <div className="space-y-4">
          <SectionHeader title="Your Information" />
          <div className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-neutral-100 divide-y divide-neutral-50">
            <MenuLink
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>}
              label="Address Book"
              onClick={() => navigate('/address-book')}
            />
            <MenuLink
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>}
              label="Privacy Settings"
              onClick={() => { }}
            />
          </div>
        </div>

        {/* Business & Legal Group */}
        <div className="space-y-4">
          <SectionHeader title="Preferences" />
          <div className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-neutral-100 divide-y divide-neutral-50">
            <MenuLink
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>}
              label="GST Details"
              onClick={() => setShowGstModal(true)}
            />
            <MenuLink
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>}
              label="About Us"
              onClick={() => window.location.href = 'https://about.mandibazaar.com'}
            />
            <MenuLink
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>}
              label="Log Out"
              danger
              onClick={handleLogout}
            />
          </div>
        </div>

        {/* App Version Footer */}
        <div className="py-8 text-center">
          <p className="text-[10px] font-bold text-neutral-300 uppercase tracking-[0.2em]">Mandi Bazaar v2.4.1</p>
        </div>
      </div>

      {/* GST Modal Custom styling already in original code, refined for industry feel */}
      <AnimatePresence>
        {showGstModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-neutral-900/40 backdrop-blur-md"
              onClick={() => setShowGstModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-[40px] shadow-2xl p-8 pt-12 overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-teal-50 rounded-full -mr-16 -mt-16 opacity-50 blur-2xl"></div>

              <button
                onClick={() => setShowGstModal(false)}
                className="absolute top-6 right-6 w-10 h-10 rounded-full bg-neutral-50 flex items-center justify-center text-neutral-400 hover:text-neutral-900 transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>

              <div className="text-center relative">
                <div className="mx-auto mb-6 w-20 h-20 rounded-3xl bg-emerald-50 flex items-center justify-center text-emerald-500">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="5" y="3" width="14" height="18" rx="2" ry="2" /><line x1="9" y1="7" x2="15" y2="7" /><line x1="9" y1="11" x2="15" y2="11" /><line x1="9" y1="15" x2="13" y2="15" /></svg>
                </div>
                <h3 className="text-2xl font-bold text-neutral-900 mb-2">GST Details</h3>
                <p className="text-sm text-neutral-500 mb-8">
                  Add your GST number to get business invoices on your purchases.
                </p>
                <form onSubmit={handleGstSubmit} className="space-y-4">
                  <div className="relative">
                    <input
                      type="text"
                      value={gstNumber}
                      onChange={(e) => setGstNumber(e.target.value)}
                      placeholder="e.g. 07AAAAA0000A1Z5"
                      className="w-full bg-neutral-50 rounded-2xl border-none px-6 py-4 text-sm font-medium focus:ring-2 focus:ring-emerald-500/10 focus:bg-white transition-all placeholder:text-neutral-300"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!gstNumber.trim()}
                    className="w-full rounded-2xl bg-emerald-500 text-white font-bold py-4 hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20 active:scale-[0.98]"
                  >
                    Save Details
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

const QuickAction = ({ icon, label, onClick }: any) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center justify-center gap-3 flex-1 bg-white rounded-2xl py-5 shadow-sm border border-neutral-100 group active:scale-95 transition-all hover:shadow-md hover:border-emerald-100"
  >
    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300">
      {icon}
    </div>
    <span className="text-[11px] font-black text-neutral-800 uppercase tracking-wider">{label}</span>
  </button>
);

const SectionHeader = ({ title }: { title: string }) => (
  <h2 className="px-2 text-xs font-bold text-neutral-400 uppercase tracking-[0.15em]">{title}</h2>
);

const MenuLink = ({ icon, label, onClick, danger }: any) => (
  <button
    onClick={onClick}
    className="w-full flex items-center justify-between px-6 py-5 group hover:bg-neutral-50/50 transition-colors"
  >
    <div className="flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${danger ? 'bg-red-50 text-red-500 group-hover:bg-red-500 group-hover:text-white' : 'bg-neutral-50 text-neutral-400 group-hover:bg-neutral-900 group-hover:text-white'}`}>
        {icon}
      </div>
      <span className={`text-[15px] font-bold ${danger ? 'text-red-500' : 'text-neutral-800'}`}>{label}</span>
    </div>
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-200 group-hover:text-neutral-400 group-hover:translate-x-1 transition-all"><polyline points="9 18 15 12 9 6"></polyline></svg>
  </button>
);
