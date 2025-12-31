import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  UserCircleIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  CheckIcon,
  CheckCircleIcon,
  TrashIcon,
  EllipsisVerticalIcon,
} from '@heroicons/react/24/outline';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/api';

interface UserInfo {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url?: string;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender?: UserInfo;
  content: string;
  status: string;
  is_read: boolean;
  created_at: string;
}

interface Conversation {
  id: string;
  other_participant: UserInfo;
  last_message_at?: string;
  last_message_preview?: string;
  unread_count: number;
  created_at: string;
}

export default function Chat() {
  const { user, token } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [teammates, setTeammates] = useState<UserInfo[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserInfo | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [showMessageMenu, setShowMessageMenu] = useState<string | null>(null);
  const [showConversationMenu, setShowConversationMenu] = useState<string | null>(null);
  const [deletingMessage, setDeletingMessage] = useState(false);
  const [deletingConversation, setDeletingConversation] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);

  // All users including Super Admin can access chat for their own company

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchConversations = useCallback(async () => {
    if (!token) return;
    
    try {
      const response = await axios.get(`${API_URL}/chat/conversations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConversations(response.data);
    } catch (error: any) {
      if (error.response?.status === 403) {
        toast.error('Chat is not available for your role');
      }
    }
  }, [token]);

  const fetchTeammates = useCallback(async () => {
    if (!token) return;
    
    try {
      const response = await axios.get(`${API_URL}/chat/teammates`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTeammates(response.data);
    } catch (error) {
      console.error('Failed to fetch teammates:', error);
    }
  }, [token]);

  const fetchMessages = useCallback(async (userId: string) => {
    if (!token) return;
    
    try {
      const response = await axios.get(`${API_URL}/chat/conversations/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(response.data.messages);
      setSelectedUser(response.data.other_participant);
      // Refresh conversations to update unread counts
      fetchConversations();
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      toast.error('Failed to load messages');
    }
  }, [token, fetchConversations]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchConversations(), fetchTeammates()]).finally(() => {
      setLoading(false);
    });
  }, [fetchConversations, fetchTeammates]);

  // Poll for new messages every 5 seconds
  useEffect(() => {
    if (!selectedConversation) return;
    
    const interval = setInterval(() => {
      fetchMessages(selectedConversation);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [selectedConversation, fetchMessages]);

  const handleSelectConversation = (conv: Conversation) => {
    setSelectedConversation(conv.other_participant.id);
    setSelectedUser(conv.other_participant);
    fetchMessages(conv.other_participant.id);
    setShowNewChat(false);
  };

  const handleStartNewChat = (teammate: UserInfo) => {
    setSelectedConversation(teammate.id);
    setSelectedUser(teammate);
    fetchMessages(teammate.id);
    setShowNewChat(false);
    setSearchQuery('');
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || sendingMessage) return;
    
    setSendingMessage(true);
    try {
      const response = await axios.post(
        `${API_URL}/chat/conversations/${selectedConversation}/messages`,
        { content: newMessage.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setMessages(prev => [...prev, response.data]);
      setNewMessage('');
      fetchConversations(); // Refresh conversation list
      messageInputRef.current?.focus();
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (deletingMessage) return;
    
    if (!confirm('Are you sure you want to permanently delete this message? This cannot be undone.')) {
      return;
    }
    
    setDeletingMessage(true);
    try {
      await axios.delete(`${API_URL}/chat/messages/${messageId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessages(prev => prev.filter(m => m.id !== messageId));
      toast.success('Message deleted');
      setShowMessageMenu(null);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to delete message');
    } finally {
      setDeletingMessage(false);
    }
  };

  const handleDeleteConversation = async (userId: string) => {
    if (deletingConversation) return;
    
    if (!confirm('Are you sure you want to permanently delete this entire conversation? All messages will be lost and this cannot be undone.')) {
      return;
    }
    
    setDeletingConversation(true);
    try {
      await axios.delete(`${API_URL}/chat/conversations/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Remove from conversations list
      setConversations(prev => prev.filter(c => c.other_participant.id !== userId));
      
      // Clear selected conversation if it was the deleted one
      if (selectedConversation === userId) {
        setSelectedConversation(null);
        setSelectedUser(null);
        setMessages([]);
      }
      
      toast.success('Conversation deleted');
      setShowConversationMenu(null);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to delete conversation');
    } finally {
      setDeletingConversation(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase() || '?';
  };

  const filteredTeammates = teammates.filter(t => 
    `${t.first_name} ${t.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-64px)] bg-gray-100">
      {/* Sidebar - Conversations List */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold text-gray-800">Messages</h1>
            <button
              onClick={() => setShowNewChat(!showNewChat)}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
              title="New conversation"
            >
              {showNewChat ? (
                <XMarkIcon className="w-5 h-5" />
              ) : (
                <ChatBubbleLeftRightIcon className="w-5 h-5" />
              )}
            </button>
          </div>
          
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={showNewChat ? "Search teammates..." : "Search conversations..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Conversations or Teammates List */}
        <div className="flex-1 overflow-y-auto">
          {showNewChat ? (
            // Teammates list for new chat
            <div className="p-2">
              <p className="text-xs text-gray-500 px-2 py-1 mb-2">Start a new conversation</p>
              {filteredTeammates.length === 0 ? (
                <p className="text-center text-gray-500 py-4">No teammates found</p>
              ) : (
                filteredTeammates.map((teammate) => (
                  <button
                    key={teammate.id}
                    onClick={() => handleStartNewChat(teammate)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    {teammate.avatar_url ? (
                      <img
                        src={teammate.avatar_url}
                        alt={`${teammate.first_name} ${teammate.last_name}`}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-600 font-medium text-sm">
                          {getInitials(teammate.first_name, teammate.last_name)}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 text-left">
                      <p className="font-medium text-gray-800">
                        {teammate.first_name} {teammate.last_name}
                      </p>
                      <p className="text-sm text-gray-500 truncate">{teammate.email}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          ) : (
            // Existing conversations
            <div className="p-2">
              {conversations.length === 0 ? (
                <div className="text-center py-8">
                  <ChatBubbleLeftRightIcon className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">No conversations yet</p>
                  <button
                    onClick={() => setShowNewChat(true)}
                    className="mt-2 text-blue-600 hover:text-blue-700 text-sm"
                  >
                    Start a new chat
                  </button>
                </div>
              ) : (
                conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={`relative group flex items-center gap-3 p-3 rounded-lg transition-colors cursor-pointer ${
                      selectedConversation === conv.other_participant.id
                        ? 'bg-blue-50 border-l-4 border-blue-600'
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => handleSelectConversation(conv)}
                  >
                    {conv.other_participant.avatar_url ? (
                      <img
                        src={conv.other_participant.avatar_url}
                        alt={`${conv.other_participant.first_name} ${conv.other_participant.last_name}`}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-600 font-medium">
                          {getInitials(conv.other_participant.first_name, conv.other_participant.last_name)}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-gray-800 truncate">
                          {conv.other_participant.first_name} {conv.other_participant.last_name}
                        </p>
                        {conv.last_message_at && (
                          <span className="text-xs text-gray-500">
                            {formatTime(conv.last_message_at)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-500 truncate">
                          {conv.last_message_preview || 'No messages yet'}
                        </p>
                        {conv.unread_count > 0 && (
                          <span className="ml-2 bg-blue-600 text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center">
                            {conv.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Delete conversation button */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowConversationMenu(showConversationMenu === conv.other_participant.id ? null : conv.other_participant.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition-all"
                      >
                        <EllipsisVerticalIcon className="w-5 h-5 text-gray-500" />
                      </button>
                      {showConversationMenu === conv.other_participant.id && (
                        <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1 min-w-[140px]">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteConversation(conv.other_participant.id);
                            }}
                            disabled={deletingConversation}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <TrashIcon className="w-4 h-4" />
                            {deletingConversation ? 'Deleting...' : 'Delete Chat'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
              {selectedUser.avatar_url ? (
                <img
                  src={selectedUser.avatar_url}
                  alt={`${selectedUser.first_name} ${selectedUser.last_name}`}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-blue-600 font-medium">
                    {getInitials(selectedUser.first_name, selectedUser.last_name)}
                  </span>
                </div>
              )}
              <div>
                <h2 className="font-semibold text-gray-800">
                  {selectedUser.first_name} {selectedUser.last_name}
                </h2>
                <p className="text-sm text-gray-500">{selectedUser.email}</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
              {messages.length === 0 ? (
                <div className="text-center py-12">
                  <ChatBubbleLeftRightIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No messages yet. Start the conversation!</p>
                </div>
              ) : (
                messages.map((message) => {
                  const isOwn = message.sender_id === user?.id;
                  return (
                    <div
                      key={message.id}
                      className={`group flex items-start gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}
                    >
                      {/* Delete button for own messages - left side */}
                      {isOwn && (
                        <div className="relative self-center">
                          <button
                            onClick={() => setShowMessageMenu(showMessageMenu === message.id ? null : message.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition-all"
                          >
                            <EllipsisVerticalIcon className="w-4 h-4 text-gray-500" />
                          </button>
                          {showMessageMenu === message.id && (
                            <div className="absolute right-0 top-6 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1 min-w-[120px]">
                              <button
                                onClick={() => handleDeleteMessage(message.id)}
                                disabled={deletingMessage}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                              >
                                <TrashIcon className="w-4 h-4" />
                                {deletingMessage ? 'Deleting...' : 'Delete'}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                          isOwn
                            ? 'bg-blue-600 text-white rounded-br-md'
                            : 'bg-white text-gray-800 rounded-bl-md shadow-sm'
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{message.content}</p>
                        <div className={`flex items-center justify-end gap-1 mt-1 ${
                          isOwn ? 'text-blue-200' : 'text-gray-400'
                        }`}>
                          <span className="text-xs">
                            {formatTime(message.created_at)}
                          </span>
                          {isOwn && (
                            message.is_read ? (
                              <CheckCircleIcon className="w-4 h-4" />
                            ) : (
                              <CheckIcon className="w-4 h-4" />
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="bg-white border-t border-gray-200 p-4">
              <div className="flex items-end gap-3">
                <textarea
                  ref={messageInputRef}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Type a message..."
                  rows={1}
                  className="flex-1 resize-none border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent max-h-32"
                  style={{ minHeight: '42px' }}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sendingMessage}
                  className={`p-3 rounded-lg transition-colors ${
                    newMessage.trim() && !sendingMessage
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {sendingMessage ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <PaperAirplaneIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          // No conversation selected
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <ChatBubbleLeftRightIcon className="w-20 h-20 text-gray-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-600 mb-2">
                Select a conversation
              </h2>
              <p className="text-gray-500 mb-4">
                Choose an existing conversation or start a new one
              </p>
              <button
                onClick={() => setShowNewChat(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Start New Chat
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
