import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendOTP, verifyOTP } from '../../../services/api/auth/adminAuthService';
import OTPInput from '../../../components/OTPInput';
import { useAuth } from '../../../context/AuthContext';

export default function AdminLogin() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const RESEND_OTP_COOLDOWN_SECONDS = 30;
  const [mobileNumber, setMobileNumber] = useState('');
  const [showOTP, setShowOTP] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (!showOTP || resendCooldown <= 0) return;

    const timer = window.setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [showOTP, resendCooldown]);

  const handleMobileLogin = async () => {
    if (mobileNumber.length !== 10) return;

    setLoading(true);
    setError("");

    try {
      await sendOTP(mobileNumber);
      setShowOTP(true);
      setResendCooldown(RESEND_OTP_COOLDOWN_SECONDS);
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to send OTP. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOTPComplete = async (otp: string) => {
    setLoading(true);
    setError("");

    try {
      const response = await verifyOTP(mobileNumber, otp);
      if (response.success && response.data) {
        // Update AuthContext with token and user data
        login(response.data.token, {
          ...response.data.user,
          userType: "Admin",
        });
        navigate("/admin");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Invalid OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlemandibazaarLogin = () => {
    // Handle Mandi Bazaar login logic here
    navigate("/admin");
  };

  const handleSellerLogin = () => {
    // Navigate to seller login page
    navigate("/seller/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-green-50 flex flex-col items-center justify-center px-4 py-8">
      <button
        onClick={() => navigate('/help-support')}
        className="absolute top-4 right-4 z-10 px-3.5 h-10 rounded-full bg-white shadow-md flex items-center justify-center gap-1.5 hover:bg-neutral-50 transition-colors text-xs font-bold text-emerald-700"
        aria-label="Support">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 17H12.01M8 9a4 4 0 118 0c0 2-2 3-2 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
        </svg>
        Support
      </button>

      {/* Login Card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header Section */}
        <div className="relative pt-8 pb-6 px-6 text-center bg-gradient-to-br from-green-500 to-green-600 overflow-hidden">
          {/* Decorative Circles */}
          <div className="absolute -top-10 -left-10 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="absolute top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col items-center">
            <div className="w-28 h-28 bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-2 flex items-center justify-center mb-4 border border-green-400/30 transform hover:scale-105 transition-transform duration-300">
              <img
                src="/assets/logo/logo.png"
                alt="Mandi Bazaar"
                className="w-full h-full object-contain"
              />
            </div>

            <h1 className="text-2xl font-bold text-white mb-1 tracking-tight drop-shadow-sm">
              Admin Login
            </h1>
            <p className="text-green-50 text-sm font-medium bg-green-700/30 px-3 py-1 rounded-full border border-green-400/20">
              Access your dashboard
            </p>
          </div>
        </div>

        {/* Login Form */}
        <div className="p-6 space-y-4">
          {!showOTP ? (
            /* Mobile Login Form */
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Mobile Number
                </label>
                <div className="flex items-center bg-white border border-neutral-300 rounded-lg overflow-hidden focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-200 transition-all">
                  <div className="px-3 py-2.5 text-sm font-medium text-neutral-600 border-r border-neutral-300 bg-neutral-50">
                    +91
                  </div>
                  <input
                    type="tel"
                    value={mobileNumber}
                    onChange={(e) =>
                      setMobileNumber(
                        e.target.value.replace(/\D/g, "").slice(0, 10)
                      )
                    }
                    placeholder="Enter mobile number"
                    className="flex-1 px-3 py-2.5 text-sm placeholder:text-neutral-400 focus:outline-none"
                    maxLength={10}
                    disabled={loading}
                  />
                </div>
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                  {error}
                </div>
              )}

              <button
                onClick={handleMobileLogin}
                disabled={mobileNumber.length !== 10 || loading}
                className={`w-full py-2.5 rounded-lg font-semibold text-sm transition-colors ${mobileNumber.length === 10 && !loading
                  ? "bg-teal-600 text-white hover:bg-teal-700 shadow-md"
                  : "bg-neutral-300 text-neutral-500 cursor-not-allowed"
                  }`}>
                {loading ? "Sending..." : "Continue"}
              </button>
            </div>
          ) : (
            /* OTP Verification Form */
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-neutral-600 mb-2">
                  Enter the 4-digit OTP sent to
                </p>
                <p className="text-sm font-semibold text-neutral-800">
                  +91 {mobileNumber}
                </p>
              </div>

              <OTPInput onComplete={handleOTPComplete} disabled={loading} />

              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-2 rounded text-center">
                  {error}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowOTP(false);
                    setError("");
                  }}
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-lg font-semibold text-sm bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition-colors border border-neutral-300">
                  Change Number
                </button>
                <button
                  onClick={async () => {
                    if (resendCooldown > 0) return;
                    await handleMobileLogin();
                  }}
                  disabled={loading || resendCooldown > 0}
                  className="flex-1 py-2.5 rounded-lg font-semibold text-sm bg-teal-600 text-white hover:bg-teal-700 transition-colors">
                  {loading ? "Sending..." : resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : "Resend OTP"}
                </button>
              </div>
            </div>
          )}

          {/* Privacy & Terms Agreement */}
          <div className="w-full px-6 py-2 text-center animate-fade-in" style={{ animationDelay: '0.9s' }}>
            <p className="text-[10px] text-neutral-500 leading-relaxed font-medium">
              By continuing, you agree to our{' '}
              <button
                onClick={() => navigate('/privacy-policy')}
                className="text-emerald-600 font-bold hover:underline"
              >
                Privacy Policy
              </button>
              {' '}and{' '}
              <button 
                onClick={() => navigate('/terms-of-service')}
                className="text-emerald-600 font-bold hover:underline"
              >
                Terms of Service
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Footer Text */}
      <p className="mt-6 text-xs text-neutral-500 text-center max-w-md">
        By continuing, you agree to Mandi Bazaar's{' '}
        <button
          type="button"
          onClick={() => navigate('/terms-of-service')}
          className="text-teal-600 hover:text-teal-700 font-semibold"
        >
          Terms of Service
        </button>
        {' '}and{' '}
        <button
          type="button"
          onClick={() => navigate('/privacy-policy')}
          className="text-teal-600 hover:text-teal-700 font-semibold"
        >
          Privacy Policy
        </button>
      </p>
    </div>
  );
}

