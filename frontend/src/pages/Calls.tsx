import React, { useState, useEffect } from 'react';
import { PhoneIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import SearchableSelect from '../components/common/SearchableSelect';
import { CallModal } from '../components/CallModal';
import { twilioVoiceService } from '../services/twilioVoiceService';

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  phone?: string;
  mobile?: string;
}

interface Call {
  id: string;
  from_address: string;
  to_address: string;
  duration: number;
  status: string;
  direction: 'inbound' | 'outbound';
  started_at: string;
  contact_id?: string;
}

export default function CallsNew() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCallFormModal, setShowCallFormModal] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'all' | 'incoming' | 'outgoing'>('all');
  const { token } = useAuth();
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const [callForm, setCallForm] = useState({
    from: '',
    to: ''
  });

  const [searchTo, setSearchTo] = useState('');
  const [twilioNumbers, setTwilioNumbers] = useState<any[]>([]);
  const [showRedialModal, setShowRedialModal] = useState(false);
  const [redialNumber, setRedialNumber] = useState('');
  
  // Call UI state
  const [callState, setCallState] = useState<'idle' | 'ringing' | 'connecting' | 'connected' | 'ended'>('idle');
  const [currentCallNumber, setCurrentCallNumber] = useState('');
  const [currentCallName, setCurrentCallName] = useState('');
  const [isIncomingCall, setIsIncomingCall] = useState(false);

  useEffect(() => {
    fetchCalls();
    fetchContacts();
    fetchTwilioNumbers();
    
    // Initialize Twilio Device (silently fails if not configured)
    twilioVoiceService.initialize().catch(() => {
      // Silently ignore - Twilio not configured for this company
    });
    
    // Listen for incoming calls
    twilioVoiceService.onIncomingCall((call) => {
      const fromNumber = call.parameters.From;
      const contact = contacts.find(c => c.phone === fromNumber || c.mobile === fromNumber);
      
      setCurrentCallNumber(fromNumber);
      setCurrentCallName(contact ? `${contact.first_name} ${contact.last_name}` : '');
      setIsIncomingCall(true);
      setCallState('ringing');
    });
    
    // Listen for call ended
    twilioVoiceService.onCallEnded(() => {
      setCallState('ended');
      setTimeout(() => {
        setCallState('idle');
        fetchCalls(); // Refresh call list
      }, 2000);
    });
    
    return () => {
      // Cleanup
    };
  }, [selectedTab, token]);

  // Listen for real-time WebSocket updates
  useEffect(() => {
    const handleEntityChange = (event: any) => {
      const { entity_type, action } = event.detail;
      
      // Refresh calls when any call is created
      if (entity_type === 'call') {
        console.log(`🔄 Call ${action} detected, refreshing calls...`);
        fetchCalls();
      }
    };

    window.addEventListener('entity_change', handleEntityChange);
    return () => window.removeEventListener('entity_change', handleEntityChange);
  }, [selectedTab]);

  const fetchTwilioNumbers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/sms/phone-numbers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        // Use all active numbers (voice_enabled might be false in DB but Twilio supports it)
        const activeNumbers = data.filter((num: any) => num.is_active);
        setTwilioNumbers(activeNumbers);
        // Set first number as default
        if (activeNumbers.length > 0) {
          setCallForm(prev => ({ ...prev, from: activeNumbers[0].phone_number }));
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

  const formatPhoneNumber = (phone: string): string => {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    
    // If starts with 0 (Pakistan local format), convert to +92
    if (digits.startsWith('0') && digits.length === 11) {
      return `+92${digits.substring(1)}`;
    }
    
    // If already has country code but no +
    if (digits.length === 12 && digits.startsWith('92')) {
      return `+${digits}`;
    }
    
    // If starts with 1 (US/Canada), add +
    if (digits.startsWith('1') && digits.length === 11) {
      return `+${digits}`;
    }
    
    // If already starts with +, return as is
    if (phone.startsWith('+')) {
      return phone;
    }
    
    // Default: assume it needs +
    return digits ? `+${digits}` : phone;
  };

  const handleMakeCall = async () => {
    if (!callForm.from || !callForm.to) {
      toast.error('Please select from number and enter recipient number');
      return;
    }

    try {
      const formattedTo = formatPhoneNumber(callForm.to);
      
      const response = await fetch(`${API_BASE_URL}/api/calls/initiate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: callForm.from,
          to: formattedTo
        })
      });

      if (response.ok) {
        toast.success('Call initiated successfully!');
        setShowCallFormModal(false);
        setCallForm({ from: callForm.from, to: '' });
        fetchCalls();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to initiate call');
        console.error('Call error:', error);
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

  const handleRedial = (phoneNumber: string) => {
    setRedialNumber(phoneNumber);
    setCallForm({ ...callForm, to: phoneNumber });
    setShowRedialModal(true);
  };

  const initiateRedial = async () => {
    if (!callForm.from || !redialNumber) {
      toast.error('Please select a number to call from');
      return;
    }

    try {
      // Find contact name
      const contact = contacts.find(c => c.phone === redialNumber || c.mobile === redialNumber);
      
      // Show call UI
      setCurrentCallNumber(redialNumber);
      setCurrentCallName(contact ? `${contact.first_name} ${contact.last_name}` : '');
      setIsIncomingCall(false);
      setCallState('ringing');
      setShowRedialModal(false);
      
      // Make call directly using Twilio Device SDK
      await twilioVoiceService.makeOutboundCall(redialNumber, callForm.from);
      
      setCallState('connecting');
      
      // Listen for call to be accepted
      setTimeout(() => {
        if (twilioVoiceService.isCallActive()) {
          setCallState('connected');
        }
      }, 2000);
      
    } catch (error) {
      console.error('Error initiating call:', error);
      toast.error('Failed to initiate call');
      setCallState('idle');
    }
  };
  
  const handleAnswerCall = async () => {
    await twilioVoiceService.answerCall();
    setCallState('connected');
  };
  
  const handleRejectCall = () => {
    twilioVoiceService.rejectCall();
    setCallState('idle');
  };
  
  const handleHangupCall = () => {
    twilioVoiceService.hangupCall();
    setCallState('ended');
    setTimeout(() => {
      setCallState('idle');
      fetchCalls();
    }, 2000);
  };
  
  const handleMuteCall = (muted: boolean) => {
    twilioVoiceService.muteCall(muted);
  };

  const cleanupStaleCalls = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/calls/cleanup-stale`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Updated ${data.updated_count} old calls`);
        fetchCalls();
      } else {
        toast.error('Failed to cleanup calls');
      }
    } catch (error) {
      console.error('Error cleaning up calls:', error);
      toast.error('Failed to cleanup calls');
    }
  };

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="px-4 sm:px-6 lg:max-w-7xl xl:max-w-8xl 2xl:max-w-9xl 3xl:max-w-10xl lg:mx-auto lg:px-8">
          <div className="py-4 sm:py-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <PhoneIcon className="w-6 h-6 sm:w-8 sm:h-8 text-primary-600 flex-shrink-0" />
                <div className="min-w-0">
                  <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 truncate">Calls</h1>
                  <p className="mt-1 text-xs sm:text-sm text-gray-500 truncate">Make and track phone calls</p>
                </div>
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={cleanupStaleCalls}
                className="inline-flex items-center justify-center px-3 sm:px-4 py-2 border border-gray-300 shadow-sm text-xs sm:text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 flex-1 sm:flex-initial whitespace-nowrap"
                title="Update old calls stuck in ringing status"
              >
                <span>Fix Old Calls</span>
              </button>
              <button
                onClick={() => setShowCallFormModal(true)}
                className="inline-flex items-center justify-center px-3 sm:px-4 py-2 border border-transparent shadow-sm text-xs sm:text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 flex-1 sm:flex-initial whitespace-nowrap"
              >
                <PhoneIcon className="h-4 w-4 sm:mr-2" />
                <span className="hidden xs:inline ml-1">Make Call</span>
              </button>
            </div>
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
      <div className="px-4 sm:px-6 lg:max-w-7xl xl:max-w-8xl 2xl:max-w-9xl 3xl:max-w-10xl lg:mx-auto lg:px-8 py-8">
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
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      From
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      To
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {calls.map((call) => {
                    // Determine which number to redial (handle both uppercase and lowercase)
                    const redialTo = call.direction?.toUpperCase() === 'OUTBOUND' ? call.to_address : call.from_address;
                    
                    return (
                    <tr key={call.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <PhoneIcon className={`h-5 w-5 mr-2 ${
                            call.direction?.toUpperCase() === 'OUTBOUND' ? 'text-blue-600' : 'text-green-600'
                          }`} />
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            call.direction?.toUpperCase() === 'OUTBOUND' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {call.direction?.toUpperCase() === 'OUTBOUND' ? 'Outgoing' : 'Incoming'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {call.from_address || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {call.to_address || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          call.status?.toUpperCase() === 'COMPLETED' ? 'bg-green-100 text-green-800' : 
                          call.status?.toUpperCase() === 'NO_ANSWER' ? 'bg-yellow-100 text-yellow-800' :
                          call.status?.toUpperCase() === 'BUSY' ? 'bg-red-100 text-red-800' :
                          call.status?.toUpperCase() === 'FAILED' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {call.status?.replace('_', '-').toLowerCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {call.duration > 0 ? formatDuration(call.duration) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {call.started_at ? new Date(call.started_at).toLocaleString() : 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => handleRedial(redialTo)}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                        >
                          <PhoneIcon className="h-4 w-4 mr-1" />
                          Redial
                        </button>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Make Call Modal */}
      {showCallFormModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Make a Call</h3>
              <button onClick={() => setShowCallFormModal(false)} className="text-gray-400 hover:text-gray-600">
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
                <div className="relative">
                  <input
                    type="text"
                    value={callForm.to}
                    onChange={(e) => {
                      setCallForm({...callForm, to: e.target.value});
                      setSearchTo(e.target.value);
                    }}
                    onFocus={() => setSearchTo(callForm.to || ' ')}
                    placeholder="Search contact or enter phone number..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                  {searchTo && (
                    <div className="absolute z-10 mt-1 w-full max-h-60 overflow-y-auto border border-gray-300 rounded-lg bg-white shadow-lg">
                      {filteredContacts.length > 0 ? (
                        filteredContacts.slice(0, 10).map((contact) => (
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
                        ))
                      ) : (
                        <div className="px-3 py-2 text-sm text-gray-500">
                          {searchTo.trim() === ' ' ? 'Start typing to search contacts...' : 'No contacts found'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> This will initiate a call through Twilio. Make sure your Twilio account is configured correctly.
                </p>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowCallFormModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMakeCall}
                  disabled={!callForm.from || !callForm.to}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <PhoneIcon className="h-4 w-4 inline mr-2" />
                  Call Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Redial Modal */}
      {showRedialModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Redial {redialNumber}</h3>
              <button onClick={() => setShowRedialModal(false)} className="text-gray-400 hover:text-gray-600">
                ×
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Your Number</label>
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
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowRedialModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={initiateRedial}
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
      
      {/* Call Modal - Only show when there's an active call */}
      <CallModal
        isOpen={callState !== 'idle'}
        callState={callState}
        contactName={currentCallName}
        contactNumber={currentCallNumber}
        isIncoming={isIncomingCall}
        onAnswer={handleAnswerCall}
        onReject={handleRejectCall}
        onHangup={handleHangupCall}
        onMute={handleMuteCall}
      />
    </div>
  );
}
