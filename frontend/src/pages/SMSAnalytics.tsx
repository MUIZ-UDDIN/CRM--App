import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface SMSAnalytics {
  total_sent: number;
  total_received: number;
  total_failed: number;
  total_delivered: number;
  success_rate: number;
  response_rate: number;
  avg_response_time_minutes: number | null;
}

export default function SMSAnalytics() {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<SMSAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const { token } = useAuth();
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  useEffect(() => {
    fetchAnalytics();
  }, [days]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/sms/analytics?days=${days}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      } else {
        toast.error('Failed to load analytics');
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No analytics data available</p>
      </div>
    );
  }

  const totalMessages = analytics.total_sent + analytics.total_received;

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="px-4 sm:px-6 lg:max-w-7xl lg:mx-auto lg:px-8">
          <div className="py-4 sm:py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
              <button
                onClick={() => navigate('/sms')}
                className="p-2 hover:bg-gray-100 rounded-lg flex-shrink-0"
              >
                <ArrowLeftIcon className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
              </button>
              <ChartBarIcon className="w-6 h-6 sm:w-8 sm:h-8 text-primary-600 flex-shrink-0" />
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-gray-900 truncate">SMS Analytics</h1>
                <p className="text-xs sm:text-sm text-gray-600 truncate">Track your SMS performance and engagement</p>
              </div>
            </div>
            <div className="flex-shrink-0 w-full sm:w-auto">
              <select
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="w-full sm:w-auto px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-xs sm:text-sm"
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
                <option value={365}>Last year</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6 lg:max-w-7xl lg:mx-auto lg:px-8 py-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {/* Total Messages */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Messages</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{totalMessages}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <ChartBarIcon className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-gray-600">
                {analytics.total_sent} sent, {analytics.total_received} received
              </span>
            </div>
          </div>

          {/* Success Rate */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Success Rate</p>
                <p className="text-3xl font-bold text-green-600 mt-2">
                  {analytics.success_rate.toFixed(1)}%
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircleIcon className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              {analytics.success_rate >= 95 ? (
                <span className="text-green-600 flex items-center">
                  <ArrowTrendingUpIcon className="w-4 h-4 mr-1" />
                  Excellent delivery
                </span>
              ) : (
                <span className="text-yellow-600 flex items-center">
                  <ArrowTrendingDownIcon className="w-4 h-4 mr-1" />
                  Needs improvement
                </span>
              )}
            </div>
          </div>

          {/* Response Rate */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Response Rate</p>
                <p className="text-3xl font-bold text-purple-600 mt-2">
                  {analytics.response_rate.toFixed(1)}%
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <ChartBarIcon className="w-8 h-8 text-purple-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-gray-600">
                Customer engagement metric
              </span>
            </div>
          </div>

          {/* Avg Response Time */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
                <p className="text-3xl font-bold text-orange-600 mt-2">
                  {analytics.avg_response_time_minutes 
                    ? `${Math.round(analytics.avg_response_time_minutes)}m`
                    : 'N/A'}
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <ClockIcon className="w-8 h-8 text-orange-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-gray-600">
                Time to customer reply
              </span>
            </div>
          </div>
        </div>

        {/* Detailed Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Delivery Status */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Delivery Status</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <CheckCircleIcon className="w-5 h-5 text-green-500 mr-2" />
                  <span className="text-sm text-gray-700">Delivered</span>
                </div>
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-900 mr-2">
                    {analytics.total_delivered}
                  </span>
                  <span className="text-xs text-gray-500">
                    ({((analytics.total_delivered / analytics.total_sent) * 100).toFixed(1)}%)
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <XCircleIcon className="w-5 h-5 text-red-500 mr-2" />
                  <span className="text-sm text-gray-700">Failed</span>
                </div>
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-900 mr-2">
                    {analytics.total_failed}
                  </span>
                  <span className="text-xs text-gray-500">
                    ({((analytics.total_failed / analytics.total_sent) * 100).toFixed(1)}%)
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <ClockIcon className="w-5 h-5 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-700">Pending</span>
                </div>
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-900 mr-2">
                    {analytics.total_sent - analytics.total_delivered - analytics.total_failed}
                  </span>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-6">
              <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                <span>Delivery Performance</span>
                <span>{analytics.success_rate.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${analytics.success_rate}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Engagement Metrics */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Engagement Metrics</h2>
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-700">Response Rate</span>
                  <span className="text-sm font-medium text-gray-900">
                    {analytics.response_rate.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${analytics.response_rate}%` }}
                  ></div>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {Math.round((analytics.response_rate / 100) * analytics.total_sent)} customers responded
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-700">Outbound Messages</span>
                  <span className="text-sm font-medium text-gray-900">
                    {analytics.total_sent}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(analytics.total_sent / totalMessages) * 100}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-700">Inbound Messages</span>
                  <span className="text-sm font-medium text-gray-900">
                    {analytics.total_received}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(analytics.total_received / totalMessages) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Insights */}
        <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">📊 Insights & Recommendations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {analytics.success_rate < 90 && (
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-sm font-medium text-yellow-900">⚠️ Low Delivery Rate</p>
                <p className="text-xs text-yellow-700 mt-1">
                  Your delivery rate is below 90%. Check your phone number quality and message content.
                </p>
              </div>
            )}

            {analytics.response_rate > 30 && (
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm font-medium text-green-900">✅ Great Engagement</p>
                <p className="text-xs text-green-700 mt-1">
                  Your response rate is excellent! Customers are actively engaging with your messages.
                </p>
              </div>
            )}

            {analytics.avg_response_time_minutes && analytics.avg_response_time_minutes > 60 && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm font-medium text-blue-900">💡 Response Time</p>
                <p className="text-xs text-blue-700 mt-1">
                  Consider enabling AI auto-responses to reply faster to customer inquiries.
                </p>
              </div>
            )}

            {analytics.total_sent > 100 && (
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-sm font-medium text-purple-900">🎯 High Volume</p>
                <p className="text-xs text-purple-700 mt-1">
                  You're sending high volumes. Consider using templates and number rotation for better deliverability.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
