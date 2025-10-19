import React, { useState, useEffect } from 'react';
import { ChatBubbleLeftIcon, PlusIcon, TrashIcon, EyeIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface SMSMessage {
  id: string;
  direction: 'inbound' | 'outbound';
  status: string;
  from_address: string;
  to_address: string;
  body: string;
  sent_at: string;
  read_at?: string;
}

export default function SMS() {
  const [messages, setMessages] = useState<SMSMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [composeForm, setComposeForm] = useState({
    to: '',
    message: ''
  });
  const { token } = useAuth();

  useEffect(() => {
    fetchSMSMessages();
  }, []);

  const fetchSMSMessages = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/sms/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      } else {
        // Mock data for development
        setMessages([
          {
            id: '1',
            direction: 'inbound',
            status: 'delivered',
            from_address: '+1234567890',
            to_address: '+0987654321',
            body: 'Hi, I am interested in your services. Can you call me?',
            sent_at: new Date().toISOString()
          },
          {
            id: '2',
            direction: 'outbound',
            status: 'delivered',
            from_address: '+0987654321',
            to_address: '+1555123456',
            body: 'Hi! I saw you called. What can I help you with?',
            sent_at: new Date(Date.now() - 6000000).toISOString()
          },
          {
            id: '3',
            direction: 'inbound',
            status: 'delivered',
            from_address: '+1555987654',
            to_address: '+0987654321',
            body: 'When can we schedule a demo?',
            sent_at: new Date(Date.now() - 12000000).toISOString()
          }
        ]);
      }
    } catch (error) {
      console.error('Error fetching SMS messages:', error);
      toast.error('Failed to load SMS messages');
    } finally {
      setLoading(false);
    }
  };

  const sendSMS = async () => {
    if (!composeForm.to.trim() || !composeForm.message.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      const response = await fetch(`http://localhost:8000/api/sms/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: composeForm.to,
          body: composeForm.message
        })
      });

      if (response.ok) {
        toast.success('SMS sent successfully');
        setShowComposeModal(false);
        setComposeForm({ to: '', message: '' });
        fetchSMSMessages();
      } else {
        toast.error('Failed to send SMS');
      }
    } catch (error) {
      console.error('Error sending SMS:', error);
      toast.error('Failed to send SMS');
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return;
    
    try {
      const response = await fetch(`http://localhost:8000/api/sms/messages/${messageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        setMessages(messages.filter(msg => msg.id !== messageId));
        toast.success('Message deleted');
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Failed to delete message');
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/sms/messages/${messageId}/mark-read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        fetchSMSMessages();
        toast.success('Message marked as read');
      }
    } catch (error) {
      console.error('Error marking message as read:', error);
      toast.error('Failed to mark message as read');
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
                <ChatBubbleLeftIcon className="w-8 h-8 text-primary-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">SMS Messages</h1>
                  <p className="text-gray-600">Text messaging via Twilio SMS</p>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowComposeModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Send SMS
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Messages List */}
      <div className="px-4 sm:px-6 lg:max-w-7xl lg:mx-auto lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="divide-y divide-gray-200">
            {messages.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <ChatBubbleLeftIcon className="w-6 h-6 text-gray-400" />
                </div>
                <p>No SMS messages found</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`p-6 hover:bg-gray-50 ${
                    !message.read_at ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className={`p-3 rounded-full ${
                        message.direction === 'inbound' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                      }`}>
                        <ChatBubbleLeftIcon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className={`text-sm font-medium ${
                            message.direction === 'inbound' ? 'text-green-600' : 'text-blue-600'
                          }`}>
                            {message.direction === 'inbound' ? 'From' : 'To'}: {
                              message.direction === 'inbound' ? message.from_address : message.to_address
                            }
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatDate(message.sent_at)}
                          </span>
                          {!message.read_at && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              New
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-900">
                          {message.body}
                        </p>
                        <div className="mt-2 flex items-center space-x-4">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            message.status === 'delivered' ? 'bg-green-100 text-green-800' :
                            message.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {message.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {!message.read_at && (
                        <button
                          onClick={() => markAsRead(message.id)}
                          className="p-2 text-blue-500 hover:bg-blue-100 rounded-lg"
                          title="Mark as read"
                        >
                          <EyeIcon className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteMessage(message.id)}
                        className="p-2 text-red-500 hover:bg-red-100 rounded-lg"
                        title="Delete message"
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

      {/* Compose SMS Modal */}
      {showComposeModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto p-6 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Send SMS Message</h3>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To Phone Number</label>
                <input 
                  type="tel" 
                  placeholder="+1234567890"
                  value={composeForm.to}
                  onChange={(e) => setComposeForm({...composeForm, to: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500" 
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea 
                  rows={4}
                  placeholder="Type your message here..."
                  value={composeForm.message}
                  onChange={(e) => setComposeForm({...composeForm, message: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                  maxLength={160}
                ></textarea>
                <div className="text-right text-xs text-gray-500 mt-1">
                  {composeForm.message.length}/160
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowComposeModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={sendSMS}
                  disabled={!composeForm.to.trim() || !composeForm.message.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
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