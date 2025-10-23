import React, { useState, useEffect } from 'react';
import { ChatBubbleLeftIcon, EnvelopeIcon, PhoneIcon, EyeIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  message_type: 'sms' | 'email' | 'voice';
  direction: 'inbound' | 'outbound';
  status: string;
  from_address: string;
  to_address: string;
  subject?: string;
  body: string;
  sent_at: string;
  read_at?: string;
  duration?: number; // For voice calls
  recording_url?: string; // For voice calls
}

interface InboxViewProps {
  activeTab: 'all' | 'sms' | 'email' | 'voice';
}

const InboxView: React.FC<InboxViewProps> = ({ activeTab }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  useEffect(() => {
    fetchMessages();
  }, [activeTab]);

  const fetchMessages = async () => {
    try {
      let endpoint = '/api/inbox/';
      
      if (activeTab === 'sms') endpoint = '/api/inbox/sms';
      else if (activeTab === 'email') endpoint = '/api/inbox/emails';
      else if (activeTab === 'voice') endpoint = '/api/inbox/voice';

      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      } else {
        // No messages available
        setMessages([]);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_BASE_URL}/api/inbox/${messageId}/mark-read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        fetchMessages(); // Refresh messages
        toast.success('Message marked as read');
      }
    } catch (error) {
      console.error('Error marking message as read:', error);
      toast.error('Failed to mark message as read');
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return;
    
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_BASE_URL}/api/inbox/${messageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        fetchMessages(); // Refresh messages
        toast.success('Message deleted');
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Failed to delete message');
    }
  };

  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'sms':
        return <ChatBubbleLeftIcon className="w-5 h-5" />;
      case 'email':
        return <EnvelopeIcon className="w-5 h-5" />;
      case 'voice':
        return <PhoneIcon className="w-5 h-5" />;
      default:
        return <ChatBubbleLeftIcon className="w-5 h-5" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">

      {/* Messages List */}
      <div className="divide-y divide-gray-200">
        {messages.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <EnvelopeIcon className="w-6 h-6 text-gray-400" />
            </div>
            <p>No messages found</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`p-4 hover:bg-gray-50 ${
                !message.read_at ? 'bg-blue-50' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className={`p-2 rounded-full ${
                    message.message_type === 'sms' ? 'bg-green-100 text-green-600' :
                    message.message_type === 'email' ? 'bg-blue-100 text-blue-600' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {getMessageIcon(message.message_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
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
                    {message.subject && (
                      <h4 className="text-sm font-medium text-gray-900 mb-1">
                        {message.subject}
                      </h4>
                    )}
                    
                    {message.message_type === 'voice' ? (
                      <div className="space-y-2">
                        <p className="text-sm text-gray-600">
                          {message.body}
                        </p>
                        <div className="flex items-center space-x-3">
                          <span className={`text-sm font-medium ${
                            message.status === 'completed' ? 'text-green-600' :
                            message.status === 'missed' ? 'text-red-600' :
                            'text-gray-600'
                          }`}>
                            {message.status === 'completed' ? 'Call Completed' :
                             message.status === 'missed' ? 'Missed Call' :
                             message.status}
                          </span>
                          {message.duration && message.duration > 0 && (
                            <>
                              <span className="text-gray-400">•</span>
                              <span className="text-sm text-gray-600">
                                {formatDuration(message.duration)}
                              </span>
                            </>
                          )}
                          {message.recording_url && (
                            <>
                              <span className="text-gray-400">•</span>
                              <button 
                                className="text-sm text-primary-600 hover:text-primary-800 font-medium"
                                onClick={() => window.open(message.recording_url, '_blank')}
                              >
                                🎵 Play Recording
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-600 truncate">
                        {message.body}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {!message.read_at && (
                    <button
                      onClick={() => markAsRead(message.id)}
                      className="p-1 text-blue-500 hover:bg-blue-100 rounded"
                      title="Mark as read"
                    >
                      <EyeIcon className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteMessage(message.id)}
                    className="p-1 text-red-500 hover:bg-red-100 rounded"
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
  );
};

export default InboxView;
