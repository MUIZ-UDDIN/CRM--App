import React, { useState, useEffect } from 'react';
import { ChatBubbleLeftRightIcon, PlusIcon } from '@heroicons/react/24/outline';
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

interface SMSMessage {
  id: string;
  from: string;
  to: string;
  message: string;
  sent_at: string;
  status: string;
  direction: 'inbound' | 'outbound';
}

export default function SMSNew() {
  const [messages, setMessages] = useState<SMSMessage[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'inbox' | 'sent'>('inbox');
  const { token } = useAuth();
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const [smsForm, setSmsForm] = useState({
    from: '',
    to: '',
    message: ''
  });

  const [searchTo, setSearchTo] = useState('');
  const [twilioNumbers, setTwilioNumbers] = useState<string[]>([]);

  useEffect(() => {
    fetchMessages();
    fetchContacts();
    loadTwilioConfig();
  }, [selectedTab]);

  const loadTwilioConfig = () => {
    const twilioConfig = localStorage.getItem('twilioConfig');
    if (twilioConfig) {
      const config = JSON.parse(twilioConfig);
      setTwilioNumbers([config.phoneNumber]);
      setSmsForm(prev => ({ ...prev, from: config.phoneNumber }));
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
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/sms/messages?type=${selectedTab}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendSMS = async () => {
    if (!smsForm.from || !smsForm.to || !smsForm.message) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/sms/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(smsForm)
      });

      if (response.ok) {
        toast.success('SMS sent successfully!');
        setShowComposeModal(false);
        setSmsForm({ from: smsForm.from, to: '', message: '' });
        fetchMessages();
      } else {
        toast.error('Failed to send SMS');
      }
    } catch (error) {
      console.error('Error sending SMS:', error);
      toast.error('Failed to send SMS');
    }
  };

  const filteredContacts = contacts.filter(c =>
    (c.phone && c.phone.toLowerCase().includes(searchTo.toLowerCase())) ||
    (c.mobile && c.mobile.toLowerCase().includes(searchTo.toLowerCase())) ||
    `${c.first_name} ${c.last_name}`.toLowerCase().includes(searchTo.toLowerCase())
  );

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="px-4 sm:px-6 lg:max-w-7xl lg:mx-auto lg:px-8">
          <div className="py-6 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">SMS Messages</h1>
              <p className="mt-1 text-sm text-gray-500">Send and receive text messages</p>
            </div>
            <button
              onClick={() => setShowComposeModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              New Message
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 bg-white">
        <div className="px-4 sm:px-6 lg:max-w-7xl lg:mx-auto lg:px-8">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setSelectedTab('inbox')}
              className={`${
                selectedTab === 'inbox'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Inbox
            </button>
            <button
              onClick={() => setSelectedTab('sent')}
              className={`${
                selectedTab === 'sent'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Sent
            </button>
          </nav>
        </div>
      </div>

      {/* Messages List */}
      <div className="px-4 sm:px-6 lg:max-w-7xl lg:mx-auto lg:px-8 py-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <ChatBubbleLeftRightIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No messages</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by sending a new message.</p>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg divide-y divide-gray-200">
            {messages.map((msg) => (
              <div key={msg.id} className="p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        msg.direction === 'outbound' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {msg.direction === 'outbound' ? 'Sent' : 'Received'}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        msg.status === 'delivered' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {msg.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">
                      From: {msg.from} → To: {msg.to}
                    </p>
                    <p className="mt-1 text-sm text-gray-900">{msg.message}</p>
                    <p className="mt-1 text-xs text-gray-400">
                      {new Date(msg.sent_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Compose Modal */}
      {showComposeModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Send SMS</h3>
              <button onClick={() => setShowComposeModal(false)} className="text-gray-400 hover:text-gray-600">
                ×
              </button>
            </div>
            <div className="space-y-4">
              <SearchableSelect
                label="From (Your Twilio Number)"
                options={twilioNumbers}
                value={smsForm.from}
                onChange={(value) => setSmsForm({...smsForm, from: value})}
                placeholder="Search Twilio numbers or enter manually..."
                allowCustom={true}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To (Contact or Phone Number)</label>
                <input
                  type="text"
                  value={smsForm.to}
                  onChange={(e) => {
                    setSmsForm({...smsForm, to: e.target.value});
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
                          setSmsForm({...smsForm, to: contact.phone || contact.mobile || ''});
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea
                  value={smsForm.message}
                  onChange={(e) => setSmsForm({...smsForm, message: e.target.value})}
                  rows={4}
                  placeholder="Type your message..."
                  maxLength={160}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                <p className="mt-1 text-xs text-gray-500">{smsForm.message.length}/160 characters</p>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowComposeModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendSMS}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
                >
                  Send SMS
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
