import React, { useState, useEffect } from 'react';
import { PhoneIcon, CheckCircleIcon, XCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface TwilioSettings {
  id: string;
  user_id: string;
  account_sid: string;
  phone_number: string | null;
  sms_enabled: boolean;
  voice_enabled: boolean;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  last_verified_at: string | null;
}

interface PhoneNumber {
  sid: string;
  phone_number: string;
  friendly_name: string;
  capabilities: {
    sms: boolean;
    voice: boolean;
  };
}

interface CRMPhoneNumber {
  id: string;
  phone_number: string;
  friendly_name: string | null;
  rotation_enabled: boolean;
  total_messages_sent: number;
  total_messages_received: number;
  last_used_at: string | null;
}

interface SyncStatus {
  configured: boolean;
  verified: boolean;
  account_sid: string;
  last_verified: string | null;
  statistics: {
    phone_numbers: number;
    messages: number;
    calls: number;
  };
}

export default function TwilioSettings() {
  const [settings, setSettings] = useState<TwilioSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [crmPhoneNumbers, setCrmPhoneNumbers] = useState<CRMPhoneNumber[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const { token } = useAuth();

  const [formData, setFormData] = useState({
    account_sid: '',
    auth_token: '',
    phone_number: '',
    sms_enabled: true,
    voice_enabled: true
  });

  useEffect(() => {
    fetchSettings();
    fetchSyncStatus();
    fetchCRMPhoneNumbers();
  }, []);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const fetchSettings = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/twilio-settings/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data);
        setFormData({
          account_sid: data.account_sid,
          auth_token: '••••••••••••••••',  // Masked for security
          phone_number: data.phone_number || '',
          sms_enabled: data.sms_enabled,
          voice_enabled: data.voice_enabled
        });
        
        // Fetch available phone numbers if verified
        if (data.is_verified) {
          fetchPhoneNumbers();
        }
      } else if (response.status === 404) {
        // No settings configured yet
        setShowForm(true);
      }
    } catch (error) {
      console.error('Error fetching Twilio settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPhoneNumbers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/twilio-settings/phone-numbers`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPhoneNumbers(data.phone_numbers);
      }
    } catch (error) {
      console.error('Error fetching phone numbers:', error);
    }
  };

  const fetchCRMPhoneNumbers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/sms/phone-numbers`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCrmPhoneNumbers(data);
      }
    } catch (error) {
      console.error('Error fetching CRM phone numbers:', error);
    }
  };

  const fetchSyncStatus = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/twilio/sync/status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSyncStatus(data);
      }
    } catch (error) {
      console.error('Error fetching sync status:', error);
    }
  };

  const handleSyncPhoneNumbers = async () => {
    setSyncing(true);
    try {
      const response = await fetch(`${API_BASE_URL}/twilio/sync/phone-numbers`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Synced ${data.added} new numbers, updated ${data.updated}`);
        fetchCRMPhoneNumbers();
        fetchSyncStatus();
      } else {
        toast.error('Failed to sync phone numbers');
      }
    } catch (error) {
      console.error('Error syncing phone numbers:', error);
      toast.error('Failed to sync phone numbers');
    } finally {
      setSyncing(false);
    }
  };

  const handleFullSync = async () => {
    setSyncing(true);
    try {
      const response = await fetch(`${API_BASE_URL}/twilio/sync/full`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast.success('Full sync started in background');
        setTimeout(() => {
          fetchCRMPhoneNumbers();
          fetchSyncStatus();
        }, 3000);
      } else {
        toast.error('Failed to start sync');
      }
    } catch (error) {
      console.error('Error starting full sync:', error);
      toast.error('Failed to start sync');
    } finally {
      setSyncing(false);
    }
  };

  const toggleRotation = async (numberId: string, enabled: boolean) => {
    try {
      const response = await fetch(`${API_BASE_URL}/sms/phone-numbers/${numberId}/rotation?enabled=${enabled}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast.success(`Rotation ${enabled ? 'enabled' : 'disabled'}`);
        fetchCRMPhoneNumbers();
      } else {
        toast.error('Failed to update rotation');
      }
    } catch (error) {
      console.error('Error toggling rotation:', error);
      toast.error('Failed to update rotation');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const method = settings ? 'PUT' : 'POST';
      const response = await fetch(`${API_BASE_URL}/api/twilio-settings/`, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data);
        setShowForm(false);
        toast.success(settings ? 'Settings updated successfully' : 'Settings created successfully');
        
        if (data.is_verified) {
          fetchPhoneNumbers();
        } else {
          toast('Please verify your Twilio credentials', { icon: '⚠️' });
        }
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/twilio-settings/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.verified) {
          toast.success('Credentials verified successfully');
          fetchSettings();
        } else {
          toast.error('Verification failed. Please check your credentials.');
        }
      }
    } catch (error) {
      console.error('Error verifying credentials:', error);
      toast.error('Failed to verify credentials');
    } finally {
      setVerifying(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete your Twilio settings?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/twilio-settings/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setSettings(null);
        setShowForm(true);
        toast.success('Settings deleted successfully');
      }
    } catch (error) {
      console.error('Error deleting settings:', error);
      toast.error('Failed to delete settings');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="px-4 sm:px-6 lg:max-w-7xl lg:mx-auto lg:px-8">
          <div className="py-6">
            <div className="flex items-center space-x-3">
              <PhoneIcon className="w-8 h-8 text-primary-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Twilio Integration</h1>
                <p className="text-gray-600">Configure your Twilio account for SMS and voice calls</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6 lg:max-w-7xl lg:mx-auto lg:px-8 py-6">
        <div className="max-w-3xl mx-auto">
          {/* Current Settings */}
          {settings && !showForm && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-lg font-medium text-gray-900">Current Configuration</h2>
                  <p className="text-sm text-gray-500 mt-1">Your Twilio account is configured</p>
                </div>
                <div className="flex items-center space-x-2">
                  {settings.is_verified ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                      <CheckCircleIcon className="w-4 h-4 mr-1" />
                      Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                      <XCircleIcon className="w-4 h-4 mr-1" />
                      Not Verified
                    </span>
                  )}
                </div>
              </div>

              <dl className="grid grid-cols-1 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Account SID</dt>
                  <dd className="mt-1 text-sm text-gray-900 font-mono">{settings.account_sid}</dd>
                </div>
                
                {settings.phone_number && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Phone Number</dt>
                    <dd className="mt-1 text-sm text-gray-900">{settings.phone_number}</dd>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">SMS Enabled</dt>
                    <dd className="mt-1">
                      {settings.sms_enabled ? (
                        <span className="text-green-600">✓ Yes</span>
                      ) : (
                        <span className="text-gray-400">✗ No</span>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Voice Enabled</dt>
                    <dd className="mt-1">
                      {settings.voice_enabled ? (
                        <span className="text-green-600">✓ Yes</span>
                      ) : (
                        <span className="text-gray-400">✗ No</span>
                      )}
                    </dd>
                  </div>
                </div>

                {settings.last_verified_at && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Last Verified</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {new Date(settings.last_verified_at).toLocaleString()}
                    </dd>
                  </div>
                )}
              </dl>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={() => setShowForm(true)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Edit Settings
                </button>
                <button
                  onClick={handleVerify}
                  disabled={verifying}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
                >
                  {verifying ? (
                    <>
                      <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="w-4 h-4 mr-2" />
                      Verify Credentials
                    </>
                  )}
                </button>
                <button
                  onClick={handleSyncPhoneNumbers}
                  disabled={syncing}
                  className="inline-flex items-center px-4 py-2 border border-blue-300 rounded-lg text-sm font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                >
                  <ArrowPathIcon className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                  Sync Phone Numbers
                </button>
                <button
                  onClick={handleFullSync}
                  disabled={syncing}
                  className="inline-flex items-center px-4 py-2 border border-green-300 rounded-lg text-sm font-medium text-green-700 hover:bg-green-50 disabled:opacity-50"
                >
                  <ArrowPathIcon className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                  Full Sync
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 border border-red-300 rounded-lg text-sm font-medium text-red-700 hover:bg-red-50"
                >
                  Delete Settings
                </button>
              </div>
            </div>
          )}

          {/* Sync Statistics */}
          {syncStatus && settings?.is_verified && !showForm && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Sync Statistics</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-3xl font-bold text-blue-600">{syncStatus.statistics.phone_numbers}</p>
                  <p className="text-sm text-gray-600 mt-1">Phone Numbers</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-3xl font-bold text-green-600">{syncStatus.statistics.messages}</p>
                  <p className="text-sm text-gray-600 mt-1">Messages</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="text-3xl font-bold text-purple-600">{syncStatus.statistics.calls}</p>
                  <p className="text-sm text-gray-600 mt-1">Calls</p>
                </div>
              </div>
            </div>
          )}

          {/* CRM Phone Numbers with Rotation */}
          {settings?.is_verified && crmPhoneNumbers.length > 0 && !showForm && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Your Phone Numbers</h2>
              <div className="space-y-3">
                {crmPhoneNumbers.map((number) => (
                  <div
                    key={number.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{number.phone_number}</p>
                      {number.friendly_name && (
                        <p className="text-sm text-gray-500">{number.friendly_name}</p>
                      )}
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        <span>📤 {number.total_messages_sent} sent</span>
                        <span>📥 {number.total_messages_received} received</span>
                        {number.last_used_at && (
                          <span>🕐 Last used: {new Date(number.last_used_at).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={number.rotation_enabled}
                          onChange={(e) => toggleRotation(number.id, e.target.checked)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Rotation</span>
                      </label>
                      {number.rotation_enabled && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">Active</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  💡 <strong>Number Rotation:</strong> When enabled, the system will automatically rotate between your phone numbers when sending SMS to distribute load and improve deliverability.
                </p>
              </div>
            </div>
          )}

          {/* Available Phone Numbers from Twilio */}
          {settings?.is_verified && phoneNumbers.length > 0 && !showForm && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Available in Twilio Console</h2>
              <div className="space-y-3">
                {phoneNumbers.map((number) => (
                  <div
                    key={number.sid}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{number.phone_number}</p>
                      <p className="text-sm text-gray-500">{number.friendly_name}</p>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      {number.capabilities.sms && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">SMS</span>
                      )}
                      {number.capabilities.voice && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded">Voice</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Configuration Form */}
          {showForm && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                {settings ? 'Update' : 'Configure'} Twilio Settings
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account SID *
                  </label>
                  <input
                    type="text"
                    value={formData.account_sid}
                    onChange={(e) => setFormData({ ...formData, account_sid: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    required
                    minLength={34}
                    maxLength={34}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Find this in your Twilio Console dashboard
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Auth Token *
                  </label>
                  <input
                    type="password"
                    value={formData.auth_token}
                    onChange={(e) => setFormData({ ...formData, auth_token: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Enter your Twilio Auth Token"
                    required
                    minLength={32}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Keep this secret! Never share your auth token.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number (Optional)
                  </label>
                  <input
                    type="tel"
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="+1234567890"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    E.164 format (e.g., +1234567890). Leave empty to select later.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.sms_enabled}
                      onChange={(e) => setFormData({ ...formData, sms_enabled: e.target.checked })}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Enable SMS messaging</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.voice_enabled}
                      onChange={(e) => setFormData({ ...formData, voice_enabled: e.target.checked })}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Enable voice calls</span>
                  </label>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : (settings ? 'Update Settings' : 'Save Settings')}
                  </button>
                  {settings && (
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="text-sm font-medium text-blue-900 mb-2">How to get your Twilio credentials:</h3>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Go to <a href="https://console.twilio.com" target="_blank" rel="noopener noreferrer" className="underline">console.twilio.com</a></li>
                  <li>Sign in or create a free account</li>
                  <li>Find your Account SID and Auth Token on the dashboard</li>
                  <li>Purchase a phone number if you don't have one</li>
                  <li>Copy and paste your credentials here</li>
                </ol>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
