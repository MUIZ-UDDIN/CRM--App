import { useState, useEffect } from 'react';
import { 
  CreditCardIcon,
  BuildingOfficeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  PencilIcon,
  BanknotesIcon,
  DocumentTextIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import apiClient from '../services/apiClient';
import toast from 'react-hot-toast';
import { handleApiError } from '../utils/errorHandler';

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
  last_payment_date?: string | null;
  has_payment_method?: boolean;
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
  const { user } = useAuth();
  const { isSuperAdmin } = usePermissions();
  const [subscriptions, setSubscriptions] = useState<CompanySubscription[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubscription, setSelectedSubscription] = useState<CompanySubscription | null>(null);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [newPrice, setNewPrice] = useState('50');
  const [suspendReason, setSuspendReason] = useState('');
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedCompanyInvoices, setSelectedCompanyInvoices] = useState<any[]>([]);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false);
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [sendingInvoice, setSendingInvoice] = useState(false);
  const [showSendInvoiceConfirm, setShowSendInvoiceConfirm] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [companiesResponse, plansResponse, priceResponse] = await Promise.all([
        apiClient.get('/companies/'),
        apiClient.get('/billing/plans'),
        apiClient.get('/billing/plans/current-price')
      ]);
      
      // Transform companies data to match subscription format
      // Exclude super admin company (admin@sunstonecrm.com)
      const companiesData = companiesResponse.data
        .filter((company: any) => !company.is_super_admin_company)
        .map((company: any) => {
          const hasPaymentMethod = !!company.last_payment_date || !!company.square_customer_id;
          const monthlyPrice = parseFloat(priceResponse.data?.monthly_price || 50);
          
          return {
            id: company.id,
            company_id: company.id,
            company_name: company.name,
            // Show 'free' for trial users, 'pro' only if they have actually paid
            plan_name: hasPaymentMethod ? 'pro' : 'free',
            status: company.subscription_status || 'trial',
            billing_cycle: 'monthly',
            monthly_price: monthlyPrice,
            user_count: company.user_count || 0,
            // Flat rate pricing - show monthly price if they have payment method, otherwise $0
            total_amount: hasPaymentMethod ? monthlyPrice : 0,
            current_period_start: company.created_at,
            current_period_end: company.trial_ends_at,
            trial_ends_at: company.trial_ends_at,
            last_payment_date: company.last_payment_date,
            has_payment_method: hasPaymentMethod,
            card_last_4: null,
            card_brand: null,
            auto_renew: true,
            payment_provider: 'square'
          };
        });
      
      setSubscriptions(companiesData);
      setPlans(plansResponse.data);
      // Set current price from backend
      if (priceResponse.data?.monthly_price) {
        setNewPrice(priceResponse.data.monthly_price.toString());
      }
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

  const fetchCompanyInvoices = async (companyId: string) => {
    setInvoiceLoading(true);
    try {
      const response = await apiClient.get(`/billing/companies/${companyId}/invoices`);
      setSelectedCompanyInvoices(response.data || []);
    } catch (error: any) {
      // If no invoices found, show empty state
      if (error.response?.status === 404) {
        setSelectedCompanyInvoices([]);
      } else {
        console.error('Failed to load invoices:', error);
        setSelectedCompanyInvoices([]);
      }
    } finally {
      setInvoiceLoading(false);
    }
  };

  const createInvoice = async () => {
    if (!selectedSubscription || !invoiceAmount) {
      toast.error('Please enter an amount');
      return;
    }

    try {
      await apiClient.post(`/billing/companies/${selectedSubscription.company_id}/invoices`, {
        amount: parseFloat(invoiceAmount),
        description: `Monthly subscription - ${selectedSubscription.plan_name}`,
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
      });
      toast.success('Invoice created successfully');
      setShowCreateInvoiceModal(false);
      setInvoiceAmount('');
      // Refresh invoices
      fetchCompanyInvoices(selectedSubscription.company_id);
    } catch (error: any) {
      handleApiError(error);
    }
  };

  const sendInvoiceEmail = async () => {
    if (!selectedSubscription) return;
    
    setSendingInvoice(true);
    try {
      // Create invoice first, then send it
      const invoiceResponse = await apiClient.post(`/billing/companies/${selectedSubscription.company_id}/invoices`, {
        amount: selectedSubscription.monthly_price,
        description: `Monthly subscription - ${selectedSubscription.plan_name}`,
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      });
      
      // Send the invoice email to company email
      await apiClient.post(`/billing/invoices/${invoiceResponse.data.id}/send`, {
        email: selectedSubscription.company_name // This should be the company email
      });
      
      toast.success('Invoice sent successfully to company email');
      setShowSendInvoiceConfirm(false);
      setShowInvoiceModal(false);
    } catch (error: any) {
      handleApiError(error);
    } finally {
      setSendingInvoice(false);
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
  
  // Calculate stats for BILLING page (different from dashboard)
  // Active Subscriptions = Companies that have PAID (have payment method)
  const activeCount = subscriptions.filter(s => {
    // Only count as active if they have a payment method (actually paying)
    return s.has_payment_method && s.status !== 'suspended';
  }).length;
  
  // Trial Subscriptions = Companies on free trial (no payment yet)
  const trialCount = subscriptions.filter(s => {
    // Count as trial if they have NOT paid and are NOT suspended
    return !s.has_payment_method && s.status !== 'suspended';
  }).length;
  
  // Suspended = Only explicitly suspended companies
  const suspendedCount = subscriptions.filter(s => {
    return s.status === 'suspended';
  }).length;
  
  // Monthly Revenue = Only from companies that have PAID
  const totalRevenue = subscriptions
    .filter(s => {
      // Only count revenue from companies with payment methods
      return s.has_payment_method && s.status !== 'suspended' && s.status !== 'expired';
    })
    .reduce((sum, s) => sum + s.total_amount, 0);

  // Permission check - only Super Admin can access platform billing
  if (!isSuperAdmin()) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="font-semibold text-red-900 mb-2">Platform Billing Access Denied</div>
          <p className="text-red-800">Only Super Admins can access platform-wide billing management.</p>
          <p className="text-red-700 text-sm mt-2">💡 This page is restricted to platform administrators only.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="px-4 sm:px-6 lg:max-w-7xl xl:max-w-8xl 2xl:max-w-9xl 3xl:max-w-10xl lg:mx-auto lg:px-8">
          <div className="py-6">
            <h1 className="text-2xl font-bold text-gray-900">Billing Management</h1>
            <p className="text-gray-600">Manage subscriptions and pricing</p>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:max-w-7xl xl:max-w-8xl 2xl:max-w-9xl 3xl:max-w-10xl lg:mx-auto lg:px-8 py-6">

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border rounded-lg p-4">
            <p className="text-sm text-gray-600">Monthly Price (Flat Rate)</p>
            <p className="text-3xl font-bold text-gray-900">${currentPlan?.monthly_price || newPrice}</p>
            <p className="text-xs text-gray-500 mt-1">Unlimited users included</p>
          </div>
          <div className="border rounded-lg p-4">
            <p className="text-sm text-gray-600">Trial Period</p>
            <p className="text-3xl font-bold text-gray-900">{currentPlan?.trial_days || 14} days</p>
            <p className="text-xs text-gray-500 mt-1">For new accounts</p>
          </div>
          <div className="border rounded-lg p-4">
            <p className="text-sm text-gray-600">Max Users</p>
            <p className="text-3xl font-bold text-gray-900">Unlimited</p>
            <p className="text-xs text-gray-500 mt-1">No user limits</p>
          </div>
        </div>
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
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">${sub.monthly_price.toFixed(2)}</td>
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
                      <button 
                        onClick={() => {
                          setSelectedSubscription(sub);
                          setShowInvoiceModal(true);
                          // Fetch invoices for this company
                          fetchCompanyInvoices(sub.company_id);
                        }}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
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
                Monthly Price - Flat Rate (USD)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">$</span>
                <input
                  type="number"
                  value={newPrice}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Limit to reasonable price (max $99,999.99)
                    if (value === '' || (parseFloat(value) >= 0 && parseFloat(value) <= 99999.99)) {
                      setNewPrice(value);
                    }
                  }}
                  max="99999.99"
                  min="0"
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="50.00"
                  step="0.01"
                />
              </div>
              <p className="text-sm text-gray-500 mt-2">
                This flat rate includes unlimited users. Changes apply to all companies immediately.
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

      {/* Invoice Modal - Actual Invoice Display */}
      {showInvoiceModal && selectedSubscription && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Invoice</h3>
              <button
                onClick={() => {
                  setShowInvoiceModal(false);
                  setSelectedSubscription(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircleIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Invoice Content */}
            <div className="border rounded-lg p-6 mb-6 bg-gray-50">
              {/* Header */}
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h1 className="text-3xl font-bold text-blue-600 mb-2">INVOICE</h1>
                  <p className="text-sm text-gray-600">Invoice #: INV-{Date.now().toString().slice(-8)}</p>
                  <p className="text-sm text-gray-600">Date: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <div className="text-right">
                  <h2 className="font-bold text-lg text-gray-900">Sunstone CRM</h2>
                  <p className="text-sm text-gray-600">SaaS Platform</p>
                  <p className="text-sm text-gray-600">admin@sunstonecrm.com</p>
                </div>
              </div>

              {/* Bill To */}
              <div className="mb-8">
                <h3 className="font-semibold text-gray-700 mb-2">BILL TO:</h3>
                <div className="bg-white rounded p-4">
                  <p className="font-medium text-gray-900">{selectedSubscription.company_name}</p>
                  <p className="text-sm text-gray-600">Users: {selectedSubscription.user_count}</p>
                  <p className="text-sm text-gray-600">Plan: {selectedSubscription.plan_name.toUpperCase()}</p>
                </div>
              </div>

              {/* Invoice Items */}
              <div className="mb-8">
                <table className="w-full">
                  <thead className="bg-blue-600 text-white">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Description</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    <tr className="border-b">
                      <td className="px-4 py-4">
                        <p className="font-medium text-gray-900">Monthly Subscription - {selectedSubscription.plan_name.toUpperCase()}</p>
                        <p className="text-sm text-gray-600">Billing Period: {new Date().toLocaleDateString()} - {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
                        <p className="text-sm text-gray-600">Unlimited users included</p>
                      </td>
                      <td className="px-4 py-4 text-right font-medium text-gray-900">${selectedSubscription.monthly_price.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Total */}
              <div className="flex justify-end">
                <div className="w-64">
                  <div className="flex justify-between py-2 border-t-2 border-gray-300">
                    <span className="font-semibold text-gray-700">Subtotal:</span>
                    <span className="font-medium text-gray-900">${selectedSubscription.monthly_price.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="font-semibold text-gray-700">Tax:</span>
                    <span className="font-medium text-gray-900">$0.00</span>
                  </div>
                  <div className="flex justify-between py-3 border-t-2 border-blue-600 bg-blue-50 px-4 rounded">
                    <span className="font-bold text-lg text-gray-900">Total:</span>
                    <span className="font-bold text-lg text-blue-600">${selectedSubscription.monthly_price.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Terms */}
              <div className="mt-8 pt-6 border-t">
                <p className="text-sm text-gray-600"><span className="font-semibold">Payment Terms:</span> Due within 30 days</p>
                <p className="text-sm text-gray-600 mt-1"><span className="font-semibold">Status:</span> <span className="text-yellow-600 font-medium">PENDING</span></p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowSendInvoiceConfirm(true)}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center gap-2"
              >
                <DocumentTextIcon className="w-5 h-5" />
                Send Invoice to Company Email
              </button>
              <button
                onClick={() => {
                  setShowInvoiceModal(false);
                  setSelectedSubscription(null);
                }}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Invoice Confirmation Modal */}
      {showSendInvoiceConfirm && selectedSubscription && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Confirm Send Invoice</h3>
              <button
                onClick={() => setShowSendInvoiceConfirm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircleIcon className="w-6 h-6" />
              </button>
            </div>
            
            <div className="mb-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-900">
                  This will send the invoice to the company's registered email address.
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-gray-700"><span className="font-medium">Company:</span> {selectedSubscription.company_name}</p>
                <p className="text-sm text-gray-700"><span className="font-medium">Amount:</span> ${selectedSubscription.monthly_price.toFixed(2)}</p>
                <p className="text-sm text-gray-700"><span className="font-medium">Plan:</span> {selectedSubscription.plan_name.toUpperCase()}</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={sendInvoiceEmail}
                disabled={sendingInvoice}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sendingInvoice ? 'Sending...' : 'Send Invoice'}
              </button>
              <button
                onClick={() => setShowSendInvoiceConfirm(false)}
                disabled={sendingInvoice}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Invoice Modal */}
      {showCreateInvoiceModal && selectedSubscription && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Create Invoice</h3>
              <button
                onClick={() => {
                  setShowCreateInvoiceModal(false);
                  setInvoiceAmount('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircleIcon className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                <p className="text-gray-900">{selectedSubscription.company_name}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
                <input
                  type="number"
                  value={invoiceAmount}
                  onChange={(e) => setInvoiceAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter amount"
                  step="0.01"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Current monthly price: ${selectedSubscription.monthly_price.toFixed(2)}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <p className="text-sm text-gray-600">Monthly subscription - {selectedSubscription.plan_name}</p>
              </div>
            </div>
            
            <div className="mt-6 flex gap-3">
              <button
                onClick={createInvoice}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create Invoice
              </button>
              <button
                onClick={() => {
                  setShowCreateInvoiceModal(false);
                  setInvoiceAmount('');
                }}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
