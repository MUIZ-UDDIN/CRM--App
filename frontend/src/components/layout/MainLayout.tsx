import React, { useState, useRef, useEffect } from 'react';
import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import {
  HomeIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  FolderIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  MagnifyingGlassIcon,
  BellIcon,
  UserCircleIcon,
  ChevronDownIcon,
  ArrowRightOnRectangleIcon,
  UserIcon,
  CogIcon,
  TrashIcon,
  Bars3Icon,
  XMarkIcon,
  InboxIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import { useAuth } from '../../contexts/AuthContext';
import ImageViewer from '../ImageViewer';
import TrialBanner from '../TrialBanner';

interface NavItem {
  name: string;
  href?: string;
  icon: any;
  children?: Array<{ name: string; href: string }>;
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { 
    name: 'Sales', 
    icon: CurrencyDollarIcon,
    children: [
      { name: 'Deals', href: '/deals' },
      { name: 'Pipeline', href: '/pipeline-settings' },
      { name: 'Quotes', href: '/quotes' },
      { name: 'Analytics', href: '/analytics' },
    ]
  },
  {
    name: 'Communications',
    icon: InboxIcon,
    children: [
      { name: 'Contacts', href: '/contacts' },
      { name: 'Email', href: '/inbox' },
      { name: 'SMS', href: '/sms' },
      { name: 'Calls', href: '/calls' },
    ]
  },
  { 
    name: 'More', 
    icon: FolderIcon,
    children: [
      { name: 'Activities', href: '/activities' },
      { name: 'Files', href: '/files' },
      { name: 'Workflows', href: '/workflows' },
      { name: 'Settings', href: '/settings' },
    ]
  },
];

// Notifications will be fetched from API

export default function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userAvatar, setUserAvatar] = useState<string>('');
  const [showImageViewer, setShowImageViewer] = useState(false);
  const quickAddRef = useRef<HTMLDivElement>(null);

  // Close quick add menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (quickAddRef.current && !quickAddRef.current.contains(event.target as Node)) {
        setShowQuickAdd(false);
      }
    };

    if (showQuickAdd) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showQuickAdd]);

  // Fetch notifications and user profile
  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
    fetchUserProfile();
    
    // Listen for avatar updates
    const handleAvatarUpdate = (event: any) => {
      setUserAvatar(event.detail.avatar);
    };
    
    window.addEventListener('avatarUpdated', handleAvatarUpdate);
    
    return () => {
      window.removeEventListener('avatarUpdated', handleAvatarUpdate);
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_BASE_URL}/api/notifications/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_BASE_URL}/api/notifications/unread-count`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.count);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_BASE_URL}/api/users/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setUserAvatar(data.avatar || '');
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };
  
  // Sync notificationsList with notifications from API
  useEffect(() => {
    setNotificationsList(notifications);
  }, [notifications]);
  
  const [notificationsList, setNotificationsList] = useState(notifications);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const notificationsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfile(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchSuggestions(false);
      }
      // Close nav dropdowns when clicking outside
      const target = event.target as HTMLElement;
      if (!target.closest('.nav-dropdown')) {
        setOpenDropdown(null);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // unreadCount is now fetched from API

  // Search suggestions will be fetched from API when implemented
  const searchSuggestions: any[] = [];

  const filteredSuggestions = searchQuery.length > 1 
    ? searchSuggestions.filter(item => 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  // Handle search functionality
  const handleSearch = (query: string) => {
    if (query.trim()) {
      setShowSearchSuggestions(false);
      setSearchQuery('');
      
      // Navigate to contacts page with search query
      // The contacts page will handle the search filtering
      navigate(`/contacts?search=${encodeURIComponent(query)}`);
    }
  };

  const handleSuggestionClick = (suggestion: any) => {
    setSearchQuery('');
    setShowSearchSuggestions(false);
    
    // Navigate based on suggestion type
    switch (suggestion.type.toLowerCase()) {
      case 'contact':
        navigate('/contacts');
        break;
      case 'deal':
        navigate('/deals');
        break;
      case 'activity':
        navigate('/activities');
        break;
      case 'file':
        navigate('/files');
        break;
      case 'quote':
        navigate('/quotes');
        break;
      default:
        break;
    }
  };

  // Handle quick actions
  const handleQuickAdd = (type: string) => {
    setShowQuickAdd(false);
    // Navigate based on type with action parameter to open add modal
    if (type === 'deal') {
      navigate('/deals?action=add');
    } else if (type === 'contact') {
      navigate('/contacts?action=add');
    } else if (type === 'activity') {
      navigate('/activities?action=add');
    } else if (type === 'file') {
      navigate('/files?action=upload');
    } else if (type === 'quote') {
      navigate('/quotes?action=add');
    }
  };

  // Handle profile actions
  const handleViewProfile = () => {
    setShowProfile(false);
    navigate('/profile');
  };

  const handleAccountSettings = () => {
    setShowProfile(false);
    navigate('/settings');
  };

  // Handle notifications
  const handleViewAllNotifications = () => {
    setShowNotifications(false);
    navigate('/notifications');
  };

  const handleNotificationClick = (notification: any) => {
    // Mark as read
    setNotificationsList(prev => 
      prev.map(n => 
        n.id === notification.id ? { ...n, unread: false } : n
      )
    );
    setShowNotifications(false);
    navigate('/notifications');
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      await fetch(`${API_BASE_URL}/api/notifications/mark-all-read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      // Update local state
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setNotificationsList(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the notification click
    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      await fetch(`${API_BASE_URL}/api/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      // Update local state immediately
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      setNotificationsList(prev => prev.filter(n => n.id !== notificationId));
      
      // Update unread count
      fetchUnreadCount();
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Trial Status Banner */}
      <TrialBanner />
      
      {/* Top Navigation */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40 overflow-visible">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 overflow-visible">
          <div className="flex justify-between items-center h-14 sm:h-16 min-w-0 overflow-visible">
            {/* Logo and Main Navigation */}
            <div className="flex items-center min-w-0 flex-1 mr-2 sm:mr-4">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="lg:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors mr-2"
              >
                {showMobileMenu ? (
                  <XMarkIcon className="h-6 w-6" />
                ) : (
                  <Bars3Icon className="h-6 w-6" />
                )}
              </button>

              {/* Logo */}
              <div className="flex-shrink-0 flex items-center">
                <div className="w-6 h-6 sm:w-7 sm:h-7 bg-primary-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xs">S</span>
                </div>
                <span className="ml-2 text-base sm:text-lg font-semibold text-gray-900 hidden sm:block">
                  Sunstone CRM
                </span>
              </div>

              {/* Navigation Tabs - Desktop */}
              <nav className="ml-6 hidden lg:flex space-x-1">
                {/* Regular navigation */}
                {navigation.map((item) => {
                  if (item.children) {
                    // Dropdown menu item
                    const isActive = item.children.some(child => location.pathname === child.href);
                    const isOpen = openDropdown === item.name;
                    
                    return (
                      <div key={item.name} className="relative nav-dropdown">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenDropdown(isOpen ? null : item.name);
                          }}
                          className={clsx(
                            'inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 whitespace-nowrap flex-shrink-0',
                            isActive
                              ? 'bg-primary-50 text-primary-600'
                              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                          )}
                        >
                          <item.icon 
                            className={clsx(
                              'mr-2 h-4 w-4 flex-shrink-0',
                              isActive ? 'text-primary-600' : 'text-gray-400'
                            )} 
                          />
                          <span className="truncate">{item.name}</span>
                          <ChevronDownIcon className={clsx(
                            'ml-1 h-3 w-3 transition-transform',
                            isOpen && 'rotate-180'
                          )} />
                        </button>
                        
                        {isOpen && (
                          <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1 max-h-96 overflow-y-auto" style={{ zIndex: 9999 }}>
                            {item.children.map((child) => (
                              <Link
                                key={child.name}
                                to={child.href}
                                onClick={() => setOpenDropdown(null)}
                                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                              >
                                {child.name}
                              </Link>
                            ))}
                            {/* Add Admin Dashboard for super admins in More dropdown */}
                            {item.name === 'More' && (user?.role === 'super_admin' || user?.role === 'Super Admin') && (
                              <Link
                                to="/admin"
                                onClick={() => setOpenDropdown(null)}
                                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-200"
                              >
                                Admin Dashboard
                              </Link>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  }
                  
                  // Regular menu item
                  const isActive = location.pathname === item.href || 
                    (item.href !== '/dashboard' && location.pathname.startsWith(item.href!));
                  
                  return (
                    <Link
                      key={item.name}
                      to={item.href!}
                      className={clsx(
                        'inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 whitespace-nowrap flex-shrink-0',
                        isActive
                          ? 'bg-primary-50 text-primary-600'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      )}
                    >
                      <item.icon 
                        className={clsx(
                          'mr-2 h-4 w-4 flex-shrink-0',
                          isActive ? 'text-primary-600' : 'text-gray-400'
                        )} 
                      />
                      <span className="truncate">{item.name}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Right side - Search, Notifications, User menu */}
            <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
              {/* Search */}
              <div className="relative hidden md:block" ref={searchRef}>
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search deals, contacts..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSearchSuggestions(e.target.value.length > 1);
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch(searchQuery);
                    }
                  }}
                  onFocus={() => {
                    if (searchQuery.length > 1) {
                      setShowSearchSuggestions(true);
                    }
                  }}
                  className="block w-40 lg:w-48 pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                />
                
                {/* Search Suggestions Dropdown */}
                {showSearchSuggestions && filteredSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-64 overflow-y-auto">
                    {filteredSuggestions.map((suggestion) => (
                      <div
                        key={suggestion.id}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{suggestion.title}</p>
                            <p className="text-xs text-gray-500 truncate">{suggestion.description}</p>
                          </div>
                          <span className="ml-2 px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                            {suggestion.type}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Notifications */}
              <div className="relative" ref={notificationsRef}>
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-1.5 sm:p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                >
                  <BellIcon className="h-5 w-5 sm:h-5 sm:w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </button>
                
                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <div className="p-4 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notificationsList.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                          <BellIcon className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                          <p className="text-sm">No notifications</p>
                        </div>
                      ) : (
                        notificationsList.map((notification) => (
                        <div
                          key={notification.id}
                          onClick={() => handleNotificationClick(notification)}
                          className={clsx(
                            'p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors duration-200',
                            notification.unread && 'bg-blue-50'
                          )}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1 pr-2">
                              <h4 className={clsx(
                                'text-sm font-medium',
                                notification.unread ? 'text-gray-900' : 'text-gray-700'
                              )}>
                                {notification.title}
                              </h4>
                              <p className="text-sm text-gray-600 mt-1">
                                {notification.message}
                              </p>
                              <p className="text-xs text-gray-400 mt-1">
                                {notification.time}
                              </p>
                            </div>
                            <div className="flex items-center space-x-2">
                              {notification.unread && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              )}
                              <button
                                onClick={(e) => deleteNotification(notification.id, e)}
                                className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors duration-200"
                                title="Delete notification"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                        ))
                      )}
                    </div>
                    <div className="p-3 border-t border-gray-200 space-y-2">
                      {notificationsList.length > 0 && unreadCount > 0 && (
                        <button 
                          onClick={markAllAsRead}
                          className="w-full text-center text-sm text-gray-600 hover:text-gray-800 font-medium transition-colors duration-200"
                        >
                          Mark all as read
                        </button>
                      )}
                      <button 
                        onClick={handleViewAllNotifications}
                        className="w-full text-center text-sm text-primary-600 hover:text-primary-800 font-medium transition-colors duration-200"
                      >
                        View all notifications
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* User Menu */}
              <div className="relative" ref={profileRef}>
                <button 
                  onClick={() => setShowProfile(!showProfile)}
                  className="flex items-center space-x-1 sm:space-x-2 p-1.5 sm:p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                >
                  {userAvatar ? (
                    <img src={userAvatar} alt="Profile" className="h-5 w-5 sm:h-6 sm:w-6 rounded-full object-cover" />
                  ) : (
                    <UserCircleIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                  )}
                  <span className="text-sm font-medium hidden md:block">{user?.firstName} {user?.lastName}</span>
                  <ChevronDownIcon className={clsx(
                    'h-4 w-4 transition-transform duration-200 hidden sm:block',
                    showProfile && 'rotate-180'
                  )} />
                </button>
                
                {/* Profile Dropdown */}
                {showProfile && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <div className="p-4 border-b border-gray-200">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => {
                            if (userAvatar) {
                              setShowImageViewer(true);
                              setShowProfile(false);
                            }
                          }}
                          title={userAvatar ? "Click to view full image" : ""}
                        >
                          {userAvatar ? (
                            <img src={userAvatar} alt="Profile" className="h-12 w-12 rounded-full object-cover" />
                          ) : (
                            <UserCircleIcon className="h-12 w-12 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {user?.firstName} {user?.lastName}
                          </p>
                          <p className="text-xs text-gray-600 truncate">{user?.email}</p>
                          <p className="text-xs text-primary-600 font-medium">{user?.role}</p>
                        </div>
                      </div>
                    </div>
                    <div className="py-2">
                      <button 
                        onClick={handleViewProfile}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                      >
                        <UserIcon className="h-4 w-4 mr-3 text-gray-400 flex-shrink-0" />
                        <span>View Profile</span>
                      </button>
                      <button 
                        onClick={handleAccountSettings}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                      >
                        <CogIcon className="h-4 w-4 mr-3 text-gray-400 flex-shrink-0" />
                        <span>Account Settings</span>
                      </button>
                      <hr className="my-2" />
                      <button 
                        onClick={logout}
                        className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors duration-200"
                      >
                        <ArrowRightOnRectangleIcon className="h-4 w-4 mr-3 text-red-500 flex-shrink-0" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {showMobileMenu && (
          <div className="lg:hidden absolute top-full left-0 right-0 border-t border-gray-200 bg-white shadow-lg z-50">
            <nav className="px-4 py-3 space-y-1 max-h-[calc(100vh-64px)] overflow-y-auto">
              {navigation.map((item) => {
                if (item.children) {
                  // For mobile, show all child links directly without dropdown
                  return (
                    <div key={item.name}>
                      {/* Category Header */}
                      <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {item.name}
                      </div>
                      {/* Child Links */}
                      {item.children.map((child) => {
                        const isActive = location.pathname === child.href;
                        return (
                          <Link
                            key={child.name}
                            to={child.href}
                            onClick={() => setShowMobileMenu(false)}
                            className={clsx(
                              'flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200 ml-3',
                              isActive
                                ? 'bg-primary-50 text-primary-600 border border-primary-200'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                            )}
                          >
                            <span>{child.name}</span>
                          </Link>
                        );
                      })}
                      {/* Add Admin Dashboard for super admins in More section */}
                      {item.name === 'More' && (user?.role === 'super_admin' || user?.role === 'Super Admin') && (
                        <Link
                          to="/admin"
                          onClick={() => setShowMobileMenu(false)}
                          className={clsx(
                            'flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200 ml-3 border-t border-gray-200 mt-2 pt-3',
                            location.pathname === '/admin'
                              ? 'bg-primary-50 text-primary-600 border border-primary-200'
                              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                          )}
                        >
                          <span>Admin Dashboard</span>
                        </Link>
                      )}
                    </div>
                  );
                }
                
                const isActive = location.pathname === item.href || 
                  (item.href !== '/dashboard' && location.pathname.startsWith(item.href!));
                
                return (
                  <Link
                    key={item.name}
                    to={item.href!}
                    onClick={() => setShowMobileMenu(false)}
                    className={clsx(
                      'flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200',
                      isActive
                        ? 'bg-primary-50 text-primary-600 border border-primary-200'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    )}
                  >
                    <item.icon 
                      className={clsx(
                        'mr-3 h-5 w-5',
                        isActive ? 'text-primary-600' : 'text-gray-400'
                      )} 
                    />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-full mx-auto">
        <div className="min-h-[calc(100vh-64px)]">
          <Outlet />
        </div>
      </main>

      {/* Floating Action Button */}
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50">
        <div className="relative" ref={quickAddRef}>
          <button 
            onClick={() => setShowQuickAdd(!showQuickAdd)}
            className="bg-primary-500 hover:bg-primary-600 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-200 group"
          >
            <svg 
              className={`h-6 w-6 transition-transform duration-200 ${showQuickAdd ? 'rotate-45' : 'group-hover:scale-110'}`}
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>

          {/* Quick Add Menu */}
          {showQuickAdd && (
            <div className="absolute bottom-full right-0 mb-4 w-48 bg-white rounded-lg shadow-lg border border-gray-200">
              <div className="py-2">
                <button
                  onClick={() => handleQuickAdd('deal')}
                  className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                >
                  <CurrencyDollarIcon className="h-4 w-4 mr-3 text-primary-500 flex-shrink-0" />
                  <span>Add New Deal</span>
                </button>
                <button
                  onClick={() => handleQuickAdd('contact')}
                  className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                >
                  <UserGroupIcon className="h-4 w-4 mr-3 text-primary-500 flex-shrink-0" />
                  <span>Add New Contact</span>
                </button>
                <button
                  onClick={() => handleQuickAdd('activity')}
                  className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                >
                  <CalendarIcon className="h-4 w-4 mr-3 text-primary-500 flex-shrink-0" />
                  <span>Add New Activity</span>
                </button>
                <button
                  onClick={() => handleQuickAdd('file')}
                  className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                >
                  <FolderIcon className="h-4 w-4 mr-3 text-primary-500 flex-shrink-0" />
                  <span>Upload File</span>
                </button>
                <button
                  onClick={() => handleQuickAdd('quote')}
                  className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                >
                  <DocumentTextIcon className="h-4 w-4 mr-3 text-primary-500 flex-shrink-0" />
                  <span>Create Quote</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Image Viewer Modal */}
      {showImageViewer && userAvatar && (
        <ImageViewer
          imageUrl={userAvatar}
          onClose={() => setShowImageViewer(false)}
          userName={`${user?.firstName} ${user?.lastName}`}
        />
      )}
    </div>
  );
}