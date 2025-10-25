import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChatBubbleLeftRightIcon, 
  PlusIcon, 
  SparklesIcon,
  DocumentDuplicateIcon,
  UserGroupIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  phone?: string;
}

interface SMSMessage {
  id: string;
  from_address: string;
  to_address: string;
  body: string;
  sent_at: string;
  status: string;
  direction: 'inbound' | 'outbound';
  is_auto_response?: boolean;
}

interface SMSTemplate {
  id: string;
  name: string;
  body: string;
  category: string | null;
  use_ai_enhancement: boolean;
}

interface PhoneNumber {
  id: string;
  phone_number: string;
  friendly_name: string | null;
  rotation_enabled: boolean;
}

export default function SMSEnhanced() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<SMSMessage[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [templates, setTemplates] = useState<SMSTemplate[]>([]);
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'inbox' | 'sent'>('inbox');
  const { token } = useAuth();
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const [smsForm, setSmsForm] = useState({
    to: '',
    body: '',
    template_id: '',
    from_number: '',
    use_rotation: true,
    contact_id: ''
  });

  const [bulkForm, setBulkForm] = useState({
    contact_ids: [] as string[],
    body: '',
    template_id: '',
    use_rotation: true
  });

  useEffect(() => {
    fetchMessages();
    fetchContacts();
    fetchTemplates();
    fetchPhoneNumbers();
  }, [selectedTab]);

  const fetchMessages = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/sms/messages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
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

  const fetchTemplates = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/sms/templates`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const fetchPhoneNumbers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/sms/phone-numbers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setPhoneNumbers(data);
      }
    } catch (error) {
      console.error('Error fetching phone numbers:', error);
    }
  };

  const handleSendSMS = async () => {
    if (!smsForm.to || !smsForm.body) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/sms/send`, {
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
        setSmsForm({ to: '', body: '', template_id: '', from_number: '', use_rotation: true, contact_id: '' });
        fetchMessages();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to send SMS');
      }
    } catch (error) {
      console.error('Error sending SMS:', error);
      toast.error('Failed to send SMS');
    }
  };

  const handleBulkSMS = async () => {
    if (bulkForm.contact_ids.length === 0 || !bulkForm.body) {
      toast.error('Please select contacts and enter a message');
      return;
    }

    try {
      const promises = bulkForm.contact_ids.map(contactId => {
        const contact = contacts.find(c => c.id === contactId);
        if (!contact?.phone) return Promise.resolve();

        return fetch(`${API_BASE_URL}/sms/send`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            to: contact.phone,
            body: bulkForm.body,
            template_id: bulkForm.template_id,
            use_rotation: bulkForm.use_rotation,
            contact_id: contactId
          })
        });
      });

      await Promise.all(promises);
      toast.success(`Sent ${bulkForm.contact_ids.length} messages successfully!`);
      setShowBulkModal(false);
      setBulkForm({ contact_ids: [], body: '', template_id: '', use_rotation: true });
      fetchMessages();
    } catch (error) {
      console.error('Error sending bulk SMS:', error);
      toast.error('Failed to send bulk SMS');
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setSmsForm({ ...smsForm, template_id: templateId, body: template.body });
    }
  };

  const handleBulkTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setBulkForm({ ...bulkForm, template_id: templateId, body: template.body });
    }
  };

  const toggleContactSelection = (contactId: string) => {
    setBulkForm(prev => ({
      ...prev,
      contact_ids: prev.contact_ids.includes(contactId)
        ? prev.contact_ids.filter(id => id !== contactId)
        : [...prev.contact_ids, contactId]
    }));
  };

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="px-4 sm:px-6 lg:max-w-7xl lg:mx-auto lg:px-8">
          <div className="py-6 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <ChatBubbleLeftRightIcon className="w-8 h-8 mr-3 text-primary-600" />
                SMS Messages
              </h1>
              <p className="mt-1 text-sm text-gray-500">Send and receive text messages with AI-powered features</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowBulkModal(true)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50"
              >
                <UserGroupIcon className="h-4 w-4 mr-2" />
                Bulk SMS
              </button>
              <button
                onClick={() => navigate('/sms-scheduled')}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50"
              >
                <ClockIcon className="h-4 w-4 mr-2" />
                Schedule
              </button>
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
                      {msg.is_auto_response && (
                        <span className="inline-flex items-center px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">
                          <SparklesIcon className="w-3 h-3 mr-1" />
                          AI Response
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-gray-600">
                      From: {msg.from_address} → To: {msg.to_address}
                    </p>
                    <p className="mt-1 text-sm text-gray-900">{msg.body}</p>
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
          <div className="relative mx-auto p-6 border w-full max-w-2xl shadow-lg rounded-lg bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Send SMS</h3>
              <button onClick={() => setShowComposeModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">
                ×
              </button>
            </div>
            <div className="space-y-4">
              {/* Template Selection */}
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                  <DocumentDuplicateIcon className="w-4 h-4 mr-1" />
                  Use Template (Optional)
                </label>
                <select
                  value={smsForm.template_id}
                  onChange={(e) => handleTemplateSelect(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">Select a template...</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name} {template.use_ai_enhancement && '✨'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Contact Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To (Contact) *</label>
                <select
                  value={smsForm.contact_id}
                  onChange={(e) => {
                    const contact = contacts.find(c => c.id === e.target.value);
                    setSmsForm({...smsForm, contact_id: e.target.value, to: contact?.phone || ''});
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                >
                  <option value="">Select a contact...</option>
                  {contacts.filter(c => c.phone).map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.first_name} {contact.last_name} - {contact.phone}
                    </option>
                  ))}
                </select>
              </div>

              {/* Phone Number Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  From Number (Leave empty for rotation)
                </label>
                <select
                  value={smsForm.from_number}
                  onChange={(e) => setSmsForm({...smsForm, from_number: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">Auto-select (Rotation)</option>
                  {phoneNumbers.map((number) => (
                    <option key={number.id} value={number.phone_number}>
                      {number.phone_number} {number.friendly_name && `(${number.friendly_name})`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Message Body */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
                <textarea
                  value={smsForm.body}
                  onChange={(e) => setSmsForm({...smsForm, body: e.target.value})}
                  rows={5}
                  placeholder="Type your message..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">{smsForm.body.length} characters</p>
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

      {/* Bulk SMS Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto p-6 border w-full max-w-4xl shadow-lg rounded-lg bg-white max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <UserGroupIcon className="w-6 h-6 mr-2 text-primary-600" />
                Send Bulk SMS
              </h3>
              <button onClick={() => setShowBulkModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">
                ×
              </button>
            </div>
            <div className="space-y-4">
              {/* Template Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Use Template (Optional)</label>
                <select
                  value={bulkForm.template_id}
                  onChange={(e) => handleBulkTemplateSelect(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">Select a template...</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Contact Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Contacts ({bulkForm.contact_ids.length} selected)
                </label>
                <div className="border border-gray-300 rounded-lg max-h-60 overflow-y-auto">
                  {contacts.filter(c => c.phone).map((contact) => (
                    <label
                      key={contact.id}
                      className="flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                    >
                      <input
                        type="checkbox"
                        checked={bulkForm.contact_ids.includes(contact.id)}
                        onChange={() => toggleContactSelection(contact.id)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="ml-3 text-sm">
                        {contact.first_name} {contact.last_name} - {contact.phone}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Message Body */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
                <textarea
                  value={bulkForm.body}
                  onChange={(e) => setBulkForm({...bulkForm, body: e.target.value})}
                  rows={5}
                  placeholder="Type your message..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowBulkModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkSMS}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
                >
                  Send to {bulkForm.contact_ids.length} Contacts
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
