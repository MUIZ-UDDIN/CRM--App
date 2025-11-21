/**
 * Sales Rep Dashboard Component
 * 
 * This component displays the dashboard for Sales Rep users,
 * showing personal metrics and tasks.
 */

import React, { useState, useEffect } from 'react';
import { getRoleDashboardAnalytics } from '../../services/roleAnalyticsService';
import { FaHandshake, FaPhoneAlt, FaEnvelope, FaClipboardList, FaExclamationTriangle, FaCalendarAlt, FaClock } from 'react-icons/fa';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Sales Rep Dashboard Component
 * @returns {React.Component} Sales Rep Dashboard component
 */
function SalesRepDashboard() {
  // State for dashboard data
  const [stats, setStats] = useState({
    user_role: '',
    metrics: {},
    charts: [],
    tables: []
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  
  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Get role-based dashboard stats
        const data = await getRoleDashboardAnalytics();
        setStats(data);
        
        // Get activities and pipeline data
        const token = localStorage.getItem('token');
        const analyticsResponse = await axios.get(`${API_URL}/api/admin-analytics/dashboard`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setDashboardData(analyticsResponse.data);
        
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-2xl font-bold">{stats.metrics?.my_deals || 0}</h3>
          <p className="text-gray-500">My Deals</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-2xl font-bold">{stats.metrics?.my_contacts || 0}</h3>
          <p className="text-gray-500">My Contacts</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-2xl font-bold">{stats.metrics?.my_activities || 0}</h3>
          <p className="text-gray-500">My Activities</p>
        </div>
      </div>
      {/* Recent & Upcoming Activities + Pipeline Stages */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activities */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FaClock className="text-blue-500" />
            My Recent Activities
          </h3>
          <div className="space-y-3">
            {dashboardData?.recent_activities && dashboardData.recent_activities.length > 0 ? (
              dashboardData.recent_activities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <FaClock className="text-blue-600 text-sm" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{activity.title}</p>
                    <p className="text-xs text-gray-400">{new Date(activity.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No recent activities</p>
            )}
          </div>
        </div>

        {/* Upcoming Activities */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FaClock className="text-green-500" />
            My Upcoming Activities
          </h3>
          <div className="space-y-3">
            {dashboardData?.upcoming_activities && dashboardData.upcoming_activities.length > 0 ? (
              dashboardData.upcoming_activities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <FaClock className="text-green-600 text-sm" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{activity.title}</p>
                    <p className="text-xs text-green-600 font-medium">
                      Due: {new Date(activity.due_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No upcoming activities</p>
            )}
          </div>
        </div>

        {/* Pipeline Stages Progress */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FaHandshake className="text-purple-500" />
            My Pipeline
          </h3>
          <div className="space-y-4">
            {dashboardData?.pipeline_stages && dashboardData.pipeline_stages.length > 0 ? (
              dashboardData.pipeline_stages.map((stage) => (
                <div key={stage.stage_id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{stage.stage_name}</span>
                    <span className="text-sm text-gray-600">{stage.deal_count} deals</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${stage.percentage}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{stage.percentage}% of total</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No pipeline data</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SalesRepDashboard;
