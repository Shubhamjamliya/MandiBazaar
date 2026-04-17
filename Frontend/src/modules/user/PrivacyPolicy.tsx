import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getPublicSettings } from '../../services/api/customerHomeService';
import ContentLoader from '../../components/loaders/ContentLoader';

export default function PrivacyPolicy() {
  const navigate = useNavigate();
  const location = useLocation();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await getPublicSettings();
        if (response.success) {
          setContent(response.data?.privacyPolicy || 'Privacy policy details...');
        }
      } catch (error) {
        console.error('Error fetching privacy policy:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleBack = () => {
    // If we have a state with referrer, use that. Otherwise use browser back
    if (location.state?.from) {
      navigate(location.state.from);
    } else {
      navigate(-1);
    }
  };

  if (loading) return <ContentLoader />;

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-20">
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-neutral-100">
        <div className="max-w-xl mx-auto px-4 h-16 flex items-center justify-between">
          <button
            onClick={handleBack}
            className="w-10 h-10 rounded-full bg-neutral-50 flex items-center justify-center text-neutral-600 hover:bg-neutral-100 transition-colors"
          >
            ←
          </button>
          <h1 className="text-lg font-black text-neutral-900 tracking-tight">Privacy Policy</h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-8">
        <div className="bg-emerald-600 rounded-[40px] p-8 text-white shadow-xl shadow-emerald-600/20 mb-8 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
          <h2 className="text-2xl font-black mb-2 tracking-tight">Your Privacy Matters</h2>
          <p className="text-emerald-50 text-sm font-medium opacity-80 leading-relaxed">
            This page explains how we collect, use, and protect your information.
          </p>
        </div>

        <div className="bg-white rounded-[32px] border border-neutral-100 shadow-sm p-6 md:p-8">
          <div
            className="policy-content whitespace-pre-wrap text-neutral-700 leading-relaxed text-sm font-medium"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>
      </div>
    </div>
  );
}
