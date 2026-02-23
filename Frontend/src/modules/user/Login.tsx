import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendOTP, verifyOTP } from '../../services/api/auth/customerAuthService';
import { useAuth } from '../../context/AuthContext';
import OTPInput from '../../components/OTPInput';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [mobileNumber, setMobileNumber] = useState('');
  const [showOTP, setShowOTP] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleContinue = async () => {
    if (mobileNumber.length !== 10) return;

    setLoading(true);
    setError('');

    try {
      const response = await sendOTP(mobileNumber);
      if (response.sessionId) {
        setSessionId(response.sessionId);
      }
      setShowOTP(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to initiate call. Please try again.');
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
        // Update auth context with user data
        login(response.data.token, {
          id: response.data.user.id,
          name: response.data.user.name,
          phone: response.data.user.phone,
          email: response.data.user.email,
          walletAmount: response.data.user.walletAmount,
          refCode: response.data.user.refCode,
          status: response.data.user.status,
        });
        navigate('/');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };



  return (
    <>
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes float {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(10px, -10px); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-10px, 10px); }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
        @keyframes progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(0); }
        }
        @keyframes fade-slide-up {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
        }
        .animate-slide-up {
          animation: slide-up 0.6s ease-out forwards;
          opacity: 0;
        }
        .animate-slide-down {
          animation: slide-down 0.6s ease-out forwards;
          opacity: 0;
        }
        .animate-scale-in {
          animation: scale-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          opacity: 0;
        }
        .animate-bounce-slow {
          animation: bounce-slow 3s ease-in-out infinite;
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float-delayed 6s ease-in-out infinite;
        }
        .animate-pulse-slow {
          animation: pulse-slow 2s ease-in-out infinite;
        }
        .animate-progress {
          animation: progress 2s ease-in-out infinite;
        }
        .animate-fade-slide-up {
          animation: fade-slide-up 0.6s ease-out forwards;
          opacity: 0;
        }
      `}</style>
      <div className="h-screen bg-white flex flex-col" style={{ overflow: 'hidden', backgroundColor: '#ffffff', width: '100%', margin: 0, padding: 0, boxSizing: 'border-box' }}>
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="absolute top-2 left-2 sm:top-4 sm:left-4 z-10 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-neutral-50 transition-colors"
        aria-label="Back"
      >
        <svg width="18" height="18" className="sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Background Section */}
      <div
        className="overflow-hidden relative flex-1 bg-gradient-to-br from-green-50 via-emerald-50 to-green-100"
        style={{ minHeight: 0, padding: 0, margin: 0, zIndex: 0, width: '100%', position: 'relative' }}
      >
        {/* Animated Gradient Orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 -left-10 w-40 h-40 bg-gradient-to-br from-green-300/40 to-emerald-400/40 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute top-40 -right-10 w-48 h-48 bg-gradient-to-br from-emerald-300/40 to-green-400/40 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute bottom-20 left-1/4 w-36 h-36 bg-gradient-to-br from-green-400/30 to-emerald-300/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>

        {/* Content Container */}
        <div className="relative z-10 flex flex-col items-center justify-start h-full py-4 gap-4">
          {/* Top Section - Logo and Welcome */}
          <div className="text-center px-6 animate-fade-in">
            {/* Logo */}
            <div className="flex justify-center mb-2">
              <div className="w-16 h-16 bg-white rounded-3xl shadow-xl flex items-center justify-center border-2 border-green-300 animate-bounce-slow">
                <img 
                  src="/assets/logo/logo.png" 
                  alt="Mandi Bazaar" 
                  className="w-12 h-12 object-contain"
                />
              </div>
            </div>
            
            {/* Available Badge */}
            <div className="inline-block mb-2 animate-slide-down">
              <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-md border border-green-200">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
                <span className="text-xs font-bold text-green-700">Available 24/7</span>
              </div>
            </div>
            
            {/* Welcome Text */}
            <h1 className="text-xl font-bold text-gray-800 mb-1 animate-slide-up">Welcome to</h1>
            <h2 className="text-3xl font-extrabold bg-gradient-to-r from-green-600 via-emerald-600 to-green-700 bg-clip-text text-transparent mb-2 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              Mandi Bazaar
            </h2>
            <p className="text-xs text-gray-700 max-w-xs mx-auto leading-relaxed font-medium animate-slide-up" style={{ animationDelay: '0.2s' }}>
              Fresh groceries delivered in 10-15 minutes
            </p>
          </div>

          {/* Professional Animated Section */}
          <div className="w-full px-6 pb-4">
            <div className="relative">
              {/* Main Feature Card with Gradient */}
              <div className="relative bg-gradient-to-br from-green-500 via-emerald-500 to-green-600 rounded-3xl p-4 shadow-2xl overflow-hidden animate-scale-in" style={{ animationDelay: '0.3s' }}>
                {/* Animated Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white rounded-full blur-3xl animate-float"></div>
                  <div className="absolute bottom-0 left-0 w-32 h-32 bg-white rounded-full blur-3xl animate-float-delayed"></div>
                </div>
                
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-white/80 text-[10px] font-semibold mb-0.5 tracking-wide uppercase">Delivery Time</div>
                      <div className="text-white text-2xl font-black mb-0.5">10-15 min</div>
                      <div className="text-white/90 text-xs font-medium">To your doorstep</div>
                    </div>
                    <div className="relative">
                      <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 animate-pulse-slow">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-white">
                          <path d="M13 16V6L19 12L13 16Z" fill="currentColor"/>
                          <path d="M5 16V6L11 12L5 16Z" fill="currentColor"/>
                        </svg>
                      </div>
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-ping"></div>
                    </div>
                  </div>
                  
                  {/* Animated Progress Indicator */}
                  <div className="flex items-center gap-2 mt-3">
                    <div className="flex-1 h-1.5 bg-white/30 rounded-full overflow-hidden">
                      <div className="h-full bg-white rounded-full animate-progress" style={{ width: '70%' }}></div>
                    </div>
                    <span className="text-white/90 text-xs font-bold">Fast</span>
                  </div>
                </div>
              </div>
              
              {/* Feature Highlights with Icons */}
              <div className="flex items-center justify-between mt-4 px-2">
                <div className="flex items-center gap-2 animate-fade-slide-up" style={{ animationDelay: '0.5s' }}>
                  <div className="w-8 h-8 bg-green-100 rounded-xl flex items-center justify-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-green-600">
                      <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-800">Fresh Quality</div>
                    <div className="text-[9px] text-gray-500">100% Guaranteed</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 animate-fade-slide-up" style={{ animationDelay: '0.6s' }}>
                  <div className="w-8 h-8 bg-green-100 rounded-xl flex items-center justify-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-green-600">
                      <path d="M12 8V12L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-800">24/7 Service</div>
                    <div className="text-[9px] text-gray-500">Always Available</div>
                  </div>
                </div>
              </div>
              
              {/* Additional Features */}
              <div className="flex items-center justify-between mt-6 px-2">
                <div className="flex items-center gap-2 animate-fade-slide-up" style={{ animationDelay: '0.7s' }}>
                  <div className="w-8 h-8 bg-green-100 rounded-xl flex items-center justify-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-green-600">
                      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="currentColor"/>
                    </svg>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-800">Best Prices</div>
                    <div className="text-[9px] text-gray-500">Lowest in Market</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 animate-fade-slide-up" style={{ animationDelay: '0.8s' }}>
                  <div className="w-8 h-8 bg-green-100 rounded-xl flex items-center justify-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-green-600">
                      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2"/>
                      <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-800">Safe Payment</div>
                    <div className="text-[9px] text-gray-500">100% Secure</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>



      {/* Login Section */}
      <div
        className="bg-white flex flex-col items-center flex-shrink-0 relative"
        style={{ marginTop: '-40px', backgroundColor: '#ffffff', zIndex: 1, padding: '4px 0px 12px', paddingTop: '6px', width: '100%', borderTopLeftRadius: '20px', borderTopRightRadius: '20px' }}
      >
        {!showOTP ? (
          <>
            {/* Mobile Number Input */}
            <div className="w-full mb-4 px-5 relative z-10">
              <label className="block text-xs font-semibold text-neutral-500 mb-1.5 ml-1">
                Enter Mobile Number
              </label>
              <div className="flex items-center bg-white border border-neutral-200 rounded-xl overflow-hidden focus-within:border-orange-500 focus-within:ring-4 focus-within:ring-orange-500/10 transition-all shadow-sm h-12">
                <div className="pl-3.5 pr-3 h-full flex items-center justify-center bg-neutral-50 border-r border-neutral-100">
                  <span className="text-sm font-bold text-neutral-700">+91</span>
                </div>
                <input
                  type="tel"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="98765 43210"
                  className="flex-1 px-4 h-full text-base font-medium text-neutral-900 placeholder:text-neutral-400 focus:outline-none bg-transparent"
                  maxLength={10}
                  disabled={loading}
                />
              </div>
            </div>

            {error && (
              <div className="w-full mb-1 px-4 relative z-10 text-xs text-red-600 bg-red-50 p-2 rounded">
                {error}
              </div>
            )}

            {/* Continue Button */}
            <div className="w-full mb-1 px-4 relative z-10" style={{ maxWidth: '100%' }}>
              <button
                onClick={handleContinue}
                disabled={mobileNumber.length !== 10 || loading}
                className={`w-full py-2 sm:py-2.5 rounded-lg font-semibold text-sm transition-colors border px-3 ${mobileNumber.length === 10 && !loading
                  ? 'bg-orange-50 text-orange-600 border-orange-500 hover:bg-orange-100'
                  : 'bg-neutral-300 text-neutral-500 cursor-not-allowed border-neutral-300'
                  }`}
              >
                {loading ? 'Calling...' : 'Continue'}
              </button>
            </div>


          </>
        ) : (
          <>
            {/* OTP Verification */}
            <div className="w-full mb-2 px-4 relative z-10 text-center">
              <p className="text-xs text-neutral-600 mb-2">
                Enter the 4-digit OTP sent via voice call to
              </p>
              <p className="text-xs font-semibold text-neutral-800">+91 {mobileNumber}</p>
            </div>
            <div className="w-full mb-2 px-4 relative z-10 flex justify-center">
              <OTPInput onComplete={handleOTPComplete} disabled={loading} />
            </div>
            {error && (
              <div className="w-full mb-1 px-4 relative z-10 text-xs text-red-600 bg-red-50 p-2 rounded text-center">
                {error}
              </div>
            )}
            <div className="w-full mb-1 px-4 relative z-10 flex gap-2">
              <button
                onClick={() => {
                  setShowOTP(false);
                  setError('');
                }}
                disabled={loading}
                className="flex-1 py-2 rounded-lg font-semibold text-xs bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition-colors border border-neutral-300"
              >
                Change Number
              </button>
              <button
                onClick={handleContinue}
                disabled={loading}
                className="flex-1 py-2 rounded-lg font-semibold text-xs bg-orange-50 text-orange-600 border border-orange-500 hover:bg-orange-100 transition-colors"
              >
                {loading ? 'Verifying...' : 'Resend OTP'}
              </button>
            </div>
          </>
        )}



        {/* Privacy Text */}
        <p className="text-[9px] sm:text-[10px] text-neutral-500 text-center max-w-sm leading-tight px-4 relative z-10 pb-1">
          Access your saved addresses from Mandi Bazaar automatically!
        </p>
      </div>
    </div>
    </>
  );
}


