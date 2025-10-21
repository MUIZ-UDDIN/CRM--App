import React, { useState, useEffect } from 'react';
import { EnvelopeIcon, PlusIcon, TrashIcon, EyeIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import SearchableSelect from '../components/common/SearchableSelect';

interface Email {
  id: string;
  direction: 'inbound' | 'outbound';
  status: string;
  from_address: string;
  to_address: string;
  subject: string;
  body: string;
  sent_at: string;
  read_at?: string;
}

export default function Inbox() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [composeForm, setComposeForm] = useState({
    to: '',
    subject: '',
    body: ''
  });
  const [contactEmails, setContactEmails] = useState<string[]>([]);
  const [showEmailSuggestions, setShowEmailSuggestions] = useState(false);
  const [twilioEmails, setTwilioEmails] = useState<string[]>([]);
  const [fromEmail, setFromEmail] = useState('');
  const { token } = useAuth();

  useEffect(() => {
    fetchEmails();
    fetchContactEmails();
    loadTwilioEmails();
  }, []);

  const loadTwilioEmails = () => {
    // Load Twilio emails from localStorage (configured in settings)
    const twilioConfig = localStorage.getItem('twilioConfig');
    if (twilioConfig) {
      try {
        const config = JSON.parse(twilioConfig);
        // In real implementation, this would fetch from Twilio API
        // For now, use configured email
        if (config.email) {
          setTwilioEmails([config.email]);
          setFromEmail(config.email);
        }
      } catch (error) {
        console.error('Failed to load Twilio config:', error);
      }
    }
  };

  const fetchContactEmails = async () => {
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_BASE_URL}/api/contacts`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const contacts = await response.json();
        const emails = contacts.map((c: any) => c.email).filter((e: string) => e);
        setContactEmails(emails);
      }
    } catch (error) {
      console.error('Error fetching contact emails:', error);
    }
  };

  const fetchEmails = async () => {
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_BASE_URL}/api/emails`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setEmails(data);
      } else {
        setEmails([]);
      }
    } catch (error) {
      console.error('Error fetching emails:', error);
      toast.error('Failed to load emails');
    } finally {
      setLoading(false);
    }
  };

  const sendEmail = async () => {
    if (!composeForm.to.trim() || !composeForm.subject.trim() || !composeForm.body.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_BASE_URL}/api/emails/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(composeForm)
      });

      if (response.ok) {
        toast.success('Email sent successfully');
        setShowComposeModal(false);
        setComposeForm({ to: '', subject: '', body: '' });
        fetchEmails();
      } else {
        toast.error('Failed to send email');
      }
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error('Failed to send email');
    }
  };

  const deleteEmail = async (emailId: string) => {
    if (!confirm('Are you sure you want to delete this email?')) return;
    
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_BASE_URL}/api/emails/${emailId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        setEmails(emails.filter(email => email.id !== emailId));
        toast.success('Email deleted');
      }
    } catch (error) {
      console.error('Error deleting email:', error);
      toast.error('Failed to delete email');
    }
  };

  const markAsRead = async (emailId: string) => {
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_BASE_URL}/api/emails/${emailId}/mark-read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        fetchEmails();
        toast.success('Email marked as read');
      }
    } catch (error) {
      console.error('Error marking email as read:', error);
      toast.error('Failed to mark email as read');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
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
          <div className="py-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center space-x-3">
                <EnvelopeIcon className="w-8 h-8 text-primary-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Email Inbox</h1>
                  <p className="text-gray-600">Email communications via Twilio SendGrid</p>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowComposeModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Compose Email
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Emails List */}
      <div className="px-4 sm:px-6 lg:max-w-7xl lg:mx-auto lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="divide-y divide-gray-200">
            {emails.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <EnvelopeIcon className="w-6 h-6 text-gray-400" />
                </div>
                <p>No emails found</p>
              </div>
            ) : (
              emails.map((email) => (
                <div
                  key={email.id}
                  className={`p-6 hover:bg-gray-50 ${
                    !email.read_at ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className={`p-3 rounded-full ${
                        email.direction === 'inbound' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
                      }`}>
                        <EnvelopeIcon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className={`text-sm font-medium ${
                            email.direction === 'inbound' ? 'text-blue-600' : 'text-green-600'
                          }`}>
                            {email.direction === 'inbound' ? 'From' : 'To'}: {
                              email.direction === 'inbound' ? email.from_address : email.to_address
                            }
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatDate(email.sent_at)}
                          </span>
                          {!email.read_at && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              New
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-medium text-gray-900 mb-1">
                          {email.subject}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {email.body}
                        </p>
                        <div className="mt-2 flex items-center space-x-4">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            email.status === 'delivered' ? 'bg-green-100 text-green-800' :
                            email.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {email.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {!email.read_at && (
                        <button
                          onClick={() => markAsRead(email.id)}
                          className="p-2 text-blue-500 hover:bg-blue-100 rounded-lg"
                          title="Mark as read"
                        >
                          <EyeIcon className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteEmail(email.id)}
                        className="p-2 text-red-500 hover:bg-red-100 rounded-lg"
                        title="Delete email"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      
      {/* Compose Modal */}
      {showComposeModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Compose New Message</h3>
              <button 
                onClick={() => setShowComposeModal(false)} 
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <SearchableSelect
                label="From (Twilio Email)"
                options={twilioEmails}
                value={fromEmail}
                onChange={setFromEmail}
                placeholder="Search Twilio emails or enter manually..."
                allowCustom={true}
              />
              
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                <input 
                  type="text" 
                  placeholder="Email address"
                  value={composeForm.to}
                  onChange={(e) => {
                    setComposeForm({...composeForm, to: e.target.value});
                    setShowEmailSuggestions(e.target.value.length > 0);
                  }}
                  onFocus={() => setShowEmailSuggestions(composeForm.to.length > 0)}
                  onBlur={() => setTimeout(() => setShowEmailSuggestions(false), 200)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500" 
                />
                {showEmailSuggestions && contactEmails.filter(email => 
                  email.toLowerCase().includes(composeForm.to.toLowerCase())
                ).length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {contactEmails
                      .filter(email => email.toLowerCase().includes(composeForm.to.toLowerCase()))
                      .slice(0, 10)
                      .map((email, index) => (
                        <div
                          key={index}
                          onClick={() => {
                            setComposeForm({...composeForm, to: email});
                            setShowEmailSuggestions(false);
                          }}
                          className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                        >
                          {email}
                        </div>
                      ))}
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject (Email only)</label>
                <input 
                  type="text" 
                  placeholder="Subject line"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500" 
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea 
                  rows={4}
                  placeholder="Type your message here..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                ></textarea>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowComposeModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
                >
                  Send Message
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
