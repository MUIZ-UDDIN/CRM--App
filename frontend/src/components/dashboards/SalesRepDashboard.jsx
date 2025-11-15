/**
 * Sales Rep Dashboard Component
 * 
 * This component displays the dashboard for Sales Rep users,
 * showing personal metrics and tasks.
 */

import React, { useState, useEffect } from 'react';
import { getRoleDashboardAnalytics } from '../../services/roleAnalyticsService';
import { FaHandshake, FaPhoneAlt, FaEnvelope, FaClipboardList, FaExclamationTriangle, FaCalendarAlt } from 'react-icons/fa';

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
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <p className="text-gray-500">More analytics coming soon...</p>
      </div>
    </div>
  );
}

export default SalesRepDashboard;
