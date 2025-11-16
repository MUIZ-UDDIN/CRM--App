import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import {
  Building2,
  Users,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
  PieChart,
  Activity,
  Ban,
  Trash2,
  RefreshCw
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://sunstonecrm.com';

interface CompanyInfo {
  id: string;
  name: string;
  status: string;
  subscription_status: string;
  trial_ends_at: string | null;
  days_remaining: number;
  user_count: number;
  deal_count: number;
  created_at: string;
}

interface PlatformMetrics {
  total_companies: number;
  active_subscriptions: number;
  trial_companies: number;
  expired_companies: number;
  suspended_companies: number;
  total_users: number;
  total_deals: number;
  total_revenue: number;
  companies: CompanyInfo[];
}

interface AuditLogEntry {
  id: string;
  action: string;
  target_company: string;
  performed_by: string;
  timestamp: string;
  details: string;
}

const PlatformDashboard: React.FC = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<CompanyInfo | null>(null);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (user?.role === 'super_admin') {
      fetchPlatformMetrics();
      fetchAuditLogs();
    }
  }, [user]);

  const fetchPlatformMetrics = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/api/platform/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMetrics(response.data);
    } catch (error: any) {
      console.error('Error fetching platform metrics:', error);
      toast.error(error.response?.data?.detail || 'Failed to load platform metrics');
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/api/platform/audit-logs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAuditLogs(response.data);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      // Don't show error toast for audit logs - it's not critical
    }
  };

  const handleSuspendCompany = async (companyId: string) => {
    try {
      setActionLoading(true);
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_BASE_URL}/api/platform/companies/${companyId}/suspend`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Company suspended successfully');
      setShowSuspendModal(false);
      setSelectedCompany(null);
      fetchPlatformMetrics();
      fetchAuditLogs();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to suspend company');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnsuspendCompany = async (companyId: string) => {
    try {
      setActionLoading(true);
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_BASE_URL}/api/platform/companies/${companyId}/unsuspend`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Company unsuspended successfully');
      fetchPlatformMetrics();
      fetchAuditLogs();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to unsuspend company');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteCompany = async (companyId: string) => {
    if (!confirm('Are you sure you want to delete this company? This action cannot be undone.')) {
      return;
    }
    try {
      setActionLoading(true);
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE_URL}/api/platform/companies/${companyId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Company deleted successfully');
      fetchPlatformMetrics();
      fetchAuditLogs();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to delete company');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
      active: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Active' },
      trial: { color: 'bg-blue-100 text-blue-800', icon: Clock, label: 'Trial' },
      expired: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Expired' },
      suspended: { color: 'bg-gray-100 text-gray-800', icon: Ban, label: 'Suspended' },
    };
    const config = statusConfig[status] || statusConfig.active;
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </span>
    );
  };

  if (user?.role !== 'super_admin') {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Access denied. This page is only accessible to Super Admins.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Platform Dashboard</h1>
          <p className="text-gray-600 mt-1">Monitor and manage all companies on the platform</p>
        </div>
        <button
          onClick={fetchPlatformMetrics}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Companies</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{metrics?.total_companies || 0}</p>
            </div>
            <Building2 className="w-12 h-12 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Subscriptions</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{metrics?.active_subscriptions || 0}</p>
            </div>
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Trial Companies</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{metrics?.trial_companies || 0}</p>
            </div>
            <Clock className="w-12 h-12 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
              <p className="text-3xl font-bold text-green-600 mt-2">
                ${metrics?.total_revenue?.toFixed(2) || '0.00'}
              </p>
            </div>
            <DollarSign className="w-12 h-12 text-green-600" />
          </div>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{metrics?.total_users || 0}</p>
            </div>
            <Users className="w-10 h-10 text-purple-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Deals</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{metrics?.total_deals || 0}</p>
            </div>
            <TrendingUp className="w-10 h-10 text-orange-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Expired/Suspended</p>
              <p className="text-2xl font-bold text-red-600 mt-2">
                {(metrics?.expired_companies || 0) + (metrics?.suspended_companies || 0)}
              </p>
            </div>
            <AlertCircle className="w-10 h-10 text-red-600" />
          </div>
        </div>
      </div>

      {/* Companies Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">All Companies</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trial Ends
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Users
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Deals
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {metrics?.companies.map((company) => (
                <tr key={company.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Building2 className="w-5 h-5 text-gray-400 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{company.name}</div>
                        <div className="text-xs text-gray-500">
                          Created {new Date(company.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(company.subscription_status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {company.subscription_status === 'trial' && company.trial_ends_at ? (
                      <div>
                        <div>{new Date(company.trial_ends_at).toLocaleDateString()}</div>
                        <div className="text-xs text-gray-500">
                          {company.days_remaining} days remaining
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400">N/A</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {company.user_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {company.deal_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    {company.status === 'suspended' ? (
                      <button
                        onClick={() => handleUnsuspendCompany(company.id)}
                        disabled={actionLoading}
                        className="text-green-600 hover:text-green-900 disabled:opacity-50"
                        title="Unsuspend Company"
                      >
                        <CheckCircle className="w-5 h-5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedCompany(company);
                          setShowSuspendModal(true);
                        }}
                        disabled={actionLoading}
                        className="text-yellow-600 hover:text-yellow-900 disabled:opacity-50"
                        title="Suspend Company"
                      >
                        <Ban className="w-5 h-5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteCompany(company.id)}
                      disabled={actionLoading}
                      className="text-red-600 hover:text-red-900 disabled:opacity-50"
                      title="Delete Company"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Log */}
      {auditLogs.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Recent Actions</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {auditLogs.slice(0, 10).map((log) => (
                <div key={log.id} className="flex items-start space-x-3 text-sm">
                  <Activity className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-gray-900">
                      <span className="font-medium">{log.performed_by}</span> {log.action}{' '}
                      <span className="font-medium">{log.target_company}</span>
                    </p>
                    <p className="text-gray-500 text-xs mt-1">
                      {new Date(log.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Suspend Modal */}
      {showSuspendModal && selectedCompany && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Suspend Company</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to suspend <strong>{selectedCompany.name}</strong>? Users will not be
              able to access the system until the company is unsuspended.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowSuspendModal(false);
                  setSelectedCompany(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                onClick={() => handleSuspendCompany(selectedCompany.id)}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50"
                disabled={actionLoading}
              >
                {actionLoading ? 'Suspending...' : 'Suspend Company'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlatformDashboard;
