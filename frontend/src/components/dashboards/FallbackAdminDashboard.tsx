import React from 'react';
import { 
  BuildingOfficeIcon, 
  UsersIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  MagnifyingGlassIcon,
  ChartBarIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';

// Fallback data for when the API is unavailable
const mockCompanies = [
  {
    id: '1',
    name: 'Acme Corporation',
    plan: 'enterprise',
    status: 'active',
    subscription_status: 'active',
    trial_ends_at: null,
    days_remaining: null,
    user_count: 15,
    created_at: '2023-01-15T00:00:00Z',
    domain: 'acme.com',
    logo_url: null,
    timezone: 'UTC',
    currency: 'USD'
  },
  {
    id: '2',
    name: 'Stark Industries',
    plan: 'pro',
    status: 'active',
    subscription_status: 'active',
    trial_ends_at: null,
    days_remaining: null,
    user_count: 8,
    created_at: '2023-02-20T00:00:00Z',
    domain: 'stark.com',
    logo_url: null,
    timezone: 'UTC',
    currency: 'USD'
  },
  {
    id: '3',
    name: 'Wayne Enterprises',
    plan: 'trial',
    status: 'active',
    subscription_status: 'trial',
    trial_ends_at: '2023-12-31T00:00:00Z',
    days_remaining: 7,
    user_count: 3,
    created_at: '2023-11-01T00:00:00Z',
    domain: 'wayne.com',
    logo_url: null,
    timezone: 'UTC',
    currency: 'USD'
  },
  {
    id: '4',
    name: 'Oscorp',
    plan: 'free',
    status: 'suspended',
    subscription_status: 'expired',
    trial_ends_at: '2023-10-15T00:00:00Z',
    days_remaining: 0,
    user_count: 2,
    created_at: '2023-09-15T00:00:00Z',
    domain: 'oscorp.com',
    logo_url: null,
    timezone: 'UTC',
    currency: 'USD'
  }
];

interface Company {
  id: string;
  name: string;
  plan: string;
  status: string;
  subscription_status: string;
  trial_ends_at: string | null;
  days_remaining: number | null;
  user_count: number;
  created_at: string;
  domain: string | null;
  logo_url: string | null;
  timezone: string;
  currency: string;
}

export default function FallbackAdminDashboard() {
  const stats = {
    total: mockCompanies.length,
    active: mockCompanies.filter(c => c.subscription_status === 'active').length,
    trial: mockCompanies.filter(c => c.subscription_status === 'trial' && (c.days_remaining || 0) > 0).length,
    expired: mockCompanies.filter(c => 
      c.subscription_status === 'expired' || 
      (c.subscription_status === 'trial' && (c.days_remaining || 0) === 0)
    ).length,
    totalUsers: mockCompanies.reduce((sum, c) => sum + c.user_count, 0)
  };

  const getSubscriptionBadge = (company: Company) => {
    if (company.subscription_status === 'trial') {
      const daysLeft = company.days_remaining || 0;
      
      // Show "Expired" if 0 days left
      if (daysLeft === 0) {
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 flex items-center gap-1">
            <XCircleIcon className="w-3 h-3" />
            Expired
          </span>
        );
      }
      
      const color = daysLeft <= 3 ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800';
      return (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${color} flex items-center gap-1`}>
          <ClockIcon className="w-3 h-3" />
          Trial: {daysLeft}d left
        </span>
      );
    }

    if (company.subscription_status === 'active') {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 flex items-center gap-1">
          <CheckCircleIcon className="w-3 h-3" />
          Active
        </span>
      );
    }

    if (company.subscription_status === 'expired') {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 flex items-center gap-1">
          <XCircleIcon className="w-3 h-3" />
          Expired
        </span>
      );
    }

    return (
      <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
        {company.subscription_status}
      </span>
    );
  };

  const getPlanBadge = (company: Company) => {
    const colors = {
      free: 'bg-gray-100 text-gray-800',
      pro: 'bg-blue-100 text-blue-800',
      enterprise: 'bg-purple-100 text-purple-800',
      trial: 'bg-yellow-100 text-yellow-800'
    };

    // Show "Trial" badge for companies on trial, regardless of their plan
    if (company.subscription_status === 'trial') {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
          TRIAL
        </span>
      );
    }

    const plan = company.plan.toLowerCase();
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[plan as keyof typeof colors] || colors.free}`}>
        {company.plan.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1920px] mx-auto">
      {/* Header with notice */}
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Super Admin Dashboard</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">Manage all companies and subscriptions</p>
        <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
          <p className="text-sm font-medium flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Limited functionality mode: Some server features are currently unavailable. Showing demo data.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Companies</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <BuildingOfficeIcon className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active</p>
              <p className="text-2xl font-bold text-green-600">{stats.active}</p>
            </div>
            <CheckCircleIcon className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">On Trial</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.trial}</p>
            </div>
            <ClockIcon className="w-8 h-8 text-yellow-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Expired</p>
              <p className="text-2xl font-bold text-red-600">{stats.expired}</p>
            </div>
            <XCircleIcon className="w-8 h-8 text-red-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
            </div>
            <UsersIcon className="w-8 h-8 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-3 sm:p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search companies..."
              className="w-full pl-10 pr-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filter */}
          <select
            className="w-full sm:w-auto px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="trial">Trial</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Companies Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Company
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Plan
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Subscription
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Users
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {mockCompanies.map((company) => (
              <tr key={company.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <BuildingOfficeIcon className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{company.name}</div>
                      <div className="text-sm text-gray-500">{company.id.slice(0, 8)}...</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getPlanBadge(company)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getSubscriptionBadge(company)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-1 text-sm text-gray-900">
                    <UsersIcon className="w-4 h-4 text-gray-400" />
                    {company.user_count}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(company.created_at).toLocaleDateString('en-US')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button 
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {/* Analytics Overview */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">New company registered</p>
                  <p className="text-xs text-gray-500">Wayne Enterprises</p>
                </div>
              </div>
              <span className="text-xs text-gray-500">2 days ago</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-blue-400 rounded-full mr-3"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Subscription upgraded</p>
                  <p className="text-xs text-gray-500">Stark Industries</p>
                </div>
              </div>
              <span className="text-xs text-gray-500">5 days ago</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-red-400 rounded-full mr-3"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Trial expired</p>
                  <p className="text-xs text-gray-500">Oscorp</p>
                </div>
              </div>
              <span className="text-xs text-gray-500">1 week ago</span>
            </div>
          </div>
        </div>

        {/* Revenue Overview */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Revenue Overview</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-500">Monthly Recurring Revenue</p>
              <div className="flex items-center mt-1">
                <CurrencyDollarIcon className="w-5 h-5 text-green-600 mr-1" />
                <p className="text-xl font-bold text-gray-900">$12,450</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-500">Annual Recurring Revenue</p>
              <div className="flex items-center mt-1">
                <CurrencyDollarIcon className="w-5 h-5 text-green-600 mr-1" />
                <p className="text-xl font-bold text-gray-900">$149,400</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-500 mb-2">Subscription Distribution</p>
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Enterprise</span>
                  <span>25%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-purple-500 h-2 rounded-full" style={{ width: '25%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Pro</span>
                  <span>50%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: '50%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Free/Trial</span>
                  <span>25%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '25%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
