/**
 * Sales Manager Dashboard Component
 * 
 * This component displays the dashboard for Sales Manager users,
 * showing team metrics and management options.
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../../config';
import { FaUsers, FaHandshake, FaPhoneAlt, FaEnvelope, FaExclamationTriangle } from 'react-icons/fa';

/**
 * Sales Manager Dashboard Component
 * @returns {React.Component} Sales Manager Dashboard component
 */
function SalesManagerDashboard() {
  // State for dashboard data
  const [stats, setStats] = useState({
    teamMembers: 0,
    activeDeals: 0,
    totalLeads: 0,
    dealsByStage: [],
    teamPerformance: [],
    recentActivities: []
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Get sales manager dashboard stats
        const response = await axios.get(`${API_URL}/api/analytics/team-dashboard`);
        
        setStats(response.data);
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
                <h3 className="text-3xl font-bold">{stats.teamMembers}</h3>
                <p className="text-gray-500">Team Members</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-6 py-3">
            <Link to="/users" className="text-blue-600 hover:text-blue-800 text-sm">Manage Team</Link>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="bg-green-100 p-3 rounded-full">
                <FaHandshake className="text-green-500 text-xl" />
              </div>
              <div className="text-right">
                <h3 className="text-3xl font-bold">{stats.activeDeals}</h3>
                <p className="text-gray-500">Active Deals</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-6 py-3">
            <Link to="/deals" className="text-blue-600 hover:text-blue-800 text-sm">View All Deals</Link>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="bg-purple-100 p-3 rounded-full">
                <FaEnvelope className="text-purple-500 text-xl" />
              </div>
              <div className="text-right">
                <h3 className="text-3xl font-bold">{stats.totalLeads}</h3>
                <p className="text-gray-500">Total Leads</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-6 py-3">
            <Link to="/leads" className="text-blue-600 hover:text-blue-800 text-sm">Manage Leads</Link>
          </div>
        </div>
      </div>
      
      {/* Team Performance */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="border-b border-gray-200 px-6 py-4">
          <h5 className="font-medium text-gray-700">Team Performance</h5>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {stats.teamPerformance.map((member) => (
              <div key={member.id} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                      {member.name.charAt(0)}
                    </div>
                    <span className="font-medium">{member.name}</span>
                  </div>
                  <span className="text-gray-700 font-medium">${member.value.toLocaleString()}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full" 
                    style={{ width: `${member.progress}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>{member.deals} deals</span>
                  <span>{member.progress}% of target</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Recent Activities */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h5 className="font-medium text-gray-700">Recent Team Activities</h5>
          <Link to="/activities" className="text-sm bg-white hover:bg-gray-50 text-blue-600 py-1 px-3 border border-blue-600 rounded">
            View All
          </Link>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {stats.recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-start pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 
                  ${activity.type === 'call' ? 'bg-green-100 text-green-600' : ''}
                  ${activity.type === 'email' ? 'bg-blue-100 text-blue-600' : ''}
                  ${activity.type === 'meeting' ? 'bg-purple-100 text-purple-600' : ''}
                  ${activity.type === 'note' ? 'bg-yellow-100 text-yellow-600' : ''}
                `}>
                  {activity.type === 'call' && <FaPhoneAlt />}
                  {activity.type === 'email' && <FaEnvelope />}
                  {activity.type === 'meeting' && <FaUsers />}
                  {activity.type === 'note' && <FaHandshake />}
                </div>
                <div>
                  <div className="flex items-center mb-1">
                    <span className="font-medium mr-2">{activity.user}</span>
                    <span className="text-sm text-gray-500">{activity.time}</span>
                  </div>
                  <p className="text-sm text-gray-700">{activity.description}</p>
                  <div className="mt-2">
                    <Link to={`/deals/${activity.dealId}`} className="text-xs text-blue-600 hover:text-blue-800">
                      View Deal
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="border-b border-gray-200 px-6 py-4">
          <h5 className="font-medium text-gray-700">Quick Actions</h5>
        </div>
        <div className="p-6">
          <div className="flex flex-wrap gap-4">
            <Link to="/leads/assign" className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded">
              Assign Leads
            </Link>
            <Link to="/deals/new" className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded">
              Create Deal
            </Link>
            <Link to="/analytics/team" className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded">
              Team Analytics
            </Link>
            <Link to="/team/settings" className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded">
              Team Settings
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SalesManagerDashboard;
