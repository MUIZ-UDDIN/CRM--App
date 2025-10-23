import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BackendStatus from '../components/common/BackendStatus';
import SearchableContactSelect from '../components/common/SearchableContactSelect';
import toast from 'react-hot-toast';
import { 
  CurrencyDollarIcon, 
  UserGroupIcon, 
  ChartBarIcon,
  CalendarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  XMarkIcon,
  PlusIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import * as dealsService from '../services/dealsService';
import * as activitiesService from '../services/activitiesService';

interface RecentActivity {
  id: string;
  type: string;
  description: string;
  time: string;
  status: string;
}

interface UpcomingActivity {
  id: string;
  type: string;
  title: string;
  time: string;
  contact: string;
  priority: 'high' | 'medium' | 'low';
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [showAddDealModal, setShowAddDealModal] = useState(false);
  const [activities, setActivities] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [upcomingActivities, setUpcomingActivities] = useState<UpcomingActivity[]>([]);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [dealFormData, setDealFormData] = useState({
    title: '',
    value: '',
    company: '',
    contact: '',
    stage_id: 'qualification',
    expectedCloseDate: ''
  });

  // Get today's date in YYYY-MM-DD format for min date
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const stages = [
    { id: 'qualification', name: 'Qualification' },
    { id: 'proposal', name: 'Proposal' },
    { id: 'negotiation', name: 'Negotiation' },
    { id: 'closed-won', name: 'Closed Won' }
  ];

  const stats = dashboardData ? [
    {
      name: 'Total Pipeline',
      value: `$${dashboardData.kpis.total_pipeline.toLocaleString()}`,
      change: `${dashboardData.kpis.pipeline_growth >= 0 ? '+' : ''}${dashboardData.kpis.pipeline_growth}%`,
      changeType: dashboardData.kpis.pipeline_growth >= 0 ? 'positive' as const : 'negative' as const,
      icon: CurrencyDollarIcon,
    },
    {
      name: 'Active Deals', 
      value: dashboardData.kpis.active_deals.toString(),
      change: `${dashboardData.kpis.deal_growth >= 0 ? '+' : ''}${dashboardData.kpis.deal_growth}%`,
      changeType: dashboardData.kpis.deal_growth >= 0 ? 'positive' as const : 'negative' as const,
      icon: ChartBarIcon,
    },
    {
      name: 'Win Rate',
      value: `${dashboardData.kpis.win_rate}%`,
      change: 'All time',
      changeType: 'positive' as const,
      icon: ArrowTrendingUpIcon,
    },
    {
      name: 'Activities Today',
      value: dashboardData.kpis.activities_today.toString(),
      change: 'Today',
      changeType: 'positive' as const,
      icon: CalendarIcon,
    },
  ] : [
    {
      name: 'Total Pipeline',
      value: '$0',
      change: '+0%',
      changeType: 'positive' as const,
      icon: CurrencyDollarIcon,
    },
    {
      name: 'Active Deals', 
      value: '0',
      change: '+0',
      changeType: 'positive' as const,
      icon: ChartBarIcon,
    },
    {
      name: 'Win Rate',
      value: '0%',
      change: '+0%',
      changeType: 'positive' as const,
      icon: ArrowTrendingUpIcon,
    },
    {
      name: 'Activities Today',
      value: '0',
      change: '0',
      changeType: 'positive' as const,
      icon: CalendarIcon,
    },
  ];

  // Fetch activities, dashboard data, user info, and contacts on component mount
  useEffect(() => {
    fetchActivities();
    fetchDashboardData();
    fetchCurrentUser();
    fetchContacts();
  }, []);

  const fetchCurrentUser = async () => {
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
        setCurrentUser(data);
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  const fetchContacts = async () => {
    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_BASE_URL}/api/contacts/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setContacts(data);
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_BASE_URL}/api/analytics/dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const fetchActivities = async () => {
    try {
      const data = await activitiesService.getActivities();
      setActivities(data);
      
      // Separate recent and upcoming activities
      const now = new Date();
      
      // Recent Activities: Either completed, or created recently, or past due date
      const recent = data
        .filter((activity: any) => {
          // Show if completed
          if (activity.completed_at) return true;
          
          // Show if past due date
          if (activity.due_date && new Date(activity.due_date) < now) return true;
          
          // Show if created within last 24 hours (regardless of completion status)
          if (activity.created_at) {
            const createdAt = new Date(activity.created_at);
            const hoursAgo = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
            if (hoursAgo <= 24) return true;
          }
          
          return false;
        })
        .slice(0, 10) // Show only last 10 recent activities
        .map((activity: any) => ({
          id: activity.id,
          type: activity.type?.toLowerCase() || 'task',
          description: activity.subject || activity.description || 'Activity',
          time: activity.completed_at ? 
                formatTimeAgo(activity.completed_at) : 
                activity.due_date ? 
                formatTimeAgo(activity.due_date) :
                formatTimeAgo(activity.created_at),
          status: activity.status || 'completed'
        }));

      // Upcoming Activities: Have future due date and not completed
      const upcoming = data
        .filter((activity: any) => {
          // Must have future due date
          if (!activity.due_date) return false;
          if (new Date(activity.due_date) <= now) return false;
          
          // Must not be completed
          if (activity.completed_at) return false;
          
          return true;
        })
        .slice(0, 10) // Show only next 10 upcoming activities
        .map((activity: any) => ({
          id: activity.id,
          type: activity.type?.toLowerCase() || 'task',
          title: activity.subject || activity.description || 'Upcoming activity',
          time: formatDateTime(activity.due_date),
          contact: activity.contact_name || activity.contact_id || 'No contact',
          priority: (activity.priority >= 3 ? 'high' : activity.priority >= 2 ? 'medium' : 'low') as 'high' | 'medium' | 'low'
        }));
      
      setRecentActivities(recent);
      setUpcomingActivities(upcoming);
    } catch (error) {
      console.error('Error fetching activities:', error);
      // Fallback to empty arrays instead of mock data
      setRecentActivities([]);
      setUpcomingActivities([]);
    }
  };

  const formatTimeAgo = (dateString: string): string => {
    if (!dateString) return 'Unknown time';
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours ago`;
    return `${Math.floor(diffInMinutes / 1440)} days ago`;
  };

  const formatDateTime = (dateString: string): string => {
    if (!dateString) return 'No date';
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date >= today && date < tomorrow) {
      return `Today ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    } else if (date >= tomorrow && date < new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000)) {
      return `Tomorrow ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + 
             date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }
  };

  const handleDeleteRecentActivity = (activityId: string) => {
    setRecentActivities(prev => prev.filter(activity => activity.id !== activityId));
    toast.success('Notification removed');
  };

  const handleDeleteUpcomingActivity = (activityId: string) => {
    setUpcomingActivities(prev => prev.filter(activity => activity.id !== activityId));
    toast.success('Notification removed');
  };

  const handleAddDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validate that title and company don't contain HTML/scripts
      if (containsHTMLOrScript(dealFormData.title) || containsHTMLOrScript(dealFormData.company)) {
        toast.error('Cannot create deal: HTML tags and scripts are not allowed. Please use plain text only.');
        return;
      }

      // Validate positive number
      const dealValue = parseFloat(dealFormData.value);
      if (dealValue <= 0 || isNaN(dealValue)) {
        toast.error('Please enter a positive number for deal value');
        return;
      }

      await dealsService.createDeal({
        title: dealFormData.title,
        value: dealValue || 0,
        company: dealFormData.company,
        contact: dealFormData.contact,
        stage_id: dealFormData.stage_id,
        pipeline_id: "1",
        expected_close_date: dealFormData.expectedCloseDate ? dealFormData.expectedCloseDate + "T00:00:00" : undefined
      });
      
      setDealFormData({
        title: '', value: '', company: '', contact: '', stage_id: 'qualification', expectedCloseDate: ''
      });
      setShowAddDealModal(false);
      toast.success('Deal created successfully!');
      
      // Redirect to deals page
      navigate('/deals');
    } catch (error) {
      console.error('Error creating deal:', error);
      toast.error('Failed to create deal');
    }
  };

  // Check if input contains HTML tags or scripts
  const containsHTMLOrScript = (input: string): boolean => {
    const htmlPattern = /<[^>]*>/g;
    const scriptPattern = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
    const jsPattern = /javascript:/gi;
    const eventPattern = /on\w+\s*=/gi;
    
    return htmlPattern.test(input) || 
           scriptPattern.test(input) || 
           jsPattern.test(input) || 
           eventPattern.test(input);
  };

  // Sanitize input to prevent script injection (only used for display, not validation)
  const sanitizeInput = (input: string): string => {
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // For text inputs, don't allow HTML at all
    if (name === 'title' || name === 'company') {
      // Enforce 255 character limit for text fields
      if (value.length > 255) {
        toast.error(`${name === 'title' ? 'Deal Title' : 'Company'} cannot exceed 255 characters`);
        return;
      }
      
      // Check if input contains HTML/scripts
      if (containsHTMLOrScript(value)) {
        toast.error('HTML tags and scripts are not allowed. Please enter plain text only.');
        return; // Don't update the state with invalid input
      }
    }
    
    setDealFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCloseAddDealModal = () => {
    setShowAddDealModal(false);
    setDealFormData({
      title: '',
      value: '',
      company: '',
      contact: '',
      stage_id: 'qualification',
      expectedCloseDate: ''
    });
  };

  return (
    <div className="min-h-full">
      <div className="bg-white shadow">
        <div className="px-4 sm:px-6 lg:max-w-7xl lg:mx-auto lg:px-8">
          <div className="py-4 sm:py-6 md:flex md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center">
                <div>
                  <div className="flex items-center">
                    <h1 className="ml-0 text-2xl font-bold leading-7 text-gray-900 sm:truncate">
                      Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {currentUser?.full_name?.split(' ')[0] || 'there'}! 👋
                    </h1>
                  </div>
                  <dl className="flex flex-col sm:flex-row">
                    <dt className="sr-only">Current date</dt>
                    <dd className="text-xs sm:text-sm text-gray-500 mt-1">
                      {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 md:mt-0 md:ml-4 items-stretch sm:items-center">
              <div className="hidden sm:block"><BackendStatus /></div>
              <button type="button" onClick={() => setShowAddDealModal(true)} className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-200">
                <PlusIcon className="h-4 w-4 mr-2" />Add Deal
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:max-w-7xl lg:mx-auto lg:px-8 py-8">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {stats.map((item) => (
            <div key={item.name} className="relative bg-white pt-5 px-4 pb-12 sm:pt-6 sm:px-6 shadow rounded-lg overflow-hidden">
              <dt>
                <div className="absolute bg-primary-500 rounded-md p-3">
                  <item.icon className="h-6 w-6 text-white" aria-hidden="true" />
                </div>
                <p className="ml-16 text-sm font-medium text-gray-500 truncate">{item.name}</p>
              </dt>
              <dd className="ml-16 pb-6 flex items-baseline sm:pb-7">
                <p className="text-2xl font-semibold text-gray-900">{item.value}</p>
                <p className={`ml-2 flex items-baseline text-sm font-semibold ${item.changeType === 'positive' ? 'text-green-600' : 'text-red-600'}`}>
                  {item.changeType === 'positive' ? <ArrowTrendingUpIcon className="self-center flex-shrink-0 h-4 w-4 text-green-500" /> : <ArrowTrendingDownIcon className="self-center flex-shrink-0 h-4 w-4 text-red-500" />}
                  <span className="ml-1">{item.change}</span>
                </p>
              </dd>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Activities with fixed height and scroll */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Activities</h3>
              <button onClick={fetchActivities} className="text-sm text-primary-600 hover:text-primary-700">Refresh</button>
            </div>
            <div className="h-80 overflow-y-auto">
              {recentActivities.length > 0 ? (
                <ul className="divide-y divide-gray-200">
                  {recentActivities.map((activity) => (
                    <li key={activity.id} className="px-6 py-4 hover:bg-gray-50 transition-colors duration-200 group">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 flex-1">
                          <div className={`w-2 h-2 rounded-full ${activity.type === 'call' ? 'bg-green-400' : activity.type === 'email' ? 'bg-blue-400' : activity.type === 'meeting' ? 'bg-purple-400' : activity.type === 'task' ? 'bg-yellow-400' : 'bg-gray-400'}`}></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{activity.description}</p>
                            <p className="text-sm text-gray-500">{activity.time} • {activity.status}</p>
                          </div>
                        </div>
                        <button onClick={() => handleDeleteRecentActivity(activity.id)} className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-red-500 hover:text-red-700 p-1">
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <p>No recent activities</p>
                </div>
              )}
            </div>
          </div>

          {/* Upcoming Activities with fixed height and scroll */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Upcoming Activities</h3>
              <button onClick={fetchActivities} className="text-sm text-primary-600 hover:text-primary-700">Refresh</button>
            </div>
            <div className="h-80 overflow-y-auto">
              {upcomingActivities.length > 0 ? (
                <ul className="divide-y divide-gray-200">
                  {upcomingActivities.map((activity) => (
                    <li key={activity.id} className="px-6 py-4 hover:bg-gray-50 transition-colors duration-200 group">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 flex-1">
                          <div className={`w-2 h-2 rounded-full ${activity.priority === 'high' ? 'bg-red-400' : activity.priority === 'medium' ? 'bg-yellow-400' : 'bg-green-400'}`}></div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">{activity.title}</p>
                            <p className="text-sm text-gray-500">{activity.contact}</p>
                          </div>
                        </div>
                        <div className="text-right flex items-center space-x-2">
                          <div>
                            <p className="text-sm text-gray-900">{activity.time}</p>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${activity.priority === 'high' ? 'bg-red-100 text-red-800' : activity.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                              {activity.priority} priority
                            </span>
                          </div>
                          <button onClick={() => handleDeleteUpcomingActivity(activity.id)} className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-red-500 hover:text-red-700 p-1">
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <p>No upcoming activities</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Pipeline Overview */}
        <div className="mt-8 bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Pipeline Overview</h3>
          </div>
          <div className="px-6 py-4">
            <div className="text-center text-gray-500 py-12">
              <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-4">Pipeline charts will be displayed here</p>
              <p className="text-sm">Connect to your analytics API to see detailed charts</p>
            </div>
          </div>
        </div>
      </div>

      {/* Add Deal Modal */}
      {showAddDealModal && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-[9999] flex items-center justify-center p-4" 
          onClick={handleCloseAddDealModal}
          onMouseDown={(e) => e.target === e.currentTarget && e.preventDefault()}
          style={{ isolation: 'isolate' }}
        >
          <div className="relative mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white pointer-events-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Add New Deal</h3>
              <button onClick={handleCloseAddDealModal} className="text-gray-400 hover:text-gray-600 transition-colors duration-200">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddDeal} className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  name="title"
                  placeholder="Deal Title"
                  value={dealFormData.title}
                  onChange={handleInputChange}
                  required
                  maxLength={255}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                <p className="text-xs text-gray-400 mt-1">{dealFormData.title.length}/255</p>
              </div>
              <input
                type="number"
                name="value"
                placeholder="Deal Value"
                value={dealFormData.value}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (e.key === '-' || e.key === 'e' || e.key === 'E') {
                    e.preventDefault();
                  }
                }}
                required
                min="0.01"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <div className="relative">
                <input
                  type="text"
                  name="company"
                  placeholder="Company"
                  value={dealFormData.company}
                  onChange={handleInputChange}
                  maxLength={255}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                <p className="text-xs text-gray-400 mt-1">{dealFormData.company.length}/255</p>
              </div>
              <SearchableContactSelect
                contacts={contacts}
                value={dealFormData.contact}
                onChange={(value) => setDealFormData(prev => ({ ...prev, contact: value }))}
                placeholder="Search and select contact..."
              />
              <select
                name="stage_id"
                value={dealFormData.stage_id}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                {stages.map(stage => (
                  <option key={stage.id} value={stage.id}>{stage.name}</option>
                ))}
              </select>
              <div className="relative">
                <input
                  type="date"
                  name="expectedCloseDate"
                  placeholder="Expected Close Date"
                  value={dealFormData.expectedCloseDate}
                  onChange={handleInputChange}
                  min={getTodayDate()}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 cursor-pointer"
                  onClick={(e) => e.currentTarget.showPicker && e.currentTarget.showPicker()}
                />
                {dealFormData.expectedCloseDate && (
                  <p className="text-xs text-gray-500 mt-1">
                    Deal will be active until {new Date(dealFormData.expectedCloseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                )}
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseAddDealModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
                >
                  Create Deal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
