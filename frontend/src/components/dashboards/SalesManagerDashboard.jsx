/**
 * Sales Manager Dashboard Component
 * 
 * This component displays the dashboard for Sales Manager users,
 * showing team metrics and management options.
 */

import React, { useState, useEffect } from 'react';
import { getRoleDashboardAnalytics } from '../../services/roleAnalyticsService';
import { FaUsers, FaHandshake, FaChartLine, FaExclamationTriangle } from 'react-icons/fa';

/**
 * Sales Manager Dashboard Component
 * @returns {React.Component} Sales Manager Dashboard component
 */
function SalesManagerDashboard() {
  // State for dashboard data
  const [stats, setStats] = useState({
    user_role: '',
    metrics: {},
    charts: [],
    tables: []
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Get role-based dashboard stats
        const data = await getRoleDashboardAnalytics();
        
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="bg-blue-100 p-3 rounded-full">
                <FaUsers className="text-blue-500 text-xl" />
              </div>
              <div className="text-right">
                <h3 className="text-3xl font-bold">{stats.metrics?.team_members || 0}</h3>
                <p className="text-gray-500">Team Members</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-6 py-3">
            <p className="text-xs text-gray-500">Your team</p>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="bg-green-100 p-3 rounded-full">
                <FaHandshake className="text-green-500 text-xl" />
              </div>
              <div className="text-right">
                <h3 className="text-3xl font-bold">{stats.metrics?.team_deals || 0}</h3>
                <p className="text-gray-500">Team Deals</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-6 py-3">
            <p className="text-xs text-gray-500">Active deals</p>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="bg-purple-100 p-3 rounded-full">
                <FaChartLine className="text-purple-500 text-xl" />
              </div>
              <div className="text-right">
                <h3 className="text-2xl font-bold">
                  ${(() => {
                    const value = stats.metrics?.team_deal_value || 0;
                    if (value >= 1000000000000) return (value / 1000000000000).toFixed(1) + 'T';
                    if (value >= 1000000000) return (value / 1000000000).toFixed(1) + 'B';
                    if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
                    if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
                    return value.toLocaleString();
                  })()}
                </h3>
                <p className="text-gray-500">Team Value</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-6 py-3">
            <p className="text-xs text-gray-500">Pipeline value</p>
          </div>
        </div>
      </div>

      {/* Coming Soon */}
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <p className="text-gray-500">More analytics coming soon...</p>
      </div>
    </div>
  );
}

export default SalesManagerDashboard;
