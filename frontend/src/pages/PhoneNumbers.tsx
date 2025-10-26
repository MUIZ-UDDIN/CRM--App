import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PhoneIcon, ArrowLeftIcon, ArrowPathIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface PhoneNumber {
  id: string;
  phone_number: string;
  friendly_name: string;
  capabilities: {
    voice: boolean;
    sms: boolean;
    mms: boolean;
  };
  is_active: boolean;
  use_for_rotation: boolean;
  created_at: string;
}

export default function PhoneNumbers() {
  const navigate = useNavigate();
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const { token } = useAuth();
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  useEffect(() => {
    fetchPhoneNumbers();
  }, []);

  const fetchPhoneNumbers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/sms/phone-numbers`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPhoneNumbers(data);
      } else {
        toast.error('Failed to load phone numbers');
      }
    } catch (error) {
      console.error('Error fetching phone numbers:', error);
      toast.error('Failed to load phone numbers');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/twilio/sync/phone-numbers`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Synced ${data.added || 0} new numbers, updated ${data.updated || 0}`);
        fetchPhoneNumbers();
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

  const toggleRotation = async (numberId: string, enabled: boolean) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/sms/phone-numbers/${numberId}/rotation?enabled=${enabled}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast.success(`Rotation ${enabled ? 'enabled' : 'disabled'}`);
        fetchPhoneNumbers();
      } else {
        toast.error('Failed to update rotation setting');
      }
    } catch (error) {
      console.error('Error toggling rotation:', error);
      toast.error('Failed to update rotation setting');
    }
  };

  const toggleActive = async (numberId: string, active: boolean) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/sms/phone-numbers/${numberId}/active?active=${active}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast.success(`Number ${active ? 'activated' : 'deactivated'}`);
        fetchPhoneNumbers();
      } else {
        toast.error('Failed to update number status');
      }
    } catch (error) {
      console.error('Error toggling active status:', error);
      toast.error('Failed to update number status');
    }
  };

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="px-4 sm:px-6 lg:max-w-7xl lg:mx-auto lg:px-8">
          <div className="py-6 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate('/settings')}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeftIcon className="w-6 h-6 text-gray-600" />
              </button>
              <PhoneIcon className="w-8 h-8 text-primary-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Phone Numbers</h1>
                <p className="text-gray-600">Manage your Twilio phone numbers</p>
              </div>
            </div>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
            >
              <ArrowPathIcon className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync from Twilio'}
            </button>
          </div>
        </div>
      </div>

      {/* Phone Numbers List */}
      <div className="px-4 sm:px-6 lg:max-w-7xl lg:mx-auto lg:px-8 py-6">
        {phoneNumbers.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <PhoneIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No phone numbers</h3>
            <p className="mt-1 text-sm text-gray-500">Sync your Twilio phone numbers to get started.</p>
            <div className="mt-6">
              <button
                onClick={handleSync}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700"
              >
                <ArrowPathIcon className="h-4 w-4 mr-2" />
                Sync from Twilio
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Friendly Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Capabilities
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rotation
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {phoneNumbers.map((number) => (
                  <tr key={number.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <PhoneIcon className="h-5 w-5 text-gray-400 mr-2" />
                        <span className="text-sm font-medium text-gray-900">{number.phone_number}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">{number.friendly_name || '-'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-2">
                        {number.capabilities.voice && (
                          <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">Voice</span>
                        )}
                        {number.capabilities.sms && (
                          <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">SMS</span>
                        )}
                        {number.capabilities.mms && (
                          <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">MMS</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        number.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {number.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleRotation(number.id, !number.use_for_rotation)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          number.use_for_rotation ? 'bg-primary-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            number.use_for_rotation ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => toggleActive(number.id, !number.is_active)}
                        className={`${
                          number.is_active ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'
                        }`}
                      >
                        {number.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Info Section */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-2">About Phone Number Rotation</h3>
          <p className="text-sm text-blue-800">
            Enable rotation for numbers you want to use for bulk SMS campaigns. The system will automatically rotate between enabled numbers to distribute messages and avoid rate limits.
          </p>
        </div>
      </div>
    </div>
  );
}
