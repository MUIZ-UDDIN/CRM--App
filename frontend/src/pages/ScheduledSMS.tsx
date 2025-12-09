import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClockIcon, PlusIcon, TrashIcon, CalendarIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  phone?: string;
}

interface ScheduledSMS {
  id: string;
  to_address: string;
  body: string;
  scheduled_at: string;
  is_sent: boolean;
  is_cancelled: boolean;
  error_message?: string;
  created_at: string;
}

interface SMSTemplate {
  id: string;
  name: string;
  body: string;
}

interface PhoneNumber {
  id: string;
  phone_number: string;
  friendly_name?: string;
  is_active: boolean;
}

export default function ScheduledSMS() {
  const navigate = useNavigate();
  const [scheduledMessages, setScheduledMessages] = useState<ScheduledSMS[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [templates, setTemplates] = useState<SMSTemplate[]>([]);
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const { token } = useAuth();
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const [formData, setFormData] = useState({
    contact_id: '',
    to: '',
    from_number: '',
    body: '',
    template_id: '',
    scheduled_date: '',
    scheduled_time: ''
  });

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showModal]);

  useEffect(() => {
    fetchScheduledMessages();
    fetchContacts();
    fetchTemplates();
    fetchPhoneNumbers();
    
    // Auto-refresh scheduled messages every 30 seconds
    const interval = setInterval(() => {
      fetchScheduledMessages();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchScheduledMessages = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/sms/scheduled`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setScheduledMessages(data);
      }
    } catch (error) {
      console.error('Error fetching scheduled messages:', error);
      toast.error('Failed to load scheduled messages');
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
        setContacts(data.filter((c: Contact) => c.phone));
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/sms/templates`, {
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
      const response = await fetch(`${API_BASE_URL}/api/sms/phone-numbers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        const activeNumbers = data.filter((num: PhoneNumber) => num.is_active);
        setPhoneNumbers(activeNumbers);
        // Set first number as default
        if (activeNumbers.length > 0 && !formData.from_number) {
          setFormData(prev => ({ ...prev, from_number: activeNumbers[0].phone_number }));
        }
      }
    } catch (error) {
      console.error('Error fetching phone numbers:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.from_number || !formData.to || !formData.body || !formData.scheduled_date || !formData.scheduled_time) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Combine date and time into ISO format
    const scheduledAt = new Date(`${formData.scheduled_date}T${formData.scheduled_time}`).toISOString();

    try {
      const response = await fetch(`${API_BASE_URL}/api/sms/scheduled`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from_number: formData.from_number,
          to: formData.to,
          body: formData.body,
          contact_id: formData.contact_id || null,
          template_id: formData.template_id || null,
          scheduled_at: scheduledAt
        })
      });

      if (response.ok) {
        toast.success('SMS scheduled successfully!');
        setShowModal(false);
        resetForm();
        fetchScheduledMessages();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to schedule SMS');
      }
    } catch (error) {
      console.error('Error scheduling SMS:', error);
      toast.error('Failed to schedule SMS');
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this scheduled message?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/sms/scheduled/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast.success('Scheduled message cancelled');
        fetchScheduledMessages();
      } else {
        toast.error('Failed to cancel message');
      }
    } catch (error) {
      console.error('Error cancelling message:', error);
      toast.error('Failed to cancel message');
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setFormData({ ...formData, template_id: templateId, body: template.body });
    }
  };

  const handleContactSelect = (contactId: string) => {
    const contact = contacts.find(c => c.id === contactId);
    if (contact) {
      setFormData({ ...formData, contact_id: contactId, to: contact.phone || '' });
    }
  };

  const resetForm = () => {
    const defaultFromNumber = phoneNumbers.length > 0 ? phoneNumbers[0].phone_number : '';
    setFormData({
      contact_id: '',
      to: '',
      from_number: defaultFromNumber,
      body: '',
      template_id: '',
      scheduled_date: '',
      scheduled_time: ''
    });
  };

  const getMinDateTime = () => {
    const now = new Date();
    return now.toISOString().slice(0, 16);
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
        <div className="px-4 sm:px-6 lg:max-w-7xl xl:max-w-8xl 2xl:max-w-9xl 3xl:max-w-10xl lg:mx-auto lg:px-8">
          <div className="py-4 sm:py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
              <button
                onClick={() => navigate('/sms')}
                className="p-2 hover:bg-gray-100 rounded-lg flex-shrink-0"
              >
                <ArrowLeftIcon className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
              </button>
              <ClockIcon className="w-6 h-6 sm:w-8 sm:h-8 text-primary-600 flex-shrink-0" />
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-gray-900 truncate">Scheduled SMS</h1>
                <p className="text-xs sm:text-sm text-gray-600 truncate">Schedule messages to be sent later</p>
              </div>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center px-3 sm:px-4 py-2 border border-transparent rounded-lg shadow-sm text-xs sm:text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 flex-shrink-0"
            >
              <PlusIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
              <span className="whitespace-nowrap">Schedule Message</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6 lg:max-w-7xl xl:max-w-8xl 2xl:max-w-9xl 3xl:max-w-10xl lg:mx-auto lg:px-8 py-8">
        {scheduledMessages.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
            <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No scheduled messages</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by scheduling a new message.</p>
            <div className="mt-6">
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                Schedule Message
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg divide-y divide-gray-200">
            {scheduledMessages.map((msg) => (
              <div key={msg.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <CalendarIcon className="w-5 h-5 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">
                        {new Date(msg.scheduled_at).toLocaleString()}
                      </span>
                      {msg.is_sent ? (
                        <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                          Sent
                        </span>
                      ) : msg.is_cancelled ? (
                        <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
                          Cancelled
                        </span>
                      ) : new Date(msg.scheduled_at) <= new Date() ? (
                        <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                          Sending...
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                          Pending
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      <strong>To:</strong> {msg.to_address}
                    </p>
                    <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">
                      {msg.body}
                    </p>
                    {msg.error_message && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-xs text-red-700">
                          <strong>Error:</strong> {msg.error_message}
                        </p>
                      </div>
                    )}
                    <p className="mt-2 text-xs text-gray-400">
                      Created: {new Date(msg.created_at).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleCancel(msg.id)}
                    className="ml-4 inline-flex items-center px-3 py-2 border border-red-300 rounded-lg text-sm font-medium text-red-700 hover:bg-red-50"
                  >
                    <TrashIcon className="w-4 h-4 mr-1" />
                    Cancel
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Schedule Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto p-4 sm:p-6 border w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-lg rounded-lg bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base sm:text-lg font-medium text-gray-900 flex items-center">
                <ClockIcon className="w-6 h-6 mr-2 text-primary-600" />
                Schedule SMS
              </h3>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="text-gray-400 hover:text-gray-600 text-2xl">
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* From Number Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">From Number *</label>
                <select
                  value={formData.from_number}
                  onChange={(e) => setFormData({...formData, from_number: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                >
                  <option value="">Select a number...</option>
                  {phoneNumbers.map((num) => (
                    <option key={num.id} value={num.phone_number}>
                      {num.phone_number} {num.friendly_name ? `(${num.friendly_name})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Template Selection */}
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                  Use Template (Optional)
                </label>
                <select
                  value={formData.template_id}
                  onChange={(e) => handleTemplateSelect(e.target.value)}
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
                <label className="block text-sm font-medium text-gray-700 mb-2">To (Contact) *</label>
                <select
                  value={formData.contact_id}
                  onChange={(e) => handleContactSelect(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                >
                  <option value="">Select a contact...</option>
                  {contacts.map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.first_name} {contact.last_name} - {contact.phone}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date *</label>
                  <input
                    type="date"
                    value={formData.scheduled_date}
                    onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                    onClick={(e) => e.currentTarget.showPicker?.()}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent cursor-pointer"
                    style={{ colorScheme: 'light' }}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Time *</label>
                  <input
                    type="time"
                    value={formData.scheduled_time}
                    onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                    onClick={(e) => e.currentTarget.showPicker?.()}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent cursor-pointer"
                    style={{ colorScheme: 'light' }}
                    required
                  />
                </div>
              </div>

              {/* Message Body */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Message *</label>
                <textarea
                  value={formData.body}
                  onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                  rows={5}
                  placeholder="Type your message..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">{formData.body.length} characters</p>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
                >
                  Schedule SMS
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
