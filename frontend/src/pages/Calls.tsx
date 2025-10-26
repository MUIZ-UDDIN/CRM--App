import React, { useState, useEffect } from 'react';
import { PhoneIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import SearchableSelect from '../components/common/SearchableSelect';

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  phone?: string;
  mobile?: string;
}

interface Call {
  id: string;
  from: string;
  to: string;
  duration: number;
  status: string;
  direction: 'inbound' | 'outbound';
  created_at: string;
}

export default function CallsNew() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCallModal, setShowCallModal] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'all' | 'incoming' | 'outgoing'>('all');
  const { token } = useAuth();
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const [callForm, setCallForm] = useState({
    from: '',
    to: ''
  });

  const [searchTo, setSearchTo] = useState('');
  const [twilioNumbers, setTwilioNumbers] = useState<any[]>([]);

  useEffect(() => {
    fetchCalls();
    fetchContacts();
    fetchTwilioNumbers();
  }, [selectedTab]);

  const fetchTwilioNumbers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/sms/phone-numbers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched Twilio numbers:', data);
        // Filter for voice-enabled numbers
        const voiceNumbers = data.filter((num: any) => num.voice_enabled);
        console.log('Voice-enabled numbers:', voiceNumbers.length);
        setTwilioNumbers(voiceNumbers);
        // Set first number as default
        if (voiceNumbers.length > 0) {
          setCallForm(prev => ({ ...prev, from: voiceNumbers[0].phone_number }));
        }
      } else {
        console.error('Failed to fetch Twilio numbers:', response.status);
      }
    } catch (error) {
      console.error('Error fetching Twilio numbers:', error);
    }
  };

  const fetchContacts = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/contacts/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched contacts:', data.length);
        setContacts(data);
      } else {
        console.error('Failed to fetch contacts:', response.status);
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  };

  const fetchCalls = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/calls?type=${selectedTab}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCalls(data);
      } else {
        setCalls([]);
      }
    } catch (error) {
      console.error('Error fetching calls:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMakeCall = async () => {
    if (!callForm.from || !callForm.to) {
      toast.error('Please select from number and enter recipient number');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/calls/initiate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(callForm)
      });

      if (response.ok) {
        toast.success('Call initiated successfully!');
        setShowCallModal(false);
        setCallForm({ from: callForm.from, to: '' });
        fetchCalls();
      } else {
        toast.error('Failed to initiate call');
      }
    } catch (error) {
      console.error('Error initiating call:', error);
      toast.error('Failed to initiate call');
    }
  };

  const filteredContacts = contacts.filter(c =>
    (c.phone && c.phone.toLowerCase().includes(searchTo.toLowerCase())) ||
    (c.mobile && c.mobile.toLowerCase().includes(searchTo.toLowerCase())) ||
    `${c.first_name} ${c.last_name}`.toLowerCase().includes(searchTo.toLowerCase())
  );

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="px-4 sm:px-6 lg:max-w-7xl lg:mx-auto lg:px-8">
          <div className="py-6 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Calls</h1>
              <p className="mt-1 text-sm text-gray-500">Make and track phone calls</p>
            </div>
            <button
              onClick={() => setShowCallModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700"
            >
              <PhoneIcon className="h-4 w-4 mr-2" />
              Make Call
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 bg-white">
        <div className="px-4 sm:px-6 lg:max-w-7xl lg:mx-auto lg:px-8">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setSelectedTab('all')}
              className={`${
                selectedTab === 'all'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              All Calls
            </button>
            <button
              onClick={() => setSelectedTab('incoming')}
              className={`${
                selectedTab === 'incoming'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Incoming
            </button>
            <button
              onClick={() => setSelectedTab('outgoing')}
              className={`${
                selectedTab === 'outgoing'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Outgoing
            </button>
          </nav>
        </div>
      </div>

      {/* Calls List */}
      <div className="px-4 sm:px-6 lg:max-w-7xl lg:mx-auto lg:px-8 py-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          </div>
        ) : calls.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <PhoneIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No calls</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by making a new call.</p>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg divide-y divide-gray-200">
            {calls.map((call) => (
              <div key={call.id} className="p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <PhoneIcon className={`h-5 w-5 ${
                        call.direction === 'outbound' ? 'text-blue-600' : 'text-green-600'
                      }`} />
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        call.direction === 'outbound' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {call.direction === 'outbound' ? 'Outgoing' : 'Incoming'}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        call.status === 'completed' ? 'bg-green-100 text-green-800' : 
                        call.status === 'no-answer' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {call.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">
                      From: {call.from} → To: {call.to}
                    </p>
                    <p className="mt-1 text-sm text-gray-900">
                      Duration: {formatDuration(call.duration)}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      {new Date(call.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Make Call Modal */}
      {showCallModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Make a Call</h3>
              <button onClick={() => setShowCallModal(false)} className="text-gray-400 hover:text-gray-600">
                ×
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From (Your Twilio Number)</label>
                <select
                  value={callForm.from}
                  onChange={(e) => setCallForm({...callForm, from: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="">Select a number...</option>
                  {twilioNumbers.map((num) => (
                    <option key={num.id} value={num.phone_number}>
                      {num.phone_number} {num.friendly_name ? `(${num.friendly_name})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To (Contact or Phone Number)</label>
                <input
                  type="text"
                  value={callForm.to}
                  onChange={(e) => {
                    setCallForm({...callForm, to: e.target.value});
                    setSearchTo(e.target.value);
                  }}
                  placeholder="Search contact or enter phone number..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                {searchTo && filteredContacts.length > 0 && (
                  <div className="mt-1 max-h-40 overflow-y-auto border border-gray-300 rounded-lg bg-white shadow-lg">
                    {filteredContacts.slice(0, 5).map((contact) => (
                      <button
                        key={contact.id}
                        onClick={() => {
                          setCallForm({...callForm, to: contact.phone || contact.mobile || ''});
                          setSearchTo('');
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-gray-50 text-sm border-b last:border-b-0"
                      >
                        <div className="font-medium">{contact.first_name} {contact.last_name}</div>
                        <div className="text-gray-500 text-xs">{contact.phone || contact.mobile}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> This will initiate a call through Twilio. Make sure your Twilio account is configured correctly.
                </p>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowCallModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMakeCall}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
                >
                  <PhoneIcon className="h-4 w-4 inline mr-2" />
                  Call Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
