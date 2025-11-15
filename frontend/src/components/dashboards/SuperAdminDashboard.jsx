/**
 * Super Admin Dashboard Component
 * 
 * This component displays the dashboard for Super Admin users,
 * showing system-wide metrics and management options.
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAdminDashboardAnalytics } from '../../services/adminAnalyticsService';
import { FaBuilding, FaUsers, FaCreditCard, FaExclamationTriangle } from 'react-icons/fa';

/**
 * Super Admin Dashboard Component
 * @returns {React.Component} Super Admin Dashboard component
 */
function SuperAdminDashboard() {
  // State for dashboard data
  const [stats, setStats] = useState({
    totalCompanies: 0,
    activeCompanies: 0,
    trialCompanies: 0,
    suspendedCompanies: 0,
    totalUsers: 0,
    totalRevenue: 0,
    pendingPayments: 0,
    recentCompanies: []
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Get super admin dashboard stats using the service with proper auth
        const data = await getAdminDashboardAnalytics();
        
        setStats(data);
        setError(null);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
        setError('Failed to load dashboard data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);
  
  // Sample subscription data for chart
  const subscriptionData = [
    { name: 'Jan', revenue: 4000 },
    { name: 'Feb', revenue: 4500 },
    { name: 'Mar', revenue: 5000 },
    { name: 'Apr', revenue: 4800 },
    { name: 'May', revenue: 5500 },
    { name: 'Jun', revenue: 6000 },
    { name: 'Jul', revenue: 6500 },
    { name: 'Aug', revenue: 7000 },
    { name: 'Sep', revenue: 7200 },
    { name: 'Oct', revenue: 7800 },
    { name: 'Nov', revenue: 8000 },
    { name: 'Dec', revenue: 8500 }
  ];
  
  if (loading) {
    return <div className="flex justify-center items-center h-64 text-gray-500">Loading dashboard data...</div>;
  }
  
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <FaExclamationTriangle className="text-red-500 text-4xl mb-4 mx-auto" />
        <p className="text-red-700 mb-4">{error}</p>
        <button 
          className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded" 
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="bg-blue-100 p-3 rounded-full">
                <FaBuilding className="text-blue-500 text-xl" />
              </div>
              <div className="text-right">
                <h3 className="text-3xl font-bold">{stats.totalCompanies}</h3>
                <p className="text-gray-500">Total Companies</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-6 py-3">
            <p className="text-xs text-gray-500">
              Active: {stats.activeCompanies} | Trial: {stats.trialCompanies} | Suspended: {stats.suspendedCompanies}
            </p>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="bg-green-100 p-3 rounded-full">
                <FaUsers className="text-green-500 text-xl" />
              </div>
              <div className="text-right">
                <h3 className="text-3xl font-bold">{stats.totalUsers}</h3>
                <p className="text-gray-500">Total Users</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-6 py-3">
            <p className="text-xs text-gray-500">Across all companies</p>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="bg-purple-100 p-3 rounded-full">
                <FaCreditCard className="text-purple-500 text-xl" />
              </div>
              <div className="text-right">
                <h3 className="text-3xl font-bold">${stats.totalRevenue.toLocaleString()}</h3>
                <p className="text-gray-500">Total Revenue</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-6 py-3">
            <p className="text-xs text-gray-500">Monthly recurring</p>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="bg-yellow-100 p-3 rounded-full">
                <FaExclamationTriangle className="text-yellow-500 text-xl" />
              </div>
              <div className="text-right">
                <h3 className="text-3xl font-bold">${stats.pendingPayments.toLocaleString()}</h3>
                <p className="text-gray-500">Pending Payments</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-6 py-3">
            <p className="text-xs text-gray-500">Requires attention</p>
          </div>
        </div>
      </div>
      
      {/* Revenue Chart */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="border-b border-gray-200 px-6 py-4">
          <h5 className="font-medium text-gray-700">Monthly Subscription Revenue</h5>
        </div>
        <div className="p-6">
          <div className="h-80 w-full">
            {/* Replace with a simple placeholder for now */}
            <div className="flex items-center justify-center h-full bg-gray-50 rounded border border-gray-200">
              <p className="text-gray-500">Revenue Chart (Requires Chart.js or other library compatible with your stack)</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Recent Companies */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h5 className="font-medium text-gray-700">Recently Added Companies</h5>
          <Link to="/companies" className="text-sm bg-white hover:bg-gray-50 text-blue-600 py-1 px-3 border border-blue-600 rounded">
            View All Companies
          </Link>
        </div>
        <div className="p-6 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company Name</th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Users</th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subscription</th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trial Ends</th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stats.recentCompanies.map((company) => (
                <tr key={company.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{company.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${company.status.toLowerCase() === 'active' ? 'bg-green-100 text-green-800' : ''}
                      ${company.status.toLowerCase() === 'trial' ? 'bg-blue-100 text-blue-800' : ''}
                      ${company.status.toLowerCase() === 'suspended' ? 'bg-red-100 text-red-800' : ''}
                    `}>
                      {company.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{company.user_count}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${company.monthly_price}/mo</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {company.trial_ends_at ? new Date(company.trial_ends_at).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Link to={`/companies/${company.id}`} className="text-blue-600 hover:text-blue-900">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="border-b border-gray-200 px-6 py-4">
          <h5 className="font-medium text-gray-700">Quick Actions</h5>
        </div>
        <div className="p-6">
          <div className="flex flex-wrap gap-4">
            <Link to="/companies/new" className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded">
              Add New Company
            </Link>
            <Link to="/billing/plans" className="bg-cyan-600 hover:bg-cyan-700 text-white py-2 px-4 rounded">
              Manage Subscription Plans
            </Link>
            <Link to="/support/tickets" className="bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-4 rounded">
              View Support Tickets
            </Link>
            <Link to="/admin/settings" className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded">
              System Settings
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SuperAdminDashboard;
