import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getPublicSettings } from '../../services/api/customerHomeService';
import ContentLoader from '../../components/loaders/ContentLoader';

export default function PrivacyPolicy() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeAccordion, setActiveAccordion] = useState<number | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await getPublicSettings();
        if (response.success) {
          setSettings(response.data);
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  // Professional policies usually have sections. 
  // If the policy is a long text, we'll display it elegantly.
  // We'll also provide quick links to other policies.

  const policies = [
    { title: 'Privacy Policy', content: settings?.privacyPolicy || 'Privacy policy details...', icon: '🔒' },
    { title: 'Terms & Conditions', content: settings?.customerAppPolicy || 'Terms and conditions...', icon: '📄' },
    { title: 'Shipping & Delivery', content: 'We aim to deliver within 20 minutes...', icon: '🚚' },
    { title: 'Refund & Returns', content: 'Easy returns and refunds within 7 days...', icon: '🔄' },
  ];

  if (loading) return <ContentLoader />;

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-20">
      {/* Premium Header */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-neutral-100">
        <div className="max-w-xl mx-auto px-4 h-16 flex items-center justify-between">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-neutral-50 flex items-center justify-center text-neutral-600 hover:bg-neutral-100 transition-colors"
          >
            ←
          </button>
          <h1 className="text-lg font-black text-neutral-900 tracking-tight">Legal & Policies</h1>
          <div className="w-10" /> {/* Spacer */}
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-8">
        {/* Banner Card */}
        <div className="bg-emerald-600 rounded-[40px] p-8 text-white shadow-xl shadow-emerald-600/20 mb-10 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
          <h2 className="text-2xl font-black mb-2 tracking-tight">Professional Standards</h2>
          <p className="text-emerald-50 text-sm font-medium opacity-80 leading-relaxed">
            Your trust is our top priority. We maintain transparency in how we handle your data and service.
          </p>
        </div>

        {/* List of Policies */}
        <div className="space-y-4">
          {policies.map((policy, index) => (
            <motion.div
              layout
              key={index}
              className={`bg-white rounded-[32px] border transition-all duration-300 ${
                activeAccordion === index ? 'border-emerald-500 shadow-xl shadow-emerald-500/5' : 'border-neutral-100 shadow-sm'
              }`}
            >
              <button
                onClick={() => setActiveAccordion(activeAccordion === index ? null : index)}
                className="w-full px-6 py-6 flex items-center justify-between group"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl transition-colors ${
                    activeAccordion === index ? 'bg-emerald-500 text-white' : 'bg-neutral-50 text-neutral-400 group-hover:bg-neutral-100'
                  }`}>
                    {policy.icon}
                  </div>
                  <div className="text-left">
                    <h3 className={`font-bold text-base ${activeAccordion === index ? 'text-emerald-600' : 'text-slate-900 font-extrabold'}`}>
                      {policy.title}
                    </h3>
                    <p className="text-xs text-neutral-400 mt-0.5">Last updated: Mar 2026</p>
                  </div>
                </div>
                <div className={`transition-transform duration-300 ${activeAccordion === index ? 'rotate-180 text-emerald-500' : 'text-neutral-300'}`}>
                   ▼
                </div>
              </button>

              <AnimatePresence>
                {activeAccordion === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-8 border-t border-neutral-50 pt-6">
                      <div className="prose prose-sm max-w-none">
                        <div 
                          className="policy-content whitespace-pre-wrap text-neutral-600 leading-relaxed text-sm font-medium"
                          dangerouslySetInnerHTML={{ __html: policy.content }}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>

        {/* Support Section */}
        <div className="mt-12 bg-slate-900 rounded-[32px] p-8 text-white flex items-center justify-between group cursor-pointer hover:bg-slate-800 transition-colors">
            <div>
                <h4 className="font-bold text-lg">Need help?</h4>
                <p className="text-slate-400 text-sm">Our support is available 24/7</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                💬
            </div>
        </div>
      </div>
    </div>
  );
}
