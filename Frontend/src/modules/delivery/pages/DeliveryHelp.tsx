import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DeliveryBottomNav from '../components/DeliveryBottomNav';
import { getHelpSupport } from '../../../services/api/delivery/deliveryService';

const DEFAULT_SUPPORT_PHONE = '8279281172';
const DEFAULT_SUPPORT_EMAIL = 'mandibazaar67@gmail.com';

// Icon mapping helper
const getIcon = (iconName: string) => {
  // You can use the same SVG logic or import shared icons
  if (iconName === 'phone') return '📞'; // Simplified for brevity in this example, or use SVG
  if (iconName === 'email') return '✉️';
  if (iconName === 'chat') return '💬';
  return 'ℹ️';
};

export default function DeliveryHelp() {
  const navigate = useNavigate();
  const [faqs, setFaqs] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([
    { label: 'Call support', value: DEFAULT_SUPPORT_PHONE, icon: 'phone' },
    { label: 'Email support', value: DEFAULT_SUPPORT_EMAIL, icon: 'email' },
    { label: 'Live chat support', value: DEFAULT_SUPPORT_PHONE, icon: 'chat' },
  ]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHelp = async () => {
      try {
        const data = await getHelpSupport();
        setFaqs(data.faqs || []);
        if (Array.isArray(data.contact) && data.contact.length > 0) {
          const patchedContacts = data.contact.map((item: any) => {
            const label = String(item?.label || '').toLowerCase();
            const icon = String(item?.icon || '').toLowerCase();

            if (label.includes('phone') || label.includes('call') || icon.includes('phone')) {
              return { ...item, value: DEFAULT_SUPPORT_PHONE };
            }

            if (label.includes('email') || icon.includes('email')) {
              return { ...item, value: DEFAULT_SUPPORT_EMAIL };
            }

            if (label.includes('chat') || icon.includes('chat')) {
              return { ...item, value: DEFAULT_SUPPORT_PHONE };
            }

            return item;
          });
          setContacts(patchedContacts);
        }
      } catch (error) {
        console.error("Failed to load help data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchHelp();
  }, []);

  const handleContactClick = (option: any) => {
    const value = String(option?.value || '').trim();
    const icon = String(option?.icon || '').toLowerCase();
    const label = String(option?.label || '').toLowerCase();

    const isPhone = icon.includes('phone') || label.includes('call') || label.includes('phone');
    const isEmail = icon.includes('email') || label.includes('email');
    const isChat = icon.includes('chat') || label.includes('chat');

    if (isPhone) {
      const phone = value.replace(/[^\d+]/g, '');
      if (phone) window.location.href = `tel:${phone}`;
      return;
    }

    if (isEmail) {
      if (value) window.location.href = `mailto:${value}`;
      return;
    }

    if (isChat) {
      if (value.startsWith('http://') || value.startsWith('https://')) {
        window.open(value, '_blank');
        return;
      }
      const chatPhone = value.replace(/\D/g, '');
      if (chatPhone) {
        window.open(`https://wa.me/${chatPhone}`, '_blank');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center pb-20">
        <p className="text-neutral-500">Loading help content...</p>
        <DeliveryBottomNav />
      </div>
    );
  }

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
          <h2 className="text-neutral-900 text-xl font-semibold">Help & Support</h2>
        </div>

        {/* Contact Options */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden mb-4">
          <div className="p-4 border-b border-neutral-200">
            <h3 className="text-neutral-900 font-semibold">Contact Us</h3>
          </div>
          <div className="divide-y divide-neutral-200">
            {contacts.map((option, index) => (
              <div key={index} className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-neutral-900 text-sm font-medium mb-1">{option.label}</p>
                  <p className="text-neutral-500 text-xs">{option.value}</p>
                </div>
                <button
                  onClick={() => handleContactClick(option)}
                  className="text-2xl hover:scale-105 transition-transform"
                  aria-label={`Contact via ${option.label}`}
                >
                  {getIcon(option.icon)}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
          <div className="p-4 border-b border-neutral-200">
            <h3 className="text-neutral-900 font-semibold">Frequently Asked Questions</h3>
          </div>
          <div className="divide-y divide-neutral-200">
            {faqs.map((item, index) => (
              <div key={index} className="p-4">
                <p className="text-neutral-900 text-sm font-medium mb-2">{item.question}</p>
                <p className="text-neutral-500 text-xs leading-relaxed">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
      <DeliveryBottomNav />
    </div>
  );
}

