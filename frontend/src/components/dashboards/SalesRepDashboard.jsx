/**
 * Sales Rep Dashboard Component
 * 
 * This component displays the dashboard for Sales Rep users,
 * showing personal metrics and tasks.
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../../config';
import { FaHandshake, FaPhoneAlt, FaEnvelope, FaClipboardList, FaExclamationTriangle, FaCalendarAlt } from 'react-icons/fa';

/**
 * Sales Rep Dashboard Component
 * @returns {React.Component} Sales Rep Dashboard component
 */
function SalesRepDashboard() {
  // State for dashboard data
  const [stats, setStats] = useState({
    myLeads: 0,
    myDeals: 0,
    activitiesThisWeek: 0,
    upcomingTasks: [],
    recentDeals: [],
    performance: {
      target: 0,
      achieved: 0,
      percentage: 0
    }
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Get sales rep dashboard stats
        const response = await axios.get(`${API_URL}/api/analytics/personal-dashboard`);
        
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
      {/* Performance Overview */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="border-b border-gray-200 px-6 py-4">
          <h5 className="font-medium text-gray-700">Your Performance</h5>
        </div>
        <div className="p-6">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="mb-4 md:mb-0">
              <div className="text-3xl font-bold text-gray-800">${stats.performance.achieved.toLocaleString()}</div>
              <div className="text-sm text-gray-500">of ${stats.performance.target.toLocaleString()} target</div>
            </div>
            
            <div className="w-full md:w-2/3 bg-gray-200 rounded-full h-4">
              <div 
                className={`h-4 rounded-full ${stats.performance.percentage >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                style={{ width: `${Math.min(stats.performance.percentage, 100)}%` }}
              ></div>
            </div>
            
            <div className="mt-2 md:mt-0 md:ml-4">
              <div className="text-xl font-semibold text-gray-800">{stats.performance.percentage}%</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="bg-blue-100 p-3 rounded-full">
                <FaHandshake className="text-blue-500 text-xl" />
              </div>
              <div className="text-right">
                <h3 className="text-3xl font-bold">{stats.myLeads}</h3>
                <p className="text-gray-500">Active Leads</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-6 py-3">
            <Link to="/leads" className="text-blue-600 hover:text-blue-800 text-sm">View My Leads</Link>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="bg-green-100 p-3 rounded-full">
                <FaHandshake className="text-green-500 text-xl" />
              </div>
              <div className="text-right">
                <h3 className="text-3xl font-bold">{stats.myDeals}</h3>
                <p className="text-gray-500">Active Deals</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-6 py-3">
            <Link to="/deals" className="text-blue-600 hover:text-blue-800 text-sm">View My Deals</Link>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="bg-purple-100 p-3 rounded-full">
                <FaPhoneAlt className="text-purple-500 text-xl" />
              </div>
              <div className="text-right">
                <h3 className="text-3xl font-bold">{stats.activitiesThisWeek}</h3>
                <p className="text-gray-500">Activities This Week</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-6 py-3">
            <Link to="/activities" className="text-blue-600 hover:text-blue-800 text-sm">View Activities</Link>
          </div>
        </div>
      </div>
      
      {/* Upcoming Tasks */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h5 className="font-medium text-gray-700">Upcoming Tasks</h5>
          <Link to="/tasks" className="text-sm bg-white hover:bg-gray-50 text-blue-600 py-1 px-3 border border-blue-600 rounded">
            View All
          </Link>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {stats.upcomingTasks.map((task) => (
              <div key={task.id} className="flex items-start pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 
                  ${task.type === 'call' ? 'bg-green-100 text-green-600' : ''}
                  ${task.type === 'email' ? 'bg-blue-100 text-blue-600' : ''}
                  ${task.type === 'meeting' ? 'bg-purple-100 text-purple-600' : ''}
                  ${task.type === 'task' ? 'bg-yellow-100 text-yellow-600' : ''}
                `}>
                  {task.type === 'call' && <FaPhoneAlt />}
                  {task.type === 'email' && <FaEnvelope />}
                  {task.type === 'meeting' && <FaCalendarAlt />}
                  {task.type === 'task' && <FaClipboardList />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{task.title}</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      task.priority === 'high' ? 'bg-red-100 text-red-800' : 
                      task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 
                      'bg-green-100 text-green-800'
                    }`}>
                      {task.priority}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mb-1">{task.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">{task.due_date}</span>
                    <Link to={`/tasks/${task.id}`} className="text-xs text-blue-600 hover:text-blue-800">
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
            ))}
            
            {stats.upcomingTasks.length === 0 && (
              <div className="text-center py-4 text-gray-500">
                No upcoming tasks
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Recent Deals */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h5 className="font-medium text-gray-700">Recent Deals</h5>
          <Link to="/deals" className="text-sm bg-white hover:bg-gray-50 text-blue-600 py-1 px-3 border border-blue-600 rounded">
            View All
          </Link>
        </div>
        <div className="p-6 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deal Name</th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stage</th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stats.recentDeals.map((deal) => (
                <tr key={deal.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{deal.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{deal.client}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${deal.stage === 'Won' ? 'bg-green-100 text-green-800' : ''}
                      ${deal.stage === 'Negotiation' ? 'bg-yellow-100 text-yellow-800' : ''}
                      ${deal.stage === 'Proposal' ? 'bg-blue-100 text-blue-800' : ''}
                      ${deal.stage === 'Qualified' ? 'bg-purple-100 text-purple-800' : ''}
                      ${deal.stage === 'Lost' ? 'bg-red-100 text-red-800' : ''}
                    `}>
                      {deal.stage}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${deal.value.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Link to={`/deals/${deal.id}`} className="text-blue-600 hover:text-blue-900">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
              
              {stats.recentDeals.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                    No recent deals
                  </td>
                </tr>
              )}
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
            <Link to="/leads/new" className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded">
              Add New Lead
            </Link>
            <Link to="/deals/new" className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded">
              Create Deal
            </Link>
            <Link to="/tasks/new" className="bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-4 rounded">
              Add Task
            </Link>
            <Link to="/activities/log" className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded">
              Log Activity
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SalesRepDashboard;
