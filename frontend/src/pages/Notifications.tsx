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
  UserGroupIcon
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

  useEffect(() => {
    fetchNotifications();
  }, [filter]);

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

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !notification.read;
    return notification.type === filter;
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
    { value: 'deal', label: 'Deals', count: notifications.filter(n => n.type === 'deal').length },
    { value: 'meeting', label: 'Meetings', count: notifications.filter(n => n.type === 'meeting').length },
    { value: 'email', label: 'Emails', count: notifications.filter(n => n.type === 'email').length }
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
                    className={`px-6 py-4 hover:bg-gray-50 transition-colors duration-200 ${
                      !notification.read ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-4">
                      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${iconColor}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className={`text-sm font-medium ${
                              !notification.read ? 'text-gray-900' : 'text-gray-700'
                            }`}>
                              {notification.title}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                              {notification.message}
                            </p>
                          </div>
                          
                          <div className="flex items-center space-x-2 ml-4">
                            <span className="text-xs text-gray-400 whitespace-nowrap">
                              {formatTime(notification.created_at)}
                            </span>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center space-x-3">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
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
                                onClick={() => handleMarkAsRead(notification.id)}
                                className="text-xs text-primary-600 hover:text-primary-800 font-medium"
                              >
                                Mark as read
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteNotification(notification.id)}
                              className="text-gray-400 hover:text-red-500 transition-colors duration-200"
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