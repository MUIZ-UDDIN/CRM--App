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
    companies_count: 0,
    active_users_count: 0,
    total_users_count: 0,
    total_deals_count: 0,
    total_pipeline_value: 0,
    recent_activities: [],
    companies_by_size: [],
    deals_by_stage: [],
    user_activity: []
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
                <h3 className="text-3xl font-bold">{stats.companies_count || 0}</h3>
                <p className="text-gray-500">Total Companies</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-6 py-3">
            <p className="text-xs text-gray-500">
              System-wide metrics
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
                <h3 className="text-3xl font-bold">{stats.total_users_count || 0}</h3>
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
                <h3 className="text-2xl font-bold">
                  ${(stats.total_pipeline_value || 0) >= 1000000 
                    ? ((stats.total_pipeline_value || 0) / 1000000).toFixed(1) + 'M'
                    : (stats.total_pipeline_value || 0) >= 1000
                    ? ((stats.total_pipeline_value || 0) / 1000).toFixed(1) + 'K'
                    : (stats.total_pipeline_value || 0).toLocaleString()}
                </h3>
                <p className="text-gray-500">Pipeline Value</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-6 py-3">
            <p className="text-xs text-gray-500">Total deals value</p>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="bg-yellow-100 p-3 rounded-full">
                <FaExclamationTriangle className="text-yellow-500 text-xl" />
              </div>
              <div className="text-right">
                <h3 className="text-3xl font-bold">{stats.total_deals_count || 0}</h3>
                <p className="text-gray-500">Total Deals</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-6 py-3">
            <p className="text-xs text-gray-500">Across all companies</p>
          </div>
        </div>
      </div>
      
      {/* Recent Activities */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h5 className="font-medium text-gray-700">Recent Activities</h5>
          <Link to="/activities" className="text-sm bg-white hover:bg-gray-50 text-blue-600 py-1 px-3 border border-blue-600 rounded">
            View All Activities
          </Link>
        </div>
        <div className="p-6 overflow-x-auto">
          {stats.recent_activities && stats.recent_activities.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stats.recent_activities.map((activity) => (
                  <tr key={activity.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 capitalize">{activity.type}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-md">
                      <div className="truncate" title={activity.title}>
                        {activity.title && activity.title.length > 80 
                          ? activity.title.substring(0, 80) + '...' 
                          : activity.title}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{activity.user_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${activity.status === 'completed' ? 'bg-green-100 text-green-800' : ''}
                        ${activity.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : ''}
                        ${activity.status === 'cancelled' ? 'bg-red-100 text-red-800' : ''}
                      `}>
                        {activity.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(activity.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-gray-500 text-center py-4">No recent activities</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default SuperAdminDashboard;
