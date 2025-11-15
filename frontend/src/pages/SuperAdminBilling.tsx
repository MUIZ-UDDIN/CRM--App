import { useState, useEffect } from 'react';
import { 
  CreditCardIcon,
  BuildingOfficeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  PencilIcon,
  BanknotesIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import apiClient from '../services/apiClient';
import toast from 'react-hot-toast';

interface CompanySubscription {
  id: string;
  company_id: string;
  company_name: string;
  plan_name: string;
  status: string;
  billing_cycle: string;
  monthly_price: number;
  user_count: number;
  total_amount: number;
  current_period_start: string;
  current_period_end: string;
  trial_ends_at: string | null;
  card_last_4: string | null;
  card_brand: string | null;
  auto_renew: boolean;
  payment_provider: string;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  monthly_price: number;
  annual_price: number;
  max_users: number;
  trial_days: number;
}

export default function SuperAdminBilling() {
  const [subscriptions, setSubscriptions] = useState<CompanySubscription[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubscription, setSelectedSubscription] = useState<CompanySubscription | null>(null);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [newPrice, setNewPrice] = useState('50');
  const [suspendReason, setSuspendReason] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [subsResponse, plansResponse] = await Promise.all([
        apiClient.get('/billing/subscriptions/all'),
        apiClient.get('/billing/plans')
      ]);
      setSubscriptions(subsResponse.data);
      setPlans(plansResponse.data);
    } catch (error: any) {
      console.error('Failed to load billing data:', error);
      toast.error('Failed to load billing data');
    } finally {
      setLoading(false);
    }
  };

  const updatePlanPrice = async () => {
    try {
      await apiClient.patch('/billing/plans/update-price', {
        monthly_price: parseFloat(newPrice)
      });
      toast.success('Plan price updated successfully');
      setShowPriceModal(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to update price');
    }
  };

  const suspendSubscription = async () => {
    if (!selectedSubscription) return;
    
    try {
      await apiClient.post(`/billing/subscriptions/${selectedSubscription.id}/suspend`, {
        reason: suspendReason
      });
      toast.success('Subscription suspended');
      setShowSuspendModal(false);
      setSuspendReason('');
      setSelectedSubscription(null);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to suspend subscription');
    }
  };

  const activateSubscription = async (subscriptionId: string) => {
    try {
      await apiClient.post(`/billing/subscriptions/${subscriptionId}/activate`);
      toast.success('Subscription activated');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to activate subscription');
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      active: 'bg-green-100 text-green-800',
      trial: 'bg-yellow-100 text-yellow-800',
      suspended: 'bg-red-100 text-red-800',
      expired: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };
    return badges[status as keyof typeof badges] || badges.expired;
  };

  const getStatusIcon = (status: string) => {
    if (status === 'active') return <CheckCircleIcon className="w-4 h-4" />;
    if (status === 'suspended') return <XCircleIcon className="w-4 h-4" />;
    return <ClockIcon className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const currentPlan = plans[0];
  const totalRevenue = subscriptions
    .filter(s => s.status === 'active')
    .reduce((sum, s) => sum + s.total_amount, 0);
  const activeCount = subscriptions.filter(s => s.status === 'active').length;
  const trialCount = subscriptions.filter(s => s.status === 'trial').length;
  const suspendedCount = subscriptions.filter(s => s.status === 'suspended').length;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Billing Management</h1>
        <p className="text-gray-600">Manage subscriptions and pricing</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Monthly Revenue</p>
              <p className="text-2xl font-bold text-gray-900">${totalRevenue.toFixed(2)}</p>
            </div>
            <BanknotesIcon className="w-10 h-10 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Subscriptions</p>
              <p className="text-2xl font-bold text-gray-900">{activeCount}</p>
            </div>
            <CheckCircleIcon className="w-10 h-10 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Trial Subscriptions</p>
              <p className="text-2xl font-bold text-gray-900">{trialCount}</p>
            </div>
            <ClockIcon className="w-10 h-10 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Suspended</p>
              <p className="text-2xl font-bold text-gray-900">{suspendedCount}</p>
            </div>
            <XCircleIcon className="w-10 h-10 text-red-500" />
          </div>
        </div>
      </div>

      {/* Current Plan Pricing */}
      <div className="bg-white rounded-lg shadow mb-6 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Current Pricing</h2>
          <button
            onClick={() => setShowPriceModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <PencilIcon className="w-4 h-4" />
            Update Price
          </button>
        </div>
        {currentPlan && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border rounded-lg p-4">
              <p className="text-sm text-gray-600">Monthly Price (Per User)</p>
              <p className="text-3xl font-bold text-gray-900">${currentPlan.monthly_price}</p>
            </div>
            <div className="border rounded-lg p-4">
              <p className="text-sm text-gray-600">Trial Period</p>
              <p className="text-3xl font-bold text-gray-900">{currentPlan.trial_days} days</p>
            </div>
            <div className="border rounded-lg p-4">
              <p className="text-sm text-gray-600">Max Users</p>
              <p className="text-3xl font-bold text-gray-900">{currentPlan.max_users || 'Unlimited'}</p>
            </div>
          </div>
        )}
      </div>

      {/* Subscriptions Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Company Subscriptions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Users</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monthly Cost</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Billing Cycle</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {subscriptions.map((sub) => (
                <tr key={sub.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <BuildingOfficeIcon className="w-5 h-5 text-gray-400 mr-2" />
                      <div>
                        <div className="font-medium text-gray-900">{sub.company_name}</div>
                        <div className="text-sm text-gray-500">{sub.plan_name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full flex items-center gap-1 w-fit ${getStatusBadge(sub.status)}`}>
                      {getStatusIcon(sub.status)}
                      {sub.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{sub.user_count}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">${sub.total_amount.toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 capitalize">{sub.billing_cycle}</td>
                  <td className="px-6 py-4">
                    {sub.card_last_4 ? (
                      <div className="flex items-center gap-2 text-sm text-gray-900">
                        <CreditCardIcon className="w-4 h-4 text-gray-400" />
                        <span className="capitalize">{sub.card_brand}</span>
                        <span>••••{sub.card_last_4}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">No payment method</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      {sub.status === 'active' ? (
                        <button
                          onClick={() => {
                            setSelectedSubscription(sub);
                            setShowSuspendModal(true);
                          }}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Suspend
                        </button>
                      ) : sub.status === 'suspended' ? (
                        <button
                          onClick={() => activateSubscription(sub.id)}
                          className="text-green-600 hover:text-green-800 text-sm font-medium"
                        >
                          Activate
                        </button>
                      ) : null}
                      <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                        <DocumentTextIcon className="w-4 h-4 inline" /> Invoices
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Update Price Modal */}
      {showPriceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Update Monthly Price</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price Per User (USD)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">$</span>
                <input
                  type="number"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="50.00"
                  step="0.01"
                />
              </div>
              <p className="text-sm text-gray-500 mt-2">
                This will apply to all new subscriptions and renewals
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowPriceModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={updatePlanPrice}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Update Price
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend Modal */}
      {showSuspendModal && selectedSubscription && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Suspend Subscription</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to suspend <strong>{selectedSubscription.company_name}</strong>?
              They will not be able to access the system.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Suspension
              </label>
              <textarea
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="e.g., Non-payment, Terms violation..."
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowSuspendModal(false);
                  setSuspendReason('');
                  setSelectedSubscription(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={suspendSubscription}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Suspend
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
