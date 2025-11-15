import React, { useState, useEffect } from 'react';
import { 
  CreditCardIcon, 
  BuildingOfficeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  EyeIcon,
  PencilIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient';
import toast from 'react-hot-toast';

interface CompanyBilling {
  company_id: string;
  company_name: string;
  plan: string;
  status: string;
  mrr: number;
  users_count: number;
  subscription_start: string;
  subscription_end: string;
  last_payment: string;
  next_billing: string;
}

export default function BillingManagement() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<CompanyBilling[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total_mrr: 0,
    active_subscriptions: 0,
    trial_subscriptions: 0,
    expired_subscriptions: 0
  });

  useEffect(() => {
    if (user?.role === 'super_admin') {
      fetchBillingData();
    }
  }, [user]);

  const fetchBillingData = async () => {
    try {
      setLoading(true);
      // Fetch companies with billing info
      const response = await apiClient.get('/admin-analytics/companies');
      
      // Mock billing data (replace with actual billing API)
      const mockBilling: CompanyBilling[] = response.data.companies.map((company: any) => ({
        company_id: company.id,
        company_name: company.name,
        plan: company.plan || 'free',
        status: company.status || 'active',
        mrr: calculateMRR(company.plan),
        users_count: company.user_count || 0,
        subscription_start: company.created_at,
        subscription_end: addMonths(company.created_at, 1),
        last_payment: company.created_at,
        next_billing: addMonths(new Date().toISOString(), 1)
      }));
      
      setCompanies(mockBilling);
      
      // Calculate stats - FREE plans are considered trial
      const totalMRR = mockBilling.reduce((sum, c) => sum + c.mrr, 0);
      const active = mockBilling.filter(c => c.status === 'active' && c.plan !== 'free').length;
      const trial = mockBilling.filter(c => c.plan === 'free' || c.status === 'trial').length;
      const expired = mockBilling.filter(c => c.status === 'expired' || c.status === 'suspended').length;
      
      setStats({
        total_mrr: totalMRR,
        active_subscriptions: active,
        trial_subscriptions: trial,
        expired_subscriptions: expired
      });
    } catch (error) {
      toast.error('Failed to load billing data');
    } finally {
      setLoading(false);
    }
  };

  const calculateMRR = (plan: string): number => {
    const pricing: Record<string, number> = {
      free: 0,
      starter: 29,
      professional: 99,
      enterprise: 299
    };
    return pricing[plan?.toLowerCase()] || 0;
  };

  const addMonths = (dateStr: string, months: number): string => {
    const date = new Date(dateStr);
    date.setMonth(date.getMonth() + months);
    return date.toISOString();
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      trial: 'bg-yellow-100 text-yellow-800',
      expired: 'bg-red-100 text-red-800',
      suspended: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || colors.active;
  };

  const getPlanColor = (plan: string) => {
    const colors: Record<string, string> = {
      free: 'bg-gray-100 text-gray-800',
      starter: 'bg-blue-100 text-blue-800',
      professional: 'bg-purple-100 text-purple-800',
      enterprise: 'bg-indigo-100 text-indigo-800'
    };
    return colors[plan?.toLowerCase()] || colors.free;
  };

  if (user?.role !== 'super_admin') {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">Only Super Admins can access billing management.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Billing Management</h1>
        <p className="text-gray-600">Manage subscriptions and billing across all companies</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total MRR</p>
              <p className="text-2xl font-bold text-gray-900">
                ${stats.total_mrr.toLocaleString()}
              </p>
            </div>
            <CreditCardIcon className="h-10 w-10 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active</p>
              <p className="text-2xl font-bold text-green-600">
                {stats.active_subscriptions}
              </p>
            </div>
            <CheckCircleIcon className="h-10 w-10 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Trial</p>
              <p className="text-2xl font-bold text-yellow-600">
                {stats.trial_subscriptions}
              </p>
            </div>
            <ClockIcon className="h-10 w-10 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Expired</p>
              <p className="text-2xl font-bold text-red-600">
                {stats.expired_subscriptions}
              </p>
            </div>
            <XCircleIcon className="h-10 w-10 text-red-500" />
          </div>
        </div>
      </div>

      {/* Companies Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Company
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  MRR
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Users
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Next Billing
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {companies.map((company) => (
                <tr key={company.company_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <BuildingOfficeIcon className="h-5 w-5 text-gray-400 mr-2 flex-shrink-0" />
                      <span className="font-medium text-gray-900 truncate max-w-xs" title={company.company_name}>
                        {company.company_name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPlanColor(company.plan)}`}>
                      {company.plan.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(company.status)}`}>
                      {company.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    ${company.mrr}/mo
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {company.users_count}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(company.next_billing).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => {
                        // Open company details in a new view or modal
                        toast.info(`Viewing details for ${company.company_name}`);
                        // TODO: Implement company details view
                      }}
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium"
                      title="View Company Details"
                    >
                      <EyeIcon className="h-4 w-4" />
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
