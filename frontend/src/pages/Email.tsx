import React, { useState, useEffect } from 'react';
import { EnvelopeIcon, PlusIcon, TrashIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import EmailCompose from '../components/email/EmailCompose';
import toast from 'react-hot-toast';

interface EmailMessage {
  id: string;
  direction: 'inbound' | 'outbound';
  status: string;
  from_email: string;
  to_email: string;
  subject: string;
  body_html: string;
  sent_at: string;
  opened_at?: string;
  clicked_at?: string;
  contact_id?: string;
}

export default function Email() {
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'inbox' | 'sent' | 'all'>('inbox');
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
  const { token } = useAuth();

  useEffect(() => {
    fetchEmails();
  }, [selectedTab]);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const fetchEmails = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/emails?type=${selectedTab}`, {
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

  const deleteEmail = async (emailId: string) => {
    if (!confirm('Are you sure you want to delete this email?')) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/emails/${emailId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        setEmails(emails.filter(email => email.id !== emailId));
        toast.success('Email deleted');
        setSelectedEmail(null);
      }
    } catch (error) {
      console.error('Error deleting email:', error);
      toast.error('Failed to delete email');
    }
  };

  const markAsRead = async (emailId: string) => {
    try {
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

  const filteredEmails = emails.filter(email => {
    switch (selectedTab) {
      case 'inbox':
        return email.direction === 'inbound';
      case 'sent':
        return email.direction === 'outbound';
      default:
        return true;
    }
  });

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
                  <h1 className="text-2xl font-bold text-gray-900">Email</h1>
                  <p className="text-gray-600">Email messaging via Twilio SendGrid</p>
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

      <div className="px-4 sm:px-6 lg:max-w-7xl lg:mx-auto lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Email List */}
          <div className="lg:w-1/3">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              {/* Tabs */}
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8 px-6 py-4" aria-label="Tabs">
                  {[
                    { name: 'Inbox', value: 'inbox', count: emails.filter(e => e.direction === 'inbound').length },
                    { name: 'Sent', value: 'sent', count: emails.filter(e => e.direction === 'outbound').length },
                    { name: 'All', value: 'all', count: emails.length }
                  ].map((tab) => (
                    <button
                      key={tab.value}
                      onClick={() => setSelectedTab(tab.value as any)}
                      className={`${
                        selectedTab === tab.value
                          ? 'border-primary-500 text-primary-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
                    >
                      <span>{tab.name}</span>
                      <span className="bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs">
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </nav>
              </div>

              {/* Email List */}
              <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                {filteredEmails.length === 0 ? (
                  <div className="p-12 text-center text-gray-500">
                    <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      <EnvelopeIcon className="w-6 h-6 text-gray-400" />
                    </div>
                    <p>No emails found</p>
                  </div>
                ) : (
                  filteredEmails.map((email) => (
                    <div
                      key={email.id}
                      onClick={() => setSelectedEmail(email)}
                      className={`p-4 hover:bg-gray-50 cursor-pointer ${
                        selectedEmail?.id === email.id ? 'bg-blue-50' : ''
                      } ${!email.opened_at && email.direction === 'inbound' ? 'bg-blue-25' : ''}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className={`text-sm font-medium ${
                              email.direction === 'inbound' ? 'text-green-600' : 'text-blue-600'
                            }`}>
                              {email.direction === 'inbound' ? email.from_email : email.to_email}
                            </span>
                            {!email.opened_at && email.direction === 'inbound' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                New
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {email.subject}
                          </p>
                          <p className="text-sm text-gray-500 truncate mt-1">
                            {email.body_html.replace(/<[^>]*>/g, '')}
                          </p>
                          <p className="text-xs text-gray-400 mt-2">
                            {formatDate(email.sent_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Email Content */}
          <div className="lg:w-2/3">
            {selectedEmail ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {selectedEmail.subject}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>
                          <strong>From:</strong> {selectedEmail.from_email}
                        </span>
                        <span>
                          <strong>To:</strong> {selectedEmail.to_email}
                        </span>
                        <span>
                          <strong>Date:</strong> {formatDate(selectedEmail.sent_at)}
                        </span>
                      </div>
                      {selectedEmail.opened_at && (
                        <div className="mt-2 text-sm text-green-600">
                          ✓ Opened {formatDate(selectedEmail.opened_at)}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      {!selectedEmail.opened_at && selectedEmail.direction === 'inbound' && (
                        <button
                          onClick={() => markAsRead(selectedEmail.id)}
                          className="p-2 text-blue-500 hover:bg-blue-100 rounded-lg"
                          title="Mark as read"
                        >
                          <EyeIcon className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteEmail(selectedEmail.id)}
                        className="p-2 text-red-500 hover:bg-red-100 rounded-lg"
                        title="Delete email"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <div 
                    className="prose max-w-none"
                    dangerouslySetInnerHTML={{ __html: selectedEmail.body_html }}
                  />
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex items-center justify-center h-96">
                <div className="text-center text-gray-500">
                  <EnvelopeIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>Select an email to read</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Compose Email Modal */}
      {showComposeModal && (
        <EmailCompose onClose={() => setShowComposeModal(false)} />
      )}
    </div>
  );
}