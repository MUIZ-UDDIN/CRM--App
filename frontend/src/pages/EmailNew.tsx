import React, { useState, useEffect } from 'react';
import { EnvelopeIcon, PlusIcon, TrashIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
}

interface EmailMessage {
  id: string;
  from: string;
  to: string;
  subject: string;
  message: string;
  sent_at: string;
  status: string;
}

export default function EmailNew() {
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'inbox' | 'sent'>('inbox');
  const { token } = useAuth();
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const [emailForm, setEmailForm] = useState({
    from: '',
    to: '',
    subject: '',
    message: ''
  });

  const [searchTo, setSearchTo] = useState('');

  useEffect(() => {
    fetchEmails();
    fetchContacts();
    loadGmailConfig();
  }, [selectedTab]);

  const loadGmailConfig = () => {
    const gmailConfig = localStorage.getItem('gmailConfig');
    if (gmailConfig) {
      const config = JSON.parse(gmailConfig);
      setEmailForm(prev => ({ ...prev, from: config.email }));
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

  const fetchEmails = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/emails?type=${selectedTab}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setEmails(data);
      } else {
        setEmails([]);
      }
    } catch (error) {
      console.error('Error fetching emails:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!emailForm.from || !emailForm.to || !emailForm.subject || !emailForm.message) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/emails/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(emailForm)
      });

      if (response.ok) {
        toast.success('Email sent successfully!');
        setShowComposeModal(false);
        setEmailForm({ from: emailForm.from, to: '', subject: '', message: '' });
        fetchEmails();
      } else {
        toast.error('Failed to send email');
      }
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error('Failed to send email');
    }
  };

  const filteredContacts = contacts.filter(c =>
    c.email?.toLowerCase().includes(searchTo.toLowerCase()) ||
    `${c.first_name} ${c.last_name}`.toLowerCase().includes(searchTo.toLowerCase())
  );

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="px-4 sm:px-6 lg:max-w-7xl lg:mx-auto lg:px-8">
          <div className="py-6 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Email</h1>
              <p className="mt-1 text-sm text-gray-500">Manage your email communications</p>
            </div>
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

      {/* Email List */}
      <div className="px-4 sm:px-6 lg:max-w-7xl lg:mx-auto lg:px-8 py-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          </div>
        ) : emails.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <EnvelopeIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No emails</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by composing a new email.</p>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg divide-y divide-gray-200">
            {emails.map((email) => (
              <div key={email.id} className="p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <p className="text-sm font-medium text-gray-900">{email.subject}</p>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        email.status === 'sent' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {email.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">
                      From: {email.from} → To: {email.to}
                    </p>
                    <p className="mt-1 text-sm text-gray-500 line-clamp-2">{email.message}</p>
                    <p className="mt-1 text-xs text-gray-400">
                      {new Date(email.sent_at).toLocaleString()}
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
          <div className="relative mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Compose Email</h3>
              <button onClick={() => setShowComposeModal(false)} className="text-gray-400 hover:text-gray-600">
                ×
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
                <input
                  type="email"
                  value={emailForm.from}
                  onChange={(e) => setEmailForm({...emailForm, from: e.target.value})}
                  placeholder="your.email@gmail.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To (Contact or Email)</label>
                <input
                  type="text"
                  value={emailForm.to}
                  onChange={(e) => {
                    setEmailForm({...emailForm, to: e.target.value});
                    setSearchTo(e.target.value);
                  }}
                  placeholder="Search contact or enter email..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                {searchTo && filteredContacts.length > 0 && (
                  <div className="mt-1 max-h-40 overflow-y-auto border border-gray-300 rounded-lg bg-white shadow-lg">
                    {filteredContacts.slice(0, 5).map((contact) => (
                      <button
                        key={contact.id}
                        onClick={() => {
                          setEmailForm({...emailForm, to: contact.email});
                          setSearchTo('');
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-gray-50 text-sm border-b last:border-b-0"
                      >
                        <div className="font-medium">{contact.first_name} {contact.last_name}</div>
                        <div className="text-gray-500 text-xs">{contact.email}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <input
                  type="text"
                  value={emailForm.subject}
                  onChange={(e) => setEmailForm({...emailForm, subject: e.target.value})}
                  placeholder="Email subject"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea
                  value={emailForm.message}
                  onChange={(e) => setEmailForm({...emailForm, message: e.target.value})}
                  rows={6}
                  placeholder="Type your message..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowComposeModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendEmail}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
                >
                  Send Email
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
