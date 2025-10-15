import { useState } from 'react';
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
  id: number;
  type: 'deal' | 'meeting' | 'call' | 'email' | 'contact';
  title: string;
  message: string;
  time: string;
  unread: boolean;
  priority: 'high' | 'medium' | 'low';
}

export default function Notifications() {
  const [filter, setFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: 1,
      type: 'deal',
      title: 'New deal created',
      message: 'Enterprise Software License - $50,000 has been added to the pipeline',
      time: '2 minutes ago',
      unread: true,
      priority: 'high'
    },
    {
      id: 2,
      type: 'meeting',
      title: 'Meeting reminder',
      message: 'Demo call with John Smith at TechCorp in 30 minutes',
      time: '28 minutes ago',
      unread: true,
      priority: 'high'
    },
    {
      id: 3,
      type: 'deal',
      title: 'Deal won',
      message: 'Marketing Consulting deal has been marked as closed won - $25,000',
      time: '1 hour ago',
      unread: true,
      priority: 'medium'
    },
    {
      id: 4,
      type: 'email',
      title: 'Email response',
      message: 'Sarah Marketing replied to your proposal email',
      time: '2 hours ago',
      unread: false,
      priority: 'medium'
    },
    {
      id: 5,
      type: 'call',
      title: 'Missed call',
      message: 'Missed call from David Tech (+1 555-123-4567)',
      time: '3 hours ago',
      unread: false,
      priority: 'low'
    },
    {
      id: 6,
      type: 'contact',
      title: 'New contact added',
      message: 'Amanda Health has been added as a new contact',
      time: '4 hours ago',
      unread: false,
      priority: 'low'
    }
  ]);

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
    if (filter === 'unread') return notification.unread;
    return notification.type === filter;
  });

  const unreadCount = notifications.filter(n => n.unread).length;

  const markAsRead = (id: number) => {
    setNotifications(prev => 
      prev.map(notification =>
        notification.id === id 
          ? { ...notification, unread: false }
          : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, unread: false }))
    );
  };

  const deleteNotification = (id: number) => {
    setNotifications(prev => 
      prev.filter(notification => notification.id !== id)
    );
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
        <div className="px-4 sm:px-6 lg:max-w-7xl lg:mx-auto lg:px-8">
          <div className="py-6 flex items-center justify-between">
            <div className="flex items-center">
              <BellIcon className="h-8 w-8 text-primary-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold leading-7 text-gray-900">Notifications</h1>
                <p className="mt-1 text-sm text-gray-500">
                  Stay updated with your latest activities
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-primary-700 bg-primary-100 hover:bg-primary-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  <CheckIcon className="h-3 w-3 mr-1" />
                  Mark all as read
                </button>
              )}
              <div className="flex items-center px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-600">
                <span className="font-medium">{unreadCount}</span>
                <span className="ml-1">unread</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:max-w-7xl lg:mx-auto lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg">
          {/* Filter Tabs */}
          <div className="border-b border-gray-200">
            <div className="px-6 py-4">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`p-2 rounded-lg transition-colors ${
                    showFilters 
                      ? 'bg-primary-100 text-primary-600' 
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                  }`}
                  title="Toggle Filters"
                >
                  <FunnelIcon className="h-5 w-5" />
                </button>
                {showFilters && (
                  <nav className="flex space-x-4">
                    {filterOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setFilter(option.value)}
                        className={`px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                          filter === option.value
                            ? 'bg-primary-100 text-primary-700'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {option.label}
                        <span className="ml-2 text-xs bg-gray-200 text-gray-600 rounded-full px-2 py-0.5">
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
            {filteredNotifications.length === 0 ? (
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
                      notification.unread ? 'bg-blue-50' : ''
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
                              notification.unread ? 'text-gray-900' : 'text-gray-700'
                            }`}>
                              {notification.title}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                              {notification.message}
                            </p>
                          </div>
                          
                          <div className="flex items-center space-x-2 ml-4">
                            <span className="text-xs text-gray-400 whitespace-nowrap">
                              {notification.time}
                            </span>
                            {notification.unread && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center space-x-3">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              notification.priority === 'high' ? 'bg-red-100 text-red-800' :
                              notification.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {notification.priority} priority
                            </span>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            {notification.unread && (
                              <button
                                onClick={() => markAsRead(notification.id)}
                                className="text-xs text-primary-600 hover:text-primary-800 font-medium"
                              >
                                Mark as read
                              </button>
                            )}
                            <button
                              onClick={() => deleteNotification(notification.id)}
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