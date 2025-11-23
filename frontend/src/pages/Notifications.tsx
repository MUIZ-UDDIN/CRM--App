import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import * as notificationsService from '../services/notificationsService';
import { 
  BellIcon, 
  CheckIcon,
  TrashIcon,
  FunnelIcon,
  EnvelopeIcon,
  PhoneIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  MagnifyingGlassIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
  link?: string;
}

export default function Notifications() {
  const [filter, setFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchNotifications();
  }, [filter]);

  // Listen for notification deletion events from other components
  useEffect(() => {
    const handleNotificationDeleted = (event: CustomEvent) => {
      const { notificationId } = event.detail;
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    };

    window.addEventListener('notificationDeleted', handleNotificationDeleted as EventListener);
    
    return () => {
      window.removeEventListener('notificationDeleted', handleNotificationDeleted as EventListener);
    };
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const unreadOnly = filter === 'unread';
      const data = await notificationsService.getNotifications(unreadOnly);
      setNotifications(data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'deal': return CurrencyDollarIcon;
      case 'meeting': return CalendarIcon;
      case 'call': return PhoneIcon;
      case 'email': return EnvelopeIcon;
      case 'contact': return UserGroupIcon;
      default: return BellIcon;
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'deal': return 'text-green-600 bg-green-100';
      case 'meeting': return 'text-blue-600 bg-blue-100';
      case 'call': return 'text-purple-600 bg-purple-100';
      case 'email': return 'text-yellow-600 bg-yellow-100';
      case 'contact': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Helper function to categorize notifications based on title/message
  const getNotificationCategory = (notification: Notification): string => {
    const text = `${notification.title} ${notification.message}`.toLowerCase();
    if (text.includes('deal')) return 'deal';
    if (text.includes('meeting') || text.includes('activity')) return 'activity';
    if (text.includes('contact')) return 'contact';
    if (text.includes('workflow')) return 'workflow';
    if (text.includes('file') || text.includes('folder')) return 'file';
    if (text.includes('ticket') || text.includes('support')) return 'support';
    if (text.includes('quote')) return 'quote';
    return 'other';
  };

  const filteredNotifications = notifications.filter(notification => {
    // Apply search filter
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
        notification.title.toLowerCase().includes(searchLower) ||
        notification.message.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }
    
    // Apply category filter
    if (filter === 'all') return true;
    if (filter === 'unread') return !notification.read;
    return getNotificationCategory(notification) === filter;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationsService.markAsRead(id);
      setNotifications(prev => 
        prev.map(notification =>
          notification.id === id 
            ? { ...notification, read: true }
            : notification
        )
      );
      toast.success('Marked as read');
    } catch (error) {
      toast.error('Failed to mark as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsService.markAllAsRead();
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, read: true }))
      );
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Failed to mark all as read');
    }
  };

  const handleDeleteNotification = async (id: string) => {
    try {
      await notificationsService.deleteNotification(id);
      setNotifications(prev => 
        prev.filter(notification => notification.id !== id)
      );
      toast.success('Notification deleted');
    } catch (error) {
      toast.error('Failed to delete notification');
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  const filterOptions = [
    { value: 'all', label: 'All', count: notifications.length },
    { value: 'unread', label: 'Unread', count: unreadCount },
    { value: 'deal', label: 'Deals', count: notifications.filter(n => getNotificationCategory(n) === 'deal').length },
    { value: 'activity', label: 'Activities', count: notifications.filter(n => getNotificationCategory(n) === 'activity').length },
    { value: 'contact', label: 'Contacts', count: notifications.filter(n => getNotificationCategory(n) === 'contact').length },
    { value: 'workflow', label: 'Workflows', count: notifications.filter(n => getNotificationCategory(n) === 'workflow').length },
    { value: 'file', label: 'Files', count: notifications.filter(n => getNotificationCategory(n) === 'file').length },
    { value: 'support', label: 'Support', count: notifications.filter(n => getNotificationCategory(n) === 'support').length },
    { value: 'quote', label: 'Quotes', count: notifications.filter(n => getNotificationCategory(n) === 'quote').length }
  ];

  return (
    <div className="min-h-full">
      <div className="bg-white shadow">
        <div className="px-4 sm:px-6 lg:max-w-7xl xl:max-w-8xl 2xl:max-w-9xl 3xl:max-w-10xl lg:mx-auto lg:px-8">
          <div className="py-4 sm:py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center min-w-0">
              <BellIcon className="h-6 w-6 sm:h-8 sm:w-8 text-primary-600 mr-2 sm:mr-3 flex-shrink-0" />
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 truncate">Notifications</h1>
                <p className="mt-1 text-xs sm:text-sm text-gray-500 truncate">
                  Stay updated with your latest activities
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 border border-transparent text-xs font-medium rounded text-primary-700 bg-primary-100 hover:bg-primary-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  <CheckIcon className="h-3 w-3 mr-1" />
                  <span className="whitespace-nowrap">Mark all read</span>
                </button>
              )}
              <div className="flex items-center px-2 sm:px-3 py-1 bg-gray-100 rounded-full text-xs sm:text-sm text-gray-600">
                <span className="font-medium">{unreadCount}</span>
                <span className="ml-1">unread</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:max-w-7xl xl:max-w-8xl 2xl:max-w-9xl 3xl:max-w-10xl lg:mx-auto lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg">
          {/* Search Bar */}
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notifications..."
                className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <XMarkIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="border-b border-gray-200">
            <div className="px-4 sm:px-6 py-3 sm:py-4">
              <div className="flex items-start sm:items-center gap-2 sm:gap-3">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`p-1.5 sm:p-2 rounded-lg transition-colors flex-shrink-0 ${
                    showFilters 
                      ? 'bg-primary-100 text-primary-600' 
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                  }`}
                  title="Toggle Filters"
                >
                  <FunnelIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
                {showFilters && (
                  <nav className="flex flex-wrap gap-2">
                    {filterOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setFilter(option.value)}
                        className={`px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-colors duration-200 ${
                          filter === option.value
                            ? 'bg-primary-100 text-primary-700'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <span className="whitespace-nowrap">{option.label}</span>
                        <span className="ml-1 sm:ml-2 text-xs bg-gray-200 text-gray-600 rounded-full px-1.5 sm:px-2 py-0.5">
                          {option.count}
                        </span>
                      </button>
                    ))}
                  </nav>
                )}
              </div>
            </div>
          </div>

          {/* Notifications List */}
          <div className="divide-y divide-gray-200">
            {loading ? (
              <div className="px-6 py-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading notifications...</p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <BellIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">
                  No notifications
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  {filter === 'unread' 
                    ? "You're all caught up! No unread notifications."
                    : "You don't have any notifications in this category."
                  }
                </p>
              </div>
            ) : (
              filteredNotifications.map((notification) => {
                const Icon = getIcon(notification.type);
                const iconColor = getIconColor(notification.type);
                
                return (
                  <div
                    key={notification.id}
                    onClick={() => {
                      if (notification.link) {
                        window.location.href = notification.link;
                      }
                    }}
                    className={`px-6 py-4 transition-all duration-200 ${
                      !notification.read ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                    } ${notification.link ? 'hover:bg-gray-50 cursor-pointer hover:shadow-md' : ''}`}
                  >
                    <div className="flex items-start space-x-4">
                      <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${iconColor} shadow-sm`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className={`text-sm font-semibold ${
                                !notification.read ? 'text-gray-900' : 'text-gray-700'
                              }`}>
                                {notification.title}
                              </p>
                              {!notification.read && (
                                <span className="flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-blue-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                              {notification.message}
                            </p>
                            {notification.link && (
                              <p className="text-xs text-primary-600 mt-2 font-medium hover:underline">
                                Click to view details →
                              </p>
                            )}
                          </div>
                          
                          <div className="flex flex-col items-end space-y-2 ml-4">
                            <span className="text-xs text-gray-500 whitespace-nowrap font-medium">
                              {formatTime(notification.created_at)}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center space-x-3">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold shadow-sm ${
                              notification.type === 'error' ? 'bg-red-100 text-red-800' :
                              notification.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                              notification.type === 'success' ? 'bg-green-100 text-green-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {notification.type}
                            </span>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            {!notification.read && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMarkAsRead(notification.id);
                                }}
                                className="text-xs text-primary-600 hover:text-primary-800 font-medium px-3 py-1 rounded-md hover:bg-primary-50 transition-colors"
                              >
                                <CheckIcon className="h-3 w-3 inline mr-1" />
                                Mark read
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteNotification(notification.id);
                              }}
                              className="text-gray-400 hover:text-red-500 transition-colors duration-200 p-2 rounded-md hover:bg-red-50"
                              title="Delete notification"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}