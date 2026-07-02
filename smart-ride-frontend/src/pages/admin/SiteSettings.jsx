import React, { useState, useEffect } from 'react';
import { Settings, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../../components/ui/Button';
import { getSettings, updateSettings } from '../../api/settings.api';

export default function SiteSettings() {
  const [settings, setSettings] = useState({ contact_phone: '', contact_email: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSettings()
      .then(res => {
        const data = res.data || {};
        setSettings({
          contact_phone: data.contact_phone || '',
          contact_email: data.contact_email || ''
        });
      })
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateSettings(settings);
      toast.success('Settings updated successfully');
    } catch (err) {
      toast.error('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading settings...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Site Settings</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage global configuration for Smart Ride.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden max-w-2xl">
        <div className="p-5 border-b border-gray-100 flex items-center gap-2">
          <Settings size={20} className="text-primary-600" />
          <h2 className="font-bold text-navy-900">Contact Information</h2>
        </div>
        
        <div className="p-6">
          <form onSubmit={handleSave} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-navy-700 mb-1">
                Support Phone Number
              </label>
              <input
                type="text"
                value={settings.contact_phone}
                onChange={e => setSettings(s => ({ ...s, contact_phone: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary-600"
                placeholder="e.g., +91 9876543210"
              />
              <p className="text-xs text-gray-400 mt-1">Displayed in the footer and contact sections.</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-navy-700 mb-1">
                Support Email Address
              </label>
              <input
                type="email"
                value={settings.contact_email}
                onChange={e => setSettings(s => ({ ...s, contact_email: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary-600"
                placeholder="e.g., support@smartride.com"
              />
            </div>

            <div className="pt-4 border-t border-gray-100 flex justify-end">
              <Button type="submit" variant="primary" leftIcon={<Save size={16} />} isLoading={saving}>
                Save Settings
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
