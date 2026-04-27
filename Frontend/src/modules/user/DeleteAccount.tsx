import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { requestDeleteAccountOTP, confirmDeleteAccount } from '../../services/api/customerService';
import { motion, AnimatePresence } from 'framer-motion';

export default function DeleteAccount() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [phone, setPhone] = useState(user?.phone || '');
  const [captcha, setCaptcha] = useState('');
  const [userInputCaptcha, setUserInputCaptcha] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Generate random captcha on mount
  useEffect(() => {
    generateNewCaptcha();
  }, []);

  const generateNewCaptcha = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid ambiguous chars
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptcha(result);
  };

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (userInputCaptcha !== captcha) {
      setError('Invalid captcha code. Please try again.');
      generateNewCaptcha();
      return;
    }

    if (!phone || phone.length !== 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);
    try {
      const response = await requestDeleteAccountOTP(phone);
      if (response.success) {
        setOtpSent(true);
      } else {
        setError(response.message);
      }
    } catch (err: any) {
      setError('Failed to send OTP. Please ensure the phone number matches your account.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDeletion = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!otp || otp.length !== 4) {
      setError('Please enter a valid 4-digit OTP.');
      return;
    }

    if (!window.confirm('WARNING: This action is permanent. All your orders, addresses, and account data will be deleted forever. Do you want to proceed?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await confirmDeleteAccount(phone, otp);
      if (response.success) {
        setSuccess(true);
        setTimeout(() => {
          logout();
          navigate('/');
        }, 3000);
      } else {
        setError(response.message);
      }
    } catch (err: any) {
      setError('Deletion failed. Please check the OTP or try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 pb-20 pt-10 px-6">
      <div className="max-w-md mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[40px] shadow-2xl overflow-hidden border border-red-100"
        >
          <div className="bg-red-500 p-8 text-white text-center relative overflow-hidden">
             {/* Background Decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
            
            <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18"></path>
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
              </svg>
            </div>
            <h1 className="text-2xl font-bold">Delete Account</h1>
            <p className="text-red-100 text-sm mt-2">Permanently remove your account and all data</p>
          </div>

          <div className="p-8">
            <AnimatePresence mode="wait">
              {success ? (
                <motion.div 
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-10"
                >
                  <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-neutral-900 mb-2">Account Deleted</h2>
                  <p className="text-neutral-500">Your account has been deleted successfully. You will be redirected shortly.</p>
                </motion.div>
              ) : (
                <motion.div key="form">
                  {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm flex gap-3 items-center">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                      {error}
                    </div>
                  )}

                  <form onSubmit={otpSent ? handleConfirmDeletion : handleRequestOTP} className="space-y-6">
                    {!otpSent ? (
                      <>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider ml-1">Mobile Number</label>
                          <div className="relative">
                            <span className="absolute left-6 top-1/2 -translate-y-1/2 text-neutral-400 font-bold">+91</span>
                            <input
                              type="tel"
                              value={phone}
                              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                              placeholder="Enter registered mobile"
                              className="w-full bg-neutral-50 rounded-2xl border-none pl-16 pr-6 py-4 text-sm font-medium focus:ring-2 focus:ring-red-500/10 focus:bg-white transition-all"
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider ml-1">Verify you are human</label>
                          <div className="flex items-center gap-4 mb-2">
                            <div className="bg-neutral-900 text-white font-mono text-xl tracking-widest px-6 py-3 rounded-2xl flex-1 text-center select-none shadow-inner italic border-4 border-neutral-800">
                              {captcha}
                            </div>
                            <button 
                              type="button" 
                              onClick={generateNewCaptcha}
                              className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-500 hover:bg-neutral-200 transition-colors"
                            >
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                            </button>
                          </div>
                          <input
                            type="text"
                            value={userInputCaptcha}
                            onChange={(e) => setUserInputCaptcha(e.target.value.toUpperCase())}
                            placeholder="Type the characters above"
                            className="w-full bg-neutral-50 rounded-2xl border-none px-6 py-4 text-sm font-medium focus:ring-2 focus:ring-red-500/10 focus:bg-white transition-all uppercase"
                            required
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full bg-neutral-900 text-white font-bold py-4 rounded-2xl hover:bg-black transition-all shadow-xl shadow-neutral-900/10 flex items-center justify-center gap-2"
                        >
                          {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          ) : 'Receive OTP to Delete'}
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="text-center mb-6">
                          <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-2">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                          </div>
                          <p className="text-sm text-neutral-600">Enter the 4-digit OTP sent to <b>+91 {phone}</b></p>
                          <button 
                            type="button" 
                            onClick={() => setOtpSent(false)} 
                            className="text-xs text-red-500 font-bold uppercase mt-2 border-b-2 border-red-500/20"
                          >
                            Change Number
                          </button>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider ml-1">OTP Verification</label>
                          <input
                            type="text"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                            placeholder="Enter 4-digit OTP"
                            className="w-full bg-neutral-50 rounded-2xl border-none px-6 py-4 text-center text-2xl font-black tracking-[0.5em] focus:ring-2 focus:ring-red-500/10 focus:bg-white transition-all placeholder:tracking-normal placeholder:text-sm placeholder:font-medium"
                            required
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full bg-red-600 text-white font-bold py-4 rounded-2xl hover:bg-red-700 transition-all shadow-xl shadow-red-500/20 flex items-center justify-center gap-2"
                        >
                          {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          ) : 'Permanently Delete My Data'}
                        </button>
                      </>
                    )}
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        <button 
          onClick={() => navigate('/account')}
          className="w-full mt-8 py-4 text-neutral-400 font-bold text-sm hover:text-neutral-900 transition-colors"
        >
          Nevermind, keep my account
        </button>
      </div>
    </div>
  );
}
