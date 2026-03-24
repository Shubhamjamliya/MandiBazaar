import { useState, useEffect } from 'react';
import { getAppSettings, updateAppSettings } from '../../../services/api/admin/adminSettingsService';
import { useToast } from '../../../context/ToastContext';

export default function AdminShippingPolicy() {
  const [shippingPolicy, setShippingPolicy] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    fetchPolicy();
  }, []);

  const fetchPolicy = async () => {
    try {
      setLoading(true);
      const response = await getAppSettings();
      if (response.success) {
        setShippingPolicy(response.data.deliveryAppPolicy || '');
      }
    } catch (error) {
      console.error('Error fetching shipping policy:', error);
      showToast('Failed to load policy', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const response = await updateAppSettings({
        deliveryAppPolicy: shippingPolicy
      });
      if (response.success) {
        showToast('Shipping & Delivery Policy updated successfully!', 'success');
      } else {
        showToast(response.message || 'Failed to update policy', 'error');
      }
    } catch (error) {
      console.error('Error updating shipping policy:', error);
      showToast('An error occurred while saving', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white px-4 sm:px-6 py-4 border-b border-neutral-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-neutral-900">Shipping & Delivery Policy</h1>
          </div>
          <div className="text-sm text-neutral-600">
            <span className="text-blue-600">Home</span> / <span className="text-neutral-900">Shipping Policy</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-neutral-50">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Shipping Policy Section */}
            <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
              <div className="bg-teal-600 px-4 sm:px-6 py-3">
                <h2 className="text-white text-lg font-semibold">Policy Content</h2>
              </div>
              <div className="p-4 sm:p-6">
                <div>
                  <label className="block text-sm font-bold text-neutral-800 mb-2">
                    Shipping & Delivery Policy Text <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="shippingPolicy"
                    value={shippingPolicy}
                    onChange={(e) => setShippingPolicy(e.target.value)}
                    placeholder="Enter Shipping & Delivery Policy content..."
                    rows={25}
                    required
                    className="w-full px-4 py-3 border border-neutral-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-y font-mono"
                  />
                  <p className="mt-2 text-xs text-neutral-500">
                    This content will be displayed to customers in the "Shipping & Delivery" section.
                  </p>
                </div>
              </div>
            </div>

            {/* Preview Section */}
            <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
              <div className="bg-teal-600 px-4 sm:px-6 py-3">
                <h2 className="text-white text-lg font-semibold">Preview</h2>
              </div>
              <div className="p-4 sm:p-6">
                <div className="prose max-w-none">
                  <div className="whitespace-pre-wrap text-sm text-neutral-700 bg-neutral-50 p-4 rounded border border-neutral-200 min-h-[200px] max-h-[400px] overflow-y-auto font-sans">
                    {shippingPolicy || 'Policy content will appear here...'}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={() => setShippingPolicy('')}
                className="px-6 py-2.5 border border-neutral-300 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                Clear
              </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-2.5 rounded-lg text-base font-medium transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Update Policy'}
                </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
