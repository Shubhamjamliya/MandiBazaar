import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendOTP, verifyOTP } from '../../../services/api/auth/deliveryAuthService';
import OTPInput from '../../../components/OTPInput';
import { useAuth } from '../../../context/AuthContext';
import { removeAuthToken } from '../../../services/api/config';

export default function DeliveryLogin() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [mobileNumber, setMobileNumber] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [showOTP, setShowOTP] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isNotRegistered, setIsNotRegistered] = useState(false);

  // Clear any existing token on mount to prevent role conflicts
  useEffect(() => {
    removeAuthToken();
  }, []);

  const handleMobileLogin = async () => {
    if (mobileNumber.length !== 10) return;

    setLoading(true);
    setError('');
    setIsNotRegistered(false);

    try {
      const response = await sendOTP(mobileNumber);
      if (response.success && response.sessionId) {
        setSessionId(response.sessionId);
        setShowOTP(true);
      } else {
        setError(response.message || 'Failed to initiate OTP');
      }
    } catch (err: any) {
      const status = err.response?.status;
      const message = err.response?.data?.message || 'Failed to send OTP. Please try again.';

      setError(message);

      // Check for 400 Bad Request specific to user not found (or based on message content)
      if (status === 400 && (message.toLowerCase().includes('not found') || message.toLowerCase().includes('register'))) {
        setIsNotRegistered(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOTPComplete = async (otp: string) => {
    setLoading(true);
    setError('');

    try {
      const response = await verifyOTP(mobileNumber, otp, sessionId);
      if (response.success && response.data) {
        // Update auth context
        login(response.data.token, {
          ...response.data.user,
          userType: 'Delivery'
        });
        navigate('/delivery');
      }
    } catch (err: any) {
      // Also handle 401 Unauthorized for verify step
      const message = err.response?.data?.message || 'Invalid OTP. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-green-100 flex flex-col items-center justify-center px-4 py-8 relative overflow-hidden">
      {/* Animated Background Orbs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-green-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
      <div className="absolute bottom-20 right-10 w-72 h-72 bg-emerald-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
      
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="absolute top-6 left-6 z-10 w-11 h-11 rounded-full bg-white shadow-lg flex items-center justify-center hover:bg-gray-50 transition-all active:scale-95"
        aria-label="Back"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Login Card */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden relative z-10">
        {/* Header Section */}
        <div className="relative pt-10 pb-8 px-6 text-center bg-gradient-to-br from-green-500 to-emerald-600 overflow-hidden">
          {/* Decorative Elements */}
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-white/20 rounded-full"></div>

          <div className="relative z-10 flex flex-col items-center">
            {/* Logo */}
            <div className="w-24 h-24 bg-white rounded-3xl shadow-2xl p-2 flex items-center justify-center mb-4 transform hover:scale-105 transition-transform duration-300">
              <img
                src="/assets/logo/logo.png"
                alt="Mandi Bazaar"
                className="w-full h-full object-contain"
              />
            </div>

            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
              Delivery Partner
            </h1>
            
            {/* 24/7 Badge */}
            <div className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full border border-white/30">
              <div className="relative">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                <div className="absolute inset-0 w-2 h-2 bg-white rounded-full animate-ping"></div>
              </div>
              <span className="text-sm font-semibold text-white">24/7 Support Available</span>
            </div>
          </div>
        </div>

        {/* Login Form */}
        <div className="p-8 space-y-5">
          {!showOTP ? (
            /* Mobile Login Form */
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Mobile Number
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22 16.92V19.92C22 20.4696 21.5523 20.9167 21.0025 20.9199C18.0845 20.9705 15.2173 20.0561 12.7847 18.2916C10.5506 16.6897 8.78119 14.4649 7.67144 11.8634C5.9658 9.2433 5.08395 6.17269 5.13 3.04691C5.13509 2.49666 5.58434 2.04999 6.13 2.04999H9.13C9.40316 2.04999 9.63087 2.25154 9.66 2.52329C9.71572 3.06579 9.82306 3.60179 9.98 4.12329C10.0557 4.36579 9.97644 4.62829 9.78 4.79329L8.23 6.04329C9.38 8.52329 11.48 10.6233 14 11.7733L15.25 10.2233C15.4149 10.0268 15.6774 9.94754 15.92 10.0233C16.4415 10.1802 16.9775 10.2876 17.52 10.3433C17.7927 10.3724 17.9943 10.6019 17.9943 10.8758V13.8758C18 14.4233 17.55 14.8733 17 14.8733Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <input
                    type="tel"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="Enter 10-digit mobile number"
                    className="w-full pl-12 pr-4 py-3.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all"
                    maxLength={10}
                    disabled={loading}
                  />
                </div>
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-xl border border-red-200 flex flex-col gap-2">
                  <span>{error}</span>
                  {isNotRegistered && (
                    <button
                      onClick={() => navigate('/delivery/signup')}
                      className="text-xs font-bold text-white bg-red-500 hover:bg-red-600 py-2 px-4 rounded-lg self-start transition-all active:scale-95"
                    >
                      Register Now
                    </button>
                  )}
                </div>
              )}

              <button
                onClick={handleMobileLogin}
                disabled={mobileNumber.length !== 10 || loading}
                className={`w-full py-4 rounded-xl font-bold text-sm transition-all shadow-lg ${mobileNumber.length === 10 && !loading
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-xl active:scale-95'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Sending OTP...</span>
                  </div>
                ) : (
                  'Continue'
                )}
              </button>
              
              {/* Feature Badges */}
              <div className="flex items-center justify-center gap-4 pt-2">
                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                  <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="#10b981" strokeWidth="2"/>
                      <path d="M12 5V3M12 21V19M5 12H3M21 12H19" stroke="#10b981" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <span className="font-medium">Secure Login</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                  <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M13 10V3L4 14H11L11 21L20 10L13 10Z" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <span className="font-medium">Quick Access</span>
                </div>
              </div>
            </div>
          ) : (
            /* OTP Verification Form */
            <div className="space-y-5">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 8L10.89 13.26C11.2187 13.4793 11.6049 13.5963 12 13.5963C12.3951 13.5963 12.7813 13.4793 13.11 13.26L21 8M5 19H19C19.5304 19 20.0391 18.7893 20.4142 18.4142C20.7893 18.0391 21 17.5304 21 17V7C21 6.46957 20.7893 5.96086 20.4142 5.58579C20.0391 5.21071 19.5304 5 19 5H5C4.46957 5 3.96086 5.21071 3.58579 5.58579C3.21071 5.96086 3 6.46957 3 7V17C3 17.5304 3.21071 18.0391 3.58579 18.4142C3.96086 18.7893 4.46957 19 5 19Z" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p className="text-sm text-gray-600 mb-1">
                  Enter the 4-digit OTP sent to
                </p>
                <p className="text-base font-bold text-gray-800">+91 {mobileNumber}</p>
              </div>

              <OTPInput onComplete={handleOTPComplete} disabled={loading} />

              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-xl text-center border border-red-200">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowOTP(false);
                    setError('');
                  }}
                  disabled={loading}
                  className="flex-1 py-3.5 rounded-xl font-bold text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all border-2 border-gray-200 active:scale-95"
                >
                  Change Number
                </button>
                <button
                  onClick={handleMobileLogin}
                  disabled={loading}
                  className="flex-1 py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-lg transition-all active:scale-95"
                >
                  {loading ? 'Sending...' : 'Resend OTP'}
                </button>
              </div>
            </div>
          )}

          {/* Sign Up Link */}
          <div className="text-center pt-4 border-t-2 border-gray-100">
            <p className="text-sm text-gray-600">
              Don't have a delivery partner account?{' '}
              <button
                onClick={() => navigate('/delivery/signup')}
                className="text-green-600 hover:text-green-700 font-bold"
              >
                Sign Up
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Footer Text */}
      <p className="mt-8 text-xs text-gray-500 text-center max-w-md px-4">
        By continuing, you agree to Mandi Bazaar's Terms of Service and Privacy Policy
      </p>
    </div>
  );
}

