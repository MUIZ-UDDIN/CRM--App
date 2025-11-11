import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChatBubbleLeftRightIcon, 
  PlusIcon, 
  SparklesIcon,
  DocumentDuplicateIcon,
  UserGroupIcon,
  ClockIcon,
  ArrowPathIcon,
  XMarkIcon,
  TrashIcon,
  EllipsisVerticalIcon,
  PhoneIcon,
  UserPlusIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { CallModal } from '../components/CallModal';
import { twilioVoiceService } from '../services/twilioVoiceService';

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  phone?: string;
  mobile?: string;
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
  read_at?: string | null;
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
  const [contactSearch, setContactSearch] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [conversationMessages, setConversationMessages] = useState<SMSMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showActionsMenu, setShowActionsMenu] = useState<string | null>(null);
  const [showCallModal, setShowCallModal] = useState(false);
  const [callToNumber, setCallToNumber] = useState('');
  const [callFromNumber, setCallFromNumber] = useState('');
  
  // Call UI state
  const [callState, setCallState] = useState<'idle' | 'ringing' | 'connecting' | 'connected' | 'ended'>('idle');
  const [currentCallNumber, setCurrentCallNumber] = useState('');
  const [currentCallName, setCurrentCallName] = useState('');
  const [showCallUI, setShowCallUI] = useState(false);
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
    from_number: '',
    use_rotation: true
  });

  useEffect(() => {
    fetchMessages();
    fetchContacts();
    fetchTemplates();
    fetchPhoneNumbers();
    
    // Initialize Twilio Device for calls
    twilioVoiceService.initialize().catch(err => {
      console.error('Failed to initialize Twilio Device:', err);
    });
    
    // Listen for incoming calls
    twilioVoiceService.onIncomingCall((call) => {
      const fromNumber = call.parameters.From;
      const contact = contacts.find(c => c.phone === fromNumber || c.mobile === fromNumber);
      
      setCurrentCallNumber(fromNumber);
      setCurrentCallName(contact ? `${contact.first_name} ${contact.last_name}` : '');
      setCallState('ringing');
      setShowCallUI(true);
    });
    
    // Listen for call ended
    twilioVoiceService.onCallEnded(() => {
      setCallState('ended');
      setTimeout(() => {
        setShowCallUI(false);
        setCallState('idle');
      }, 2000);
    });

    // Set up WebSocket for real-time SMS updates
    const WS_URL = API_BASE_URL.replace('http', 'ws').replace('https', 'wss');
    let ws: WebSocket | null = null;

    const connectWebSocket = () => {
      try {
        ws = new WebSocket(`${WS_URL}/ws?token=${token}`);
        
        ws.onopen = () => {
          console.log('SMS WebSocket connected');
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'sms_received' || data.type === 'sms_sent') {
              // Refresh messages to get the new one
              fetchMessages();
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
        };

        ws.onclose = () => {
          console.log('WebSocket disconnected, reconnecting...');
          setTimeout(connectWebSocket, 3000);
        };
      } catch (error) {
        console.error('Failed to connect WebSocket:', error);
      }
    };

    connectWebSocket();

    // Polling fallback - check for new messages every 10 seconds
    const pollInterval = setInterval(() => {
      fetchMessages();
    }, 10000);

    return () => {
      if (ws) {
        ws.close();
      }
      clearInterval(pollInterval);
    };
  }, [selectedTab, token]);

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
        setSmsForm({ to: '', body: '', template_id: '', from_number: '', use_rotation: true, contact_id: '' });
        fetchMessages();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to send SMS');
      }
    } catch (error: any) {
      // Don't log to console, just show user-friendly error
      toast.error(error.message || 'Failed to send SMS');
    }
  };

  const handleBulkSMS = async () => {
    if (bulkForm.contact_ids.length === 0 || !bulkForm.body) {
      toast.error('Please select contacts and enter a message');
      return;
    }

    try {
      let successCount = 0;
      let failCount = 0;
      const errors: string[] = [];

      const promises = bulkForm.contact_ids.map(async (contactId) => {
        const contact = contacts.find(c => c.id === contactId);
        if (!contact?.phone) return;

        try {
          const response = await fetch(`${API_BASE_URL}/api/sms/send`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              to: contact.phone,
              body: bulkForm.body,
              template_id: bulkForm.template_id,
              from_number: bulkForm.from_number,
              use_rotation: bulkForm.use_rotation,
              contact_id: contactId
            })
          });

          if (response.ok) {
            successCount++;
          } else {
            failCount++;
            const error = await response.json();
            errors.push(`${contact.first_name} ${contact.last_name}: ${error.detail}`);
          }
        } catch (err) {
          failCount++;
          errors.push(`${contact.first_name} ${contact.last_name}: Network error`);
        }
      });

      await Promise.all(promises);

      // Show appropriate message
      if (successCount > 0 && failCount === 0) {
        toast.success(`Sent ${successCount} messages successfully!`);
      } else if (successCount > 0 && failCount > 0) {
        toast.error(`Sent ${successCount} messages, ${failCount} failed. Check console for details.`);
        console.error('Failed messages:', errors);
      } else {
        toast.error(`All ${failCount} messages failed. ${errors[0] || 'Unknown error'}`);
      }

      setShowBulkModal(false);
      setBulkForm({ contact_ids: [], body: '', template_id: '', from_number: '', use_rotation: true });
      fetchMessages();
    } catch (error: any) {
      toast.error(error.message || 'Failed to send bulk SMS');
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setSmsForm({...smsForm, template_id: templateId, body: template.body});
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

  // Helper function to get contact name from phone number
  const getContactName = (phone: string): string | null => {
    const contact = contacts.find(c => c.phone === phone);
    return contact ? `${contact.first_name} ${contact.last_name}`.trim() : null;
  };

  // Helper function to get contact by phone
  const getContactByPhone = (phone: string): Contact | null => {
    return contacts.find(c => c.phone === phone) || null;
  };

  // Group messages by conversation (phone number)
  const getConversations = () => {
    const convMap = new Map<string, { phone: string; lastMessage: SMSMessage; unreadCount: number }>();
    
    messages.forEach(msg => {
      const otherPhone = msg.direction === 'inbound' ? msg.from_address : msg.to_address;
      const existing = convMap.get(otherPhone);
      
      if (!existing) {
        convMap.set(otherPhone, {
          phone: otherPhone,
          lastMessage: msg,
          unreadCount: (msg.direction === 'inbound' && msg.read_at === null) ? 1 : 0
        });
      } else {
        // Count unread inbound messages based on read_at field
        if (msg.direction === 'inbound' && msg.read_at === null) {
          existing.unreadCount++;
        }
        // Update last message if newer
        if (new Date(msg.sent_at) > new Date(existing.lastMessage.sent_at)) {
          existing.lastMessage = msg;
        }
      }
    });
    
    return Array.from(convMap.values()).sort((a, b) => 
      new Date(b.lastMessage.sent_at).getTime() - new Date(a.lastMessage.sent_at).getTime()
    );
  };

  const fetchConversationMessages = (phone: string) => {
    const filtered = messages.filter(msg => 
      msg.from_address === phone || msg.to_address === phone
    ).sort((a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime());
    
    setConversationMessages(filtered);
  };

  // Auto-update conversation when messages change
  useEffect(() => {
    if (selectedConversation) {
      fetchConversationMessages(selectedConversation);
    }
  }, [messages, selectedConversation]);

  const handleConversationClick = async (phone: string) => {
    setSelectedConversation(phone);
    fetchConversationMessages(phone);
    
    // Mark messages as read
    try {
      await fetch(`${API_BASE_URL}/api/sms/messages/mark-read?phone_number=${encodeURIComponent(phone)}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      // Refresh messages to update unread count
      fetchMessages();
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const sendQuickReply = async () => {
    if (!newMessage.trim() || !selectedConversation) return;
    
    const messageText = newMessage;
    setNewMessage(''); // Clear input immediately
    
    // Add optimistic message to UI
    const optimisticMessage: SMSMessage = {
      id: `temp-${Date.now()}`,
      body: messageText,
      direction: 'outbound',
      status: 'sent',
      sent_at: new Date().toISOString(),
      from_address: '',
      to_address: selectedConversation,
      read_at: null
    };
    setConversationMessages(prev => [...prev, optimisticMessage]);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/sms/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: selectedConversation,
          body: messageText,
          use_rotation: true
        })
      });

      if (response.ok) {
        // Refresh to get the real message from server
        fetchMessages();
        fetchConversationMessages(selectedConversation);
        toast.success('Message sent!');
      } else {
        // Remove optimistic message on error
        setConversationMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
        setNewMessage(messageText); // Restore message
        toast.error('Failed to send message');
      }
    } catch (error) {
      // Remove optimistic message on error
      setConversationMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
      setNewMessage(messageText); // Restore message
      toast.error('Failed to send message');
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!confirm('Permanently delete this message?')) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/sms/messages/${messageId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success('Message deleted');
        
        // Remove message from conversation view immediately
        setConversationMessages(prev => prev.filter(msg => msg.id !== messageId));
        
        // Refresh messages list in background
        fetchMessages();
      }
    } catch (error) {
      toast.error('Failed to delete message');
    }
  };

  const deleteConversation = async (phone: string) => {
    if (!confirm(`Permanently delete entire conversation with ${phone}?`)) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/sms/conversations/${encodeURIComponent(phone)}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success('Conversation deleted');
        setSelectedConversation(null);
        fetchMessages();
      }
    } catch (error) {
      toast.error('Failed to delete conversation');
    }
  };

  const handleCallContact = (phone: string) => {
    // Open call modal instead of navigating
    setCallToNumber(phone);
    setCallFromNumber('');
    setShowCallModal(true);
  };

  const initiateCall = async () => {
    if (!callFromNumber) {
      toast.error('Please select a number to call from');
      return;
    }

    try {
      // Format phone number
      const formatPhoneNumber = (phone: string) => {
        const digits = phone.replace(/\D/g, '');
        return digits ? `+${digits}` : phone;
      };
      
      const formattedTo = formatPhoneNumber(callToNumber);
      
      const response = await fetch(`${API_BASE_URL}/api/calls/initiate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: callFromNumber,
          to: formattedTo
        })
      });

      if (response.ok) {
        toast.success('Call initiated successfully!');
        setShowCallModal(false);
        setCallToNumber('');
        setCallFromNumber('');
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
  
  const handleAnswerCall = async () => {
    await twilioVoiceService.answerCall();
    setCallState('connected');
  };
  
  const handleRejectCall = () => {
    twilioVoiceService.rejectCall();
    setShowCallUI(false);
    setCallState('idle');
  };
  
  const handleHangupCall = () => {
    twilioVoiceService.hangupCall();
    setCallState('ended');
    setTimeout(() => {
      setShowCallUI(false);
      setCallState('idle');
    }, 2000);
  };
  
  const handleMuteCall = (muted: boolean) => {
    twilioVoiceService.muteCall(muted);
  };

  const handleAddToContacts = async (phone: string) => {
    const firstName = prompt('Enter first name:');
    if (!firstName) return;
    
    const lastName = prompt('Enter last name:');
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/contacts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName || '',
          phone: phone
        })
      });

      if (response.ok) {
        toast.success('Contact added successfully!');
        fetchContacts(); // Refresh contacts list
      } else {
        toast.error('Failed to add contact');
      }
    } catch (error) {
      toast.error('Failed to add contact');
    }
  };

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="px-4 sm:px-6 lg:max-w-7xl xl:max-w-8xl 2xl:max-w-9xl 3xl:max-w-10xl lg:mx-auto lg:px-8">
          <div className="py-4 sm:py-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 sm:gap-4">
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-gray-900 flex items-center">
                <ChatBubbleLeftRightIcon className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 mr-2 text-primary-600 flex-shrink-0" />
                <span className="truncate">SMS Messages</span>
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-gray-500 truncate">Send and receive text messages with AI-powered features</p>
            </div>
            <div className="flex flex-wrap gap-1.5 sm:gap-2 w-full lg:w-auto">
              <button
                onClick={() => navigate('/sms-templates')}
                className="inline-flex items-center px-2 sm:px-2.5 md:px-3 py-1.5 border border-gray-300 shadow-sm text-xs md:text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50"
              >
                <DocumentDuplicateIcon className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                <span className="whitespace-nowrap">Templates</span>
              </button>
              <button
                onClick={() => navigate('/sms-analytics')}
                className="inline-flex items-center px-2 sm:px-2.5 md:px-3 py-1.5 border border-gray-300 shadow-sm text-xs md:text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50"
              >
                <SparklesIcon className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                <span className="whitespace-nowrap">Analytics</span>
              </button>
              <button
                onClick={() => navigate('/sms-scheduled')}
                className="inline-flex items-center px-2 sm:px-2.5 md:px-3 py-1.5 border border-gray-300 shadow-sm text-xs md:text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50"
              >
                <ClockIcon className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                <span className="whitespace-nowrap">Scheduled</span>
              </button>
              <div className="hidden lg:block border-l border-gray-300 mx-1"></div>
              <button
                onClick={() => setShowBulkModal(true)}
                className="inline-flex items-center px-2 sm:px-2.5 md:px-3 lg:px-4 py-1.5 border border-gray-300 shadow-sm text-xs md:text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50"
              >
                <UserGroupIcon className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                <span className="whitespace-nowrap">Bulk SMS</span>
              </button>
              <button
                onClick={() => setShowComposeModal(true)}
                className="inline-flex items-center px-2 sm:px-2.5 md:px-3 lg:px-4 py-1.5 border border-transparent shadow-sm text-xs md:text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700"
              >
                <PlusIcon className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                <span className="whitespace-nowrap">New Message</span>
              </button>
            </div>
          </div>
        </div>
      </div>


      {/* Chat Interface */}
      <div className="px-4 sm:px-6 lg:max-w-7xl xl:max-w-8xl 2xl:max-w-9xl 3xl:max-w-10xl lg:mx-auto lg:px-8 py-8">
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-300px)]">
            {/* Conversations List */}
            <div className="lg:col-span-1 bg-white rounded-lg shadow overflow-y-auto">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Conversations</h3>
              </div>
              <div className="divide-y divide-gray-200">
                {getConversations().map((conv) => {
                  const contactName = getContactName(conv.phone);
                  const contact = getContactByPhone(conv.phone);
                  
                  return (
                  <div
                    key={conv.phone}
                    className={`p-4 hover:bg-gray-50 transition-colors relative ${
                      selectedConversation === conv.phone ? 'bg-primary-50 border-l-4 border-primary-500' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div 
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => handleConversationClick(conv.phone)}
                      >
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {contactName || conv.phone}
                          </p>
                          {contactName && (
                            <span className="text-xs text-gray-400">{conv.phone}</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 truncate mt-1">
                          {conv.lastMessage.body}
                        </p>
                      </div>
                      <div className="ml-2 flex items-center gap-2">
                        <div className="flex flex-col items-end">
                          <p className="text-xs text-gray-400">
                            {new Date(conv.lastMessage.sent_at).toLocaleDateString()}
                          </p>
                          {conv.unreadCount > 0 && (
                            <span className="mt-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                        {/* 3-Dot Menu */}
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowActionsMenu(showActionsMenu === conv.phone ? null : conv.phone);
                            }}
                            className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                          >
                            <EllipsisVerticalIcon className="h-5 w-5 text-gray-500" />
                          </button>
                          
                          {/* Dropdown Menu */}
                          {showActionsMenu === conv.phone && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                              <div className="py-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCallContact(conv.phone);
                                    setShowActionsMenu(null);
                                  }}
                                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                  <PhoneIcon className="h-4 w-4 mr-2" />
                                  Call
                                </button>
                                {!contact && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAddToContacts(conv.phone);
                                      setShowActionsMenu(null);
                                    }}
                                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                  >
                                    <UserPlusIcon className="h-4 w-4 mr-2" />
                                    Add to Contacts
                                  </button>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteConversation(conv.phone);
                                    setShowActionsMenu(null);
                                  }}
                                  className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                                >
                                  <TrashIcon className="h-4 w-4 mr-2" />
                                  Delete Conversation
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>

            {/* Chat Messages */}
            <div className="lg:col-span-2 bg-white rounded-lg shadow flex flex-col">
              {selectedConversation ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {getContactName(selectedConversation) || selectedConversation}
                      </h3>
                      {getContactName(selectedConversation) && (
                        <p className="text-xs text-gray-400">{selectedConversation}</p>
                      )}
                      <p className="text-sm text-gray-500">{conversationMessages.length} messages</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {/* 3-Dot Menu */}
                      <div className="relative">
                        <button
                          onClick={() => setShowActionsMenu(showActionsMenu === 'chat-header' ? null : 'chat-header')}
                          className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                        >
                          <EllipsisVerticalIcon className="h-6 w-6 text-gray-500" />
                        </button>
                        
                        {/* Dropdown Menu */}
                        {showActionsMenu === 'chat-header' && (
                          <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                            <div className="py-1">
                              <button
                                onClick={() => {
                                  handleCallContact(selectedConversation);
                                  setShowActionsMenu(null);
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                <PhoneIcon className="h-4 w-4 mr-2" />
                                Call
                              </button>
                              {!getContactByPhone(selectedConversation) && (
                                <button
                                  onClick={() => {
                                    handleAddToContacts(selectedConversation);
                                    setShowActionsMenu(null);
                                  }}
                                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                  <UserPlusIcon className="h-4 w-4 mr-2" />
                                  Add to Contacts
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  deleteConversation(selectedConversation);
                                  setShowActionsMenu(null);
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                              >
                                <TrashIcon className="h-4 w-4 mr-2" />
                                Delete Conversation
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => setSelectedConversation(null)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <XMarkIcon className="w-6 h-6" />
                      </button>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {(() => {
                      // Group messages by date
                      const groupedMessages: { [key: string]: SMSMessage[] } = {};
                      conversationMessages.forEach(msg => {
                        const date = new Date(msg.sent_at);
                        const dateKey = date.toDateString();
                        if (!groupedMessages[dateKey]) {
                          groupedMessages[dateKey] = [];
                        }
                        groupedMessages[dateKey].push(msg);
                      });

                      // Helper function to format date label
                      const getDateLabel = (dateString: string) => {
                        const date = new Date(dateString);
                        const today = new Date();
                        const yesterday = new Date(today);
                        yesterday.setDate(yesterday.getDate() - 1);

                        if (date.toDateString() === today.toDateString()) {
                          return 'Today';
                        } else if (date.toDateString() === yesterday.toDateString()) {
                          return 'Yesterday';
                        } else {
                          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
                        }
                      };

                      return Object.keys(groupedMessages).sort((a, b) => new Date(a).getTime() - new Date(b).getTime()).map(dateKey => (
                        <div key={dateKey}>
                          {/* Date Separator */}
                          <div className="flex items-center justify-center my-4">
                            <div className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full">
                              {getDateLabel(dateKey)}
                            </div>
                          </div>
                          
                          {/* Messages for this date */}
                          {groupedMessages[dateKey].map((msg) => (
                            <div
                              key={msg.id}
                              className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'} mb-2`}
                            >
                              <div className={`max-w-xs lg:max-w-md xl:max-w-lg ${
                                msg.direction === 'outbound' ? 'bg-primary-500 text-white' : 'bg-gray-200 text-gray-900'
                              } rounded-lg px-4 py-2 shadow`}>
                                <p className="text-sm">{msg.body}</p>
                                <div className="flex items-center justify-between mt-1 space-x-2">
                                  <p className={`text-xs ${msg.direction === 'outbound' ? 'text-primary-100' : 'text-gray-500'}`}>
                                    {new Date(msg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                  <button
                                    onClick={() => deleteMessage(msg.id)}
                                    className={`text-xs ${msg.direction === 'outbound' ? 'text-primary-100 hover:text-white' : 'text-gray-500 hover:text-red-600'}`}
                                  >
                                    <TrashIcon className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ));
                    })()}
                  </div>

                  {/* Quick Reply Input */}
                  <div className="p-4 border-t border-gray-200">
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendQuickReply()}
                        placeholder="Type a message..."
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                      <button
                        onClick={sendQuickReply}
                        disabled={!newMessage.trim()}
                        className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Send
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <ChatBubbleLeftRightIcon className="mx-auto h-12 w-12 mb-4" />
                    <p>Select a conversation to start chatting</p>
                  </div>
                </div>
              )}
            </div>
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

              {/* From Number Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Number *</label>
                <select
                  value={bulkForm.from_number}
                  onChange={(e) => setBulkForm({...bulkForm, from_number: e.target.value})}
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
                <p className="mt-1 text-xs text-gray-500">
                  Note: US/Canada numbers can only send to US/Canada. Enable geographic permissions in Twilio for other regions.
                </p>
              </div>

              {/* Contact Selection with Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Contacts ({bulkForm.contact_ids.length} selected)
                </label>
                <input
                  type="text"
                  placeholder="Search contacts..."
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-t-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                />
                <div className="border border-t-0 border-gray-300 rounded-b-lg max-h-60 overflow-y-auto">
                  {contacts.filter(c => 
                    c.phone && (
                      contactSearch === '' ||
                      `${c.first_name} ${c.last_name}`.toLowerCase().includes(contactSearch.toLowerCase()) ||
                      c.phone.includes(contactSearch)
                    )
                  ).map((contact) => (
                    <label
                      key={contact.id}
                      className="flex items-center p-2 sm:p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                    >
                      <input
                        type="checkbox"
                        checked={bulkForm.contact_ids.includes(contact.id)}
                        onChange={() => toggleContactSelection(contact.id)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 flex-shrink-0"
                      />
                      <span className="ml-2 sm:ml-3 text-xs sm:text-sm truncate">
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

      {/* Call Modal */}
      {showCallModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Call {getContactName(callToNumber) || callToNumber}
              </h3>
              <button onClick={() => setShowCallModal(false)} className="text-gray-400 hover:text-gray-600">
                ×
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Calling To:</label>
                <input
                  type="text"
                  value={callToNumber}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Your Number *</label>
                <select
                  value={callFromNumber}
                  onChange={(e) => setCallFromNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="">Select a number...</option>
                  {phoneNumbers.map((num) => (
                    <option key={num.id} value={num.phone_number}>
                      {num.phone_number} {num.friendly_name ? `(${num.friendly_name})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowCallModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={initiateCall}
                  disabled={!callFromNumber}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <PhoneIcon className="h-4 w-4 inline mr-2" />
                  Call Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Call Modal */}
      <CallModal
        isOpen={showCallUI}
        callState={callState}
        contactName={currentCallName}
        contactNumber={currentCallNumber}
        isIncoming={callState === 'ringing' && currentCallNumber !== callToNumber}
        onAnswer={handleAnswerCall}
        onReject={handleRejectCall}
        onHangup={handleHangupCall}
        onMute={handleMuteCall}
      />

    </div>
  );
}
