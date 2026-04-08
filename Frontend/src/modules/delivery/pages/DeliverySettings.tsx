import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import DeliveryBottomNav from '../components/DeliveryBottomNav';
import { updateSettings, getDeliveryProfile } from '../../../services/api/delivery/deliveryService';

export default function DeliverySettings() {
  const navigate = useNavigate();
  const SETTINGS_STORAGE_KEY = 'delivery-local-settings';
  const LANGUAGE_STORAGE_KEY = 'delivery-language';
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [showLanguageSheet, setShowLanguageSheet] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      const cachedSettingsRaw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (cachedSettingsRaw) {
        try {
          const cachedSettings = JSON.parse(cachedSettingsRaw);
          setNotificationsEnabled(cachedSettings.notifications ?? true);
          setLocationEnabled(cachedSettings.location ?? true);
          setSoundEnabled(cachedSettings.sound ?? true);
        } catch {
          // Ignore parse issues and fallback to API
        }
      }

      const cachedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (cachedLanguage) {
        setSelectedLanguage(cachedLanguage);
      }

      try {
        const profile = await getDeliveryProfile();
        if (profile.settings) {
          const nextSettings = {
            notifications: profile.settings.notifications ?? true,
            location: profile.settings.location ?? true,
            sound: profile.settings.sound ?? true,
          };
          setNotificationsEnabled(nextSettings.notifications);
          setLocationEnabled(nextSettings.location);
          setSoundEnabled(nextSettings.sound);
          localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(nextSettings));
        }
      } catch (error) {
        console.error("Failed to fetch settings", error);
      }
    };
    fetchSettings();
  }, []);

  const handleSettingChange = async (key: string, value: boolean) => {
    const previous = {
      notifications: notificationsEnabled,
      location: locationEnabled,
      sound: soundEnabled,
    };

    // Optimistic update
    if (key === 'notifications') setNotificationsEnabled(value);
    if (key === 'location') setLocationEnabled(value);
    if (key === 'sound') setSoundEnabled(value);

    const next = { ...previous, [key]: value };
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));

    try {
      await updateSettings({ [key]: value });
    } catch (error) {
      console.error("Failed to update settings", error);
      setNotificationsEnabled(previous.notifications);
      setLocationEnabled(previous.location);
      setSoundEnabled(previous.sound);
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(previous));
    }
  };

  const handleSelectLanguage = (language: string) => {
    setSelectedLanguage(language);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    setShowLanguageSheet(false);
  };

  const settingsOptions = [
    {
      id: 'notifications',
      title: 'Push Notifications',
      description: 'Receive notifications for new orders',
      value: notificationsEnabled,
      onChange: (val: boolean) => handleSettingChange('notifications', val),
    },
    {
      id: 'location',
      title: 'Location Services',
      description: 'Allow app to access your location',
      value: locationEnabled,
      onChange: (val: boolean) => handleSettingChange('location', val),
    },
    {
      id: 'sound',
      title: 'Sound Alerts',
      description: 'Play sound for new order alerts',
      value: soundEnabled,
      onChange: (val: boolean) => handleSettingChange('sound', val),
    },
  ];

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
          <h2 className="text-neutral-900 text-xl font-semibold">Settings</h2>
        </div>

        {/* Settings Options */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden mb-4">
          <div className="p-4 border-b border-neutral-200">
            <h3 className="text-neutral-900 font-semibold">Preferences</h3>
          </div>
          <div className="divide-y divide-neutral-200">
            {settingsOptions.map((option) => (
              <div key={option.id} className="p-4 flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-neutral-900 text-sm font-medium mb-1">{option.title}</p>
                  <p className="text-neutral-500 text-xs">{option.description}</p>
                </div>
                <button
                  onClick={() => option.onChange(!option.value)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${option.value ? 'bg-orange-500' : 'bg-neutral-300'
                    }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${option.value ? 'translate-x-6' : 'translate-x-1'
                      }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Other Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
          <div className="p-4 border-b border-neutral-200">
            <h3 className="text-neutral-900 font-semibold">Other</h3>
          </div>
          <div className="divide-y divide-neutral-200">
            <button
              onClick={() => setShowLanguageSheet(true)}
              className="w-full p-4 flex items-center justify-between hover:bg-neutral-50 transition-colors"
            >
              <div className="flex-1 text-left">
                <p className="text-neutral-900 text-sm font-medium">Language</p>
                <p className="text-neutral-500 text-xs mt-1">{selectedLanguage}</p>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M9 18L15 12L9 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-neutral-400"
                />
              </svg>
            </button>
            <button
              onClick={() => navigate('/privacy-policy')}
              className="w-full p-4 flex items-center justify-between hover:bg-neutral-50 transition-colors"
            >
              <div className="flex-1 text-left">
                <p className="text-neutral-900 text-sm font-medium">Privacy Policy</p>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M9 18L15 12L9 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-neutral-400"
                />
              </svg>
            </button>
            <button
              onClick={() => navigate('/terms-of-service')}
              className="w-full p-4 flex items-center justify-between hover:bg-neutral-50 transition-colors"
            >
              <div className="flex-1 text-left">
                <p className="text-neutral-900 text-sm font-medium">Terms & Conditions</p>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M9 18L15 12L9 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-neutral-400"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* App Version */}
        <div className="mt-4 text-center">
          <p className="text-neutral-400 text-xs">App Version 1.0.0</p>
        </div>

        {showLanguageSheet && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-end" onClick={() => setShowLanguageSheet(false)}>
            <div className="w-full bg-white rounded-t-2xl p-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-neutral-900 text-base font-semibold mb-3">Select Language</h3>
              <div className="space-y-2">
                {['English', 'Hindi'].map((lang) => (
                  <button
                    key={lang}
                    onClick={() => handleSelectLanguage(lang)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border ${selectedLanguage === lang
                      ? 'border-orange-500 bg-orange-50 text-orange-700'
                      : 'border-neutral-200 text-neutral-700'
                      }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      <DeliveryBottomNav />
    </div>
  );
}

