/**
 * Company Admin Dashboard Component
 * 
 * This component displays the dashboard for Company Admin users,
 * showing company-wide metrics and management options.
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../../config';
import { FaUsers, FaHandshake, FaPhoneAlt, FaEnvelope, FaExclamationTriangle } from 'react-icons/fa';

/**
 * Company Admin Dashboard Component
 * @returns {React.Component} Company Admin Dashboard component
 */
function CompanyAdminDashboard() {
  // State for dashboard data
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDeals: 0,
    totalContacts: 0,
    dealsByStage: [],
    recentDeals: [],
    topPerformers: [],
    subscriptionStatus: {
      status: 'active',
      trialEndsAt: null,
      nextBillingDate: null,
      monthlyPrice: 0
    },
    activityStats: {
      calls: 0,
      emails: 0,
      meetings: 0,
      tasks: 0
    }
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Get company admin dashboard stats
        const response = await axios.get(`${API_URL}/api/analytics/company-dashboard`);
        
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
  
  // Colors for pie chart
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];
  
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
      {/* Subscription Status */}
      <div className="w-full">
        <div className={`rounded-lg shadow overflow-hidden ${stats.subscriptionStatus.status === 'trial' ? 'bg-blue-600' : 'bg-green-600'} text-white`}>
          <div className="p-6">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center">
              <div className="mb-4 md:mb-0">
                <h4 className="text-xl font-semibold mb-2">Subscription Status: {stats.subscriptionStatus.status.toUpperCase()}</h4>
                {stats.subscriptionStatus.status === 'trial' && (
                  <p className="text-blue-100">
                    Your trial ends on {new Date(stats.subscriptionStatus.trialEndsAt).toLocaleDateString()}.
                    {' '}
                    <Link to="/billing" className="text-white underline hover:text-blue-200">Upgrade now</Link> to continue using all features.
                  </p>
                )}
                {stats.subscriptionStatus.status === 'active' && (
                  <p className="text-green-100">
                    Your next billing date is {new Date(stats.subscriptionStatus.nextBillingDate).toLocaleDateString()}.
                    Monthly subscription: ${stats.subscriptionStatus.monthlyPrice}/month.
                  </p>
                )}
              </div>
              <div>
                <Link to="/billing">
                  <button className="bg-transparent hover:bg-white hover:text-blue-600 text-white font-medium py-2 px-4 border border-white rounded transition-colors duration-200">
                    Manage Subscription
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="bg-blue-100 p-3 rounded-full">
                <FaUsers className="text-blue-500 text-xl" />
              </div>
              <div className="text-right">
                <h3 className="text-3xl font-bold">{stats.totalUsers}</h3>
                <p className="text-gray-500">Team Members</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-6 py-3">
            <Link to="/users" className="text-blue-600 hover:text-blue-800 text-sm">Manage Users</Link>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="bg-green-100 p-3 rounded-full">
                <FaHandshake className="text-green-500 text-xl" />
              </div>
              <div className="text-right">
                <h3 className="text-3xl font-bold">{stats.totalDeals}</h3>
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
                <h3 className="text-3xl font-bold">{stats.totalContacts}</h3>
                <p className="text-gray-500">Contacts</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-6 py-3">
            <Link to="/contacts" className="text-blue-600 hover:text-blue-800 text-sm">Manage Contacts</Link>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="bg-yellow-100 p-3 rounded-full">
                <FaPhoneAlt className="text-yellow-500 text-xl" />
              </div>
              <div className="text-right">
                <h3 className="text-3xl font-bold">{stats.activityStats.calls + stats.activityStats.emails}</h3>
                <p className="text-gray-500">Communications</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-6 py-3">
            <p className="text-xs text-gray-500">Calls: {stats.activityStats.calls} | Emails: {stats.activityStats.emails}</p>
          </div>
        </div>
      </div>
      
      {/* Deals by Stage */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="border-b border-gray-200 px-6 py-4">
            <h5 className="font-medium text-gray-700">Deals by Stage</h5>
          </div>
          <div className="p-6">
            <div className="h-80 w-full">
              {/* Replace with a simple placeholder for now */}
              <div className="flex items-center justify-center h-full bg-gray-50 rounded border border-gray-200">
                <p className="text-gray-500">Pie Chart (Requires Chart.js or other library compatible with your stack)</p>
              </div>
              
              {/* Simple text representation of the data */}
              <div className="mt-4 space-y-2">
                {stats.dealsByStage.map((stage, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-2" 
                        style={{ backgroundColor: ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'][index % 6] }}
                      ></div>
                      <span className="text-sm">{stage.name}</span>
                    </div>
                    <span className="text-sm font-medium">${stage.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* Top Performers */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="border-b border-gray-200 px-6 py-4">
            <h5 className="font-medium text-gray-700">Top Performers</h5>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {stats.topPerformers.map((performer, index) => (
                <div key={performer.id} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center">
                      <span className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center mr-3 text-sm">
                        {index + 1}
                      </span>
                      <span className="font-medium">{performer.name}</span>
                    </div>
                    <span className="text-gray-700 font-medium">${performer.value.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className={`h-2.5 rounded-full ${index === 0 ? 'bg-green-500' : index === 1 ? 'bg-blue-500' : 'bg-purple-500'}`}
                      style={{ width: `${performer.progress}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-gray-50 px-6 py-3">
            <Link to="/analytics/performance" className="text-blue-600 hover:text-blue-800 text-sm">View Full Performance Report</Link>
          </div>
        </div>
      </div>
      
      {/* Recent Deals */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h5 className="font-medium text-gray-700">Recent Deals</h5>
          <Link to="/deals" className="text-sm bg-white hover:bg-gray-50 text-blue-600 py-1 px-3 border border-blue-600 rounded">
            View All Deals
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
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{deal.owner}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Link to={`/deals/${deal.id}`} className="text-blue-600 hover:text-blue-900">
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
            <Link to="/users/new" className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded">
              Add Team Member
            </Link>
            <Link to="/deals/new" className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded">
              Create Deal
            </Link>
            <Link to="/contacts/import" className="bg-cyan-600 hover:bg-cyan-700 text-white py-2 px-4 rounded">
              Import Contacts
            </Link>
            <Link to="/company-settings" className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded">
              Company Settings
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CompanyAdminDashboard;
