import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BackendStatus from '../components/common/BackendStatus';
import toast from 'react-hot-toast';
import { 
  CurrencyDollarIcon, 
  UserGroupIcon, 
  ChartBarIcon,
  CalendarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  XMarkIcon,
  PlusIcon
} from '@heroicons/react/24/outline';

export default function Dashboard() {
  const navigate = useNavigate();
  const [showAddDealModal, setShowAddDealModal] = useState(false);
  const [dealFormData, setDealFormData] = useState({
    title: '',
    value: '',
    company: '',
    contact: '',
    stage: 'qualification',
    expectedCloseDate: ''
  });

  // Mock data - in production, this would come from your API
  const stats = [
    {
      name: 'Total Pipeline',
      value: '$156,420',
      change: '+12.5%',
      changeType: 'positive' as const,
      icon: CurrencyDollarIcon,
    },
    {
      name: 'Active Deals',
      value: '23',
      change: '+3',
      changeType: 'positive' as const,
      icon: ChartBarIcon,
    },
    {
      name: 'Win Rate',
      value: '87%',
      change: '+2.1%',
      changeType: 'positive' as const,
      icon: ArrowTrendingUpIcon,
    },
    {
      name: 'Activities Today',
      value: '15',
      change: '-2',
      changeType: 'negative' as const,
      icon: CalendarIcon,
    },
  ];

  const recentActivities = [
    {
      id: 1,
      type: 'call',
      description: 'Called David Tech from TechCorp',
      time: '2 min ago',
      status: 'completed',
    },
    {
      id: 2,
      type: 'email',
      description: 'Sent proposal to Green Energy Inc',
      time: '5 min ago',
      status: 'sent',
    },
    {
      id: 3,
      type: 'meeting',
      description: 'Demo scheduled with FinanceFirst',
      time: '10 min ago',
      status: 'scheduled',
    },
    {
      id: 4,
      type: 'deal',
      description: 'Deal moved to Negotiation stage',
      time: '15 min ago',
      status: 'updated',
    },
    {
      id: 5,
      type: 'contact',
      description: 'New contact added: Amanda Health',
      time: '20 min ago',
      status: 'created',
    },
  ];

  const upcomingActivities = [
    {
      id: 1,
      type: 'call',
      title: 'Follow-up call with David Tech',
      time: 'Today 2:00 PM',
      contact: 'David Tech - TechCorp',
      priority: 'high' as const,
    },
    {
      id: 2,
      type: 'meeting',
      title: 'Product demo for FinanceFirst',
      time: 'Tomorrow 10:00 AM',
      contact: 'Robert Finance - FinanceFirst',
      priority: 'high' as const,
    },
    {
      id: 3,
      type: 'email',
      title: 'Send proposal follow-up',
      time: 'Tomorrow 3:00 PM',
      contact: 'Michael Green - Green Energy',
      priority: 'medium' as const,
    },
  ];

  // Handle deal form submission
  const handleAddDeal = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset form and close modal
    setDealFormData({
      title: '',
      value: '',
      company: '',
      contact: '',
      stage: 'qualification',
      expectedCloseDate: ''
    });
    setShowAddDealModal(false);
    
    // Show success message
    toast.success('Deal created successfully!');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setDealFormData(prev => ({
      ...prev,
      [name]: value
    }));
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
                      Good morning, John! 👋
                    </h1>
                  </div>
                  <dl className="flex flex-col sm:flex-row">
                    <dt className="sr-only">Current date</dt>
                    <dd className="text-xs sm:text-sm text-gray-500 mt-1">
                      {new Date().toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 md:mt-0 md:ml-4 items-stretch sm:items-center">
              <div className="hidden sm:block">
                <BackendStatus />
              </div>
              <button
                type="button"
                onClick={() => setShowAddDealModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-200"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Deal
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:max-w-7xl lg:mx-auto lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {stats.map((item) => (
            <div
              key={item.name}
              className="relative bg-white pt-5 px-4 pb-12 sm:pt-6 sm:px-6 shadow rounded-lg overflow-hidden"
            >
              <dt>
                <div className="absolute bg-primary-500 rounded-md p-3">
                  <item.icon className="h-6 w-6 text-white" aria-hidden="true" />
                </div>
                <p className="ml-16 text-sm font-medium text-gray-500 truncate">{item.name}</p>
              </dt>
              <dd className="ml-16 pb-6 flex items-baseline sm:pb-7">
                <p className="text-2xl font-semibold text-gray-900">{item.value}</p>
                <p
                  className={`ml-2 flex items-baseline text-sm font-semibold ${
                    item.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {item.changeType === 'positive' ? (
                    <ArrowTrendingUpIcon className="self-center flex-shrink-0 h-4 w-4 text-green-500" />
                  ) : (
                    <ArrowTrendingDownIcon className="self-center flex-shrink-0 h-4 w-4 text-red-500" />
                  )}
                  <span className="ml-1">{item.change}</span>
                </p>
              </dd>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Activities */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Activities</h3>
            </div>
            <ul className="divide-y divide-gray-200">
              {recentActivities.map((activity) => (
                <li key={activity.id} className="px-6 py-4 hover:bg-gray-50 transition-colors duration-200">
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${
                      activity.type === 'call' ? 'bg-green-400' :
                      activity.type === 'email' ? 'bg-blue-400' :
                      activity.type === 'meeting' ? 'bg-purple-400' :
                      activity.type === 'deal' ? 'bg-yellow-400' :
                      'bg-gray-400'
                    }`}></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {activity.description}
                      </p>
                      <p className="text-sm text-gray-500">{activity.time}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Upcoming Activities */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Upcoming Activities</h3>
            </div>
            <ul className="divide-y divide-gray-200">
              {upcomingActivities.map((activity) => (
                <li key={activity.id} className="px-6 py-4 hover:bg-gray-50 transition-colors duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full ${
                        activity.priority === 'high' ? 'bg-red-400' :
                        activity.priority === 'medium' ? 'bg-yellow-400' :
                        'bg-green-400'
                      }`}></div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {activity.title}
                        </p>
                        <p className="text-sm text-gray-500">{activity.contact}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-900">{activity.time}</p>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        activity.priority === 'high' ? 'bg-red-100 text-red-800' :
                        activity.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {activity.priority} priority
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
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
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Add New Deal</h3>
              <button
                onClick={() => setShowAddDealModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddDeal} className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  Deal Title *
                </label>
                <input
                  type="text"
                  name="title"
                  id="title"
                  required
                  value={dealFormData.title}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter deal title"
                />
              </div>
              
              <div>
                <label htmlFor="value" className="block text-sm font-medium text-gray-700 mb-1">
                  Deal Value
                </label>
                <input
                  type="number"
                  name="value"
                  id="value"
                  value={dealFormData.value}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter deal value"
                />
              </div>
              
              <div>
                <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1">
                  Company
                </label>
                <input
                  type="text"
                  name="company"
                  id="company"
                  value={dealFormData.company}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter company name"
                />
              </div>
              
              <div>
                <label htmlFor="contact" className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Person
                </label>
                <input
                  type="text"
                  name="contact"
                  id="contact"
                  value={dealFormData.contact}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter contact person"
                />
              </div>
              
              <div>
                <label htmlFor="stage" className="block text-sm font-medium text-gray-700 mb-1">
                  Stage
                </label>
                <select
                  name="stage"
                  id="stage"
                  value={dealFormData.stage}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="qualification">Qualification</option>
                  <option value="proposal">Proposal</option>
                  <option value="negotiation">Negotiation</option>
                  <option value="closing">Closing</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="expectedCloseDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Expected Close Date
                </label>
                <input
                  type="date"
                  name="expectedCloseDate"
                  id="expectedCloseDate"
                  value={dealFormData.expectedCloseDate}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddDealModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
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
