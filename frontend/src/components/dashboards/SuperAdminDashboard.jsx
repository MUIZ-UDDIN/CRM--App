/**
 * Super Admin Dashboard Component
 * 
 * This component displays the dashboard for Super Admin users,
 * showing system-wide metrics and management options.
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAdminDashboardAnalytics } from '../../services/adminAnalyticsService';
import { FaBuilding, FaUsers, FaCreditCard, FaExclamationTriangle, FaClock, FaHandshake, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Super Admin Dashboard Component
 * @returns {React.Component} Super Admin Dashboard component
 */
function SuperAdminDashboard() {
  const navigate = useNavigate();
  
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
        <div 
          onClick={() => navigate('/admin')}
          className="bg-white rounded-lg shadow overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-200 hover:scale-105 transform"
        >
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
        
        <div 
          onClick={() => navigate('/admin')}
          className="bg-white rounded-lg shadow overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-200 hover:scale-105 transform"
        >
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
        
        <div 
          onClick={() => navigate('/deals')}
          className="bg-white rounded-lg shadow overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-200 hover:scale-105 transform"
        >
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
        
        <div 
          onClick={() => navigate('/deals')}
          className="bg-white rounded-lg shadow overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-200 hover:scale-105 transform"
        >
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
      
      {/* Recent & Upcoming Activities */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h5 className="font-medium text-gray-700 flex items-center gap-2">
            <FaClock className="text-blue-500" />
            Activities
          </h5>
          <Link to="/activities" className="text-sm bg-white hover:bg-gray-50 text-blue-600 py-1 px-3 border border-blue-600 rounded">
            View All
          </Link>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 divide-x divide-gray-200">
          {/* Recent Activities */}
          <div className="p-6">
            <h6 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <FaClock className="text-blue-500" />
              Recent Activities
            </h6>
            {stats.recent_activities && stats.recent_activities.length > 0 ? (
              <div className="overflow-y-auto max-h-80">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-2 py-2 bg-blue-50 text-left text-xs font-medium text-gray-500 uppercase w-20">Type</th>
                      <th className="px-2 py-2 bg-blue-50 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                      <th className="px-2 py-2 bg-blue-50 text-left text-xs font-medium text-gray-500 uppercase w-24">User</th>
                      <th className="px-2 py-2 bg-blue-50 text-left text-xs font-medium text-gray-500 uppercase w-20">Status</th>
                      <th className="px-2 py-2 bg-blue-50 text-left text-xs font-medium text-gray-500 uppercase w-24">Date</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {stats.recent_activities.slice(0, 5).map((activity) => (
                      <tr key={activity.id} className="hover:bg-gray-50">
                        <td className="px-2 py-2 text-xs text-gray-900 capitalize truncate">{activity.type}</td>
                        <td className="px-2 py-2 text-xs text-gray-900">
                          <div className="truncate max-w-[120px]" title={activity.title}>
                            {activity.title}
                          </div>
                        </td>
                        <td className="px-2 py-2 text-xs text-gray-500 truncate">{activity.user_name}</td>
                        <td className="px-2 py-2 text-xs">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${activity.status === 'completed' ? 'bg-green-100 text-green-800' : ''}
                            ${activity.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : ''}
                            ${activity.status === 'cancelled' ? 'bg-red-100 text-red-800' : ''}
                            ${activity.status === 'overdue' ? 'bg-red-100 text-red-800' : ''}
                          `}>
                            {activity.status ? activity.status.charAt(0).toUpperCase() + activity.status.slice(1) : ''}
                          </span>
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-500">
                          {new Date(activity.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4 text-sm">No recent activities</p>
            )}
          </div>

          {/* Upcoming Activities */}
          <div className="p-6">
            <h6 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <FaClock className="text-blue-500" />
              Upcoming Activities
            </h6>
            {upcomingActivities && upcomingActivities.length > 0 ? (
              <div className="overflow-y-auto max-h-80">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-2 py-2 bg-blue-50 text-left text-xs font-medium text-gray-500 uppercase w-20">Type</th>
                      <th className="px-2 py-2 bg-blue-50 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                      <th className="px-2 py-2 bg-blue-50 text-left text-xs font-medium text-gray-500 uppercase w-24">User</th>
                      <th className="px-2 py-2 bg-blue-50 text-left text-xs font-medium text-gray-500 uppercase w-20">Status</th>
                      <th className="px-2 py-2 bg-blue-50 text-left text-xs font-medium text-gray-500 uppercase w-24">Due Date</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {upcomingActivities.slice(0, 5).map((activity) => (
                      <tr key={activity.id} className="hover:bg-gray-50">
                        <td className="px-2 py-2 text-xs text-gray-900 capitalize truncate">{activity.type}</td>
                        <td className="px-2 py-2 text-xs text-gray-900">
                          <div className="truncate max-w-[120px]" title={activity.title}>
                            {activity.title}
                          </div>
                        </td>
                        <td className="px-2 py-2 text-xs text-gray-500 truncate">{activity.user_name}</td>
                        <td className="px-2 py-2 text-xs">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${activity.status === 'completed' ? 'bg-green-100 text-green-800' : ''}
                            ${activity.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : ''}
                            ${activity.status === 'cancelled' ? 'bg-red-100 text-red-800' : ''}
                            ${activity.status === 'overdue' ? 'bg-red-100 text-red-800' : ''}
                          `}>
                            {activity.status ? activity.status.charAt(0).toUpperCase() + activity.status.slice(1) : ''}
                          </span>
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-500">
                          {new Date(activity.due_date).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4 text-sm">No upcoming activities</p>
            )}
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
                {(() => {
                  const maxValue = Math.max(...pipelineStages.map(s => s.total_value || 0));
                  return pipelineStages.slice(0, showAllStages ? pipelineStages.length : 4).map((stage) => {
                    const isHighest = stage.total_value === maxValue;
                    // Calculate bar width based on VALUE using square root scale
                    // This gives better visual distinction between small and large values
                    let barWidth = 0;
                    if (stage.total_value > 0 && maxValue > 0) {
                      // Square root scale: sqrt(value) / sqrt(max) * 100
                      // Better than log for showing differences in smaller values
                      barWidth = Math.max(3, (Math.sqrt(stage.total_value) / Math.sqrt(maxValue)) * 100);
                    }
                    return (
                      <div key={stage.stage_id} className="border-b border-gray-100 pb-3 last:border-0">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-gray-700 truncate max-w-[200px]" title={stage.stage_name}>{stage.stage_name}</span>
                          <span className="text-sm text-gray-600 font-medium">
                            ${(() => {
                              const value = stage.total_value || 0;
                              const absValue = Math.abs(value);
                              if (absValue >= 1e9) return (value / 1e9).toFixed(1) + 'B';
                              if (absValue >= 1e6) return (value / 1e6).toFixed(1) + 'M';
                              if (absValue >= 1e3) return (value / 1e3).toFixed(1) + 'K';
                              return Math.round(value).toLocaleString();
                            })()} ({stage.deal_count} deals)
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className={`h-3 rounded-full transition-all duration-300 ${
                              isHighest 
                                ? 'bg-gradient-to-r from-green-500 to-green-600' 
                                : 'bg-gradient-to-r from-blue-500 to-blue-600'
                            }`}
                            style={{ width: `${barWidth}%` }}
                          >
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
                
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
