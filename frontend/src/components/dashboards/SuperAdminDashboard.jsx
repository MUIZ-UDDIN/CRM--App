/**
 * Super Admin Dashboard Component
 * 
 * This component displays the dashboard for Super Admin users,
 * showing system-wide metrics and management options.
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAdminDashboardAnalytics } from '../../services/adminAnalyticsService';
import { FaBuilding, FaUsers, FaCreditCard, FaExclamationTriangle, FaClock, FaHandshake, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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
  const [upcomingActivities, setUpcomingActivities] = useState([]);
  const [pipelineStages, setPipelineStages] = useState([]);
  const [showAllStages, setShowAllStages] = useState(false);
  
  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Get super admin dashboard stats using the service with proper auth
        const data = await getAdminDashboardAnalytics();
        setStats(data);
        
        // Get upcoming activities and pipeline stages
        const token = localStorage.getItem('token');
        const analyticsResponse = await axios.get(`${API_URL}/api/admin-analytics/dashboard`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setUpcomingActivities(analyticsResponse.data.upcoming_activities || []);
        setPipelineStages(analyticsResponse.data.pipeline_stages || []);
        
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
                <h3 className="text-2xl font-bold" title={`$${(stats.total_pipeline_value || 0).toLocaleString()}`}>
                  ${(() => {
                    const value = stats.total_pipeline_value || 0;
                    const absValue = Math.abs(value);
                    
                    // Format with appropriate suffix, keeping display under 6 characters
                    if (absValue >= 1e15) return (value / 1e15).toFixed(0) + 'Q'; // Quadrillion
                    if (absValue >= 1e12) return (value / 1e12).toFixed(absValue >= 1e14 ? 0 : 1) + 'T'; // Trillion
                    if (absValue >= 1e9) return (value / 1e9).toFixed(1) + 'B'; // Billion
                    if (absValue >= 1e6) return (value / 1e6).toFixed(1) + 'M'; // Million
                    if (absValue >= 1e3) return (value / 1e3).toFixed(1) + 'K'; // Thousand
                    return Math.round(value).toLocaleString();
                  })()}
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
      
      {/* Recent & Upcoming Activities Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activities */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
            <h5 className="font-medium text-gray-700 flex items-center gap-2">
              <FaClock className="text-blue-500" />
              Recent Activities
            </h5>
            <Link to="/activities" className="text-sm bg-white hover:bg-gray-50 text-blue-600 py-1 px-3 border border-blue-600 rounded">
              View All
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

        {/* Upcoming Activities */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="border-b border-gray-200 px-6 py-4">
            <h5 className="font-medium text-gray-700 flex items-center gap-2">
              <FaClock className="text-green-500" />
              Upcoming Activities
            </h5>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {upcomingActivities && upcomingActivities.length > 0 ? (
                upcomingActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-100">
                    <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <FaClock className="text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{activity.title}</p>
                      <p className="text-xs text-gray-600">{activity.user_name}</p>
                      <p className="text-xs text-green-600 font-semibold mt-1">
                        Due: {new Date(activity.due_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-8">No upcoming activities</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Pipeline Stages Progress */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="border-b border-gray-200 px-6 py-4">
          <h5 className="font-medium text-gray-700 flex items-center gap-2">
            <FaHandshake className="text-purple-500" />
            Pipeline Stages
          </h5>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {pipelineStages && pipelineStages.length > 0 ? (
              <>
                {pipelineStages.slice(0, showAllStages ? pipelineStages.length : 4).map((stage) => (
                  <div key={stage.stage_id} className="border-b border-gray-100 pb-3 last:border-0">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-700">{stage.stage_name}</span>
                      <span className="text-sm text-gray-600 font-medium">{stage.deal_count} deals</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-300 flex items-center justify-end pr-2"
                        style={{ width: `${stage.percentage}%` }}
                      >
                        <span className="text-xs text-white font-semibold">{stage.percentage}%</span>
                      </div>
                    </div>
                  </div>
                ))}
                
                {pipelineStages.length > 4 && (
                  <button
                    onClick={() => setShowAllStages(!showAllStages)}
                    className="w-full mt-4 py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    {showAllStages ? (
                      <>
                        <FaChevronUp />
                        Show Less
                      </>
                    ) : (
                      <>
                        <FaChevronDown />
                        Show All Stages ({pipelineStages.length - 4} more)
                      </>
                    )}
                  </button>
                )}
              </>
            ) : (
              <p className="text-gray-500 text-center py-4">No pipeline data</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SuperAdminDashboard;
