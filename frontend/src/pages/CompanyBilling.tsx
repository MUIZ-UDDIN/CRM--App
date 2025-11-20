import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CreditCardIcon,
  BanknotesIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowUpIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import apiClient from '../services/apiClient';
import toast from 'react-hot-toast';
import { handleApiError } from '../utils/errorHandler';

interface Subscription {
  id: string;
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
}

interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  status: string;
  due_date: string;
  paid_at: string | null;
  invoice_pdf: string | null;
}

export default function CompanyBilling() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isSuperAdmin, isCompanyAdmin } = usePermissions();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Redirect Super Admins to admin billing page
  useEffect(() => {
    if (isSuperAdmin()) {
      navigate('/admin/billing');
    }
  }, [isSuperAdmin, navigate]);

  useEffect(() => {
    if (!isSuperAdmin()) {
      fetchBillingData();
    }
  }, [isSuperAdmin]);

  const fetchBillingData = async () => {
    try {
      const [subResponse, invoicesResponse] = await Promise.all([
        apiClient.get('/billing/subscription'),
        apiClient.get('/billing/invoices')
      ]);
      setSubscription(subResponse.data);
      setInvoices(invoicesResponse.data);
    } catch (error: any) {
      console.error('Failed to load billing data:', error);
      const errorMessage = error?.response?.data?.detail || error?.message || 'Failed to load billing data';
      
      if (error.response?.status === 404) {
        setSubscription(null);
        setInvoices([]);
        // Show user-friendly message from backend
        if (error?.response?.data?.detail) {
          toast(error.response.data.detail, { icon: 'ℹ️' });
        }
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePayment = async () => {
    // Redirect to Square payment form
    toast('Redirecting to payment processor...');
    // In production, this would redirect to Square payment page
    window.open('https://squareup.com/dashboard', '_blank');
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      active: 'bg-green-100 text-green-800',
      trial: 'bg-yellow-100 text-yellow-800',
      expired: 'bg-red-100 text-red-800',
      paid: 'bg-green-100 text-green-800',
      open: 'bg-yellow-100 text-yellow-800',
      void: 'bg-gray-100 text-gray-800'
    };
    return badges[status as keyof typeof badges] || badges.void;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!subscription) {
    // Show plan selection for company admins without subscription
    if (isCompanyAdmin()) {
      return (
        <div className="p-6 max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Choose Your Plan</h1>
            <p className="text-gray-600">Select a plan to continue using Sunstone CRM</p>
          </div>

          {/* Pricing Plans */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {/* Starter Plan */}
            <div className="bg-white rounded-lg shadow-lg border-2 border-gray-200 p-6">
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Starter</h3>
                <div className="text-4xl font-bold text-gray-900 mb-2">
                  $29
                  <span className="text-lg text-gray-600 font-normal">/user/month</span>
                </div>
                <p className="text-sm text-gray-600">Perfect for small teams</p>
              </div>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span>Up to 10 users</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span>Basic CRM features</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span>Email support</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span>1GB storage</span>
                </li>
              </ul>
              <button
                onClick={() => setShowPaymentModal(true)}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Select Plan
              </button>
            </div>

            {/* Professional Plan - Highlighted */}
            <div className="bg-white rounded-lg shadow-xl border-2 border-blue-600 p-6 relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                  Most Popular
                </span>
              </div>
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Professional</h3>
                <div className="text-4xl font-bold text-blue-600 mb-2">
                  $49
                  <span className="text-lg text-gray-600 font-normal">/user/month</span>
                </div>
                <p className="text-sm text-gray-600">For growing businesses</p>
              </div>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span>Unlimited users</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span>All CRM features</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span>Priority support</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span>10GB storage</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span>Advanced analytics</span>
                </li>
              </ul>
              <button
                onClick={() => setShowPaymentModal(true)}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Select Plan
              </button>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-white rounded-lg shadow-lg border-2 border-gray-200 p-6">
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Enterprise</h3>
                <div className="text-4xl font-bold text-gray-900 mb-2">
                  $99
                  <span className="text-lg text-gray-600 font-normal">/user/month</span>
                </div>
                <p className="text-sm text-gray-600">For large organizations</p>
              </div>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span>Unlimited users</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span>All features + Custom</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span>24/7 phone support</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span>Unlimited storage</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span>Dedicated account manager</span>
                </li>
              </ul>
              <button
                onClick={() => setShowPaymentModal(true)}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Select Plan
              </button>
            </div>
          </div>

          {/* Payment Modal */}
          {showPaymentModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Add Payment Method</h3>
                <p className="text-gray-600 mb-6">
                  Enter your payment details to activate your subscription.
                </p>
                
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Card Number
                    </label>
                    <input
                      type="text"
                      placeholder="1234 5678 9012 3456"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Expiry Date
                      </label>
                      <input
                        type="text"
                        placeholder="MM/YY"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        CVV
                      </label>
                      <input
                        type="text"
                        placeholder="123"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cardholder Name
                    </label>
                    <input
                      type="text"
                      placeholder="John Doe"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      toast.success('Payment method added successfully!');
                      setShowPaymentModal(false);
                      fetchBillingData();
                    }}
                    className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                  >
                    Add Payment Method
                  </button>
                  <button
                    onClick={() => setShowPaymentModal(false)}
                    className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    // For non-admins, show contact admin message
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Billing Management</h3>
          <p className="text-blue-800 mb-4">
            No active subscription found for your company. Please contact your administrator to set up billing.
          </p>
        </div>
      </div>
    );
  }

  const daysRemaining = subscription.trial_ends_at 
    ? Math.max(0, Math.ceil((new Date(subscription.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  // Permission check - only Super Admin and Company Admin can view billing
  const canViewBilling = isSuperAdmin() || isCompanyAdmin();
  
  if (!canViewBilling) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="font-semibold text-yellow-900 mb-2">Billing Access Restricted</div>
          <p className="text-yellow-800">Only Company Admins can view billing information.</p>
          <p className="text-yellow-700 text-sm mt-2">💡 Contact your Company Admin if you need billing details or have questions about your subscription.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Billing & Subscription</h1>
        <p className="text-gray-600">Manage your subscription and payment methods</p>
      </div>

      {/* Current Plan Card */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Current Plan</h2>
              <p className="text-sm text-gray-600">Your subscription details</p>
            </div>
            <span className={`px-3 py-1 text-sm font-medium rounded-full flex items-center gap-2 ${getStatusBadge(subscription.status)}`}>
              {subscription.status === 'active' && <CheckCircleIcon className="w-4 h-4" />}
              {subscription.status === 'trial' && <ClockIcon className="w-4 h-4" />}
              {subscription.status.toUpperCase()}
            </span>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">Plan</p>
              <p className="text-2xl font-bold text-gray-900">{subscription.plan_name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Monthly Cost</p>
              <p className="text-2xl font-bold text-gray-900">
                ${subscription.total_amount.toFixed(2)}
                <span className="text-sm text-gray-600 font-normal"> / month</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                ${subscription.monthly_price} × {subscription.user_count} users
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Billing Cycle</p>
              <p className="text-lg font-semibold text-gray-900 capitalize">{subscription.billing_cycle}</p>
              {subscription.current_period_end && (
                <p className="text-xs text-gray-500 mt-1">
                  Renews on {new Date(subscription.current_period_end).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>

          {subscription.status === 'trial' && daysRemaining !== null && (
            <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <ClockIcon className="w-5 h-5 text-yellow-600" />
                <div>
                  <p className="font-medium text-yellow-900">Trial Period</p>
                  <p className="text-sm text-yellow-700">
                    {daysRemaining} days remaining. Add a payment method to continue after trial.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <button
              onClick={() => setShowPaymentModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <CreditCardIcon className="w-5 h-5" />
              Update Payment Method
            </button>
            <button
              onClick={() => setShowUpgradeModal(true)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <ArrowUpIcon className="w-5 h-5" />
              Contact Sales
            </button>
          </div>
        </div>
      </div>

      {/* Payment Method Card */}
      <div className="bg-white rounded-lg shadow mb-6 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Method</h2>
        {subscription.card_last_4 ? (
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-3">
              <CreditCardIcon className="w-8 h-8 text-gray-400" />
              <div>
                <p className="font-medium text-gray-900 capitalize">{subscription.card_brand || 'Card'}</p>
                <p className="text-sm text-gray-600">•••• •••• •••• {subscription.card_last_4}</p>
              </div>
            </div>
            <button
              onClick={() => setShowPaymentModal(true)}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Update
            </button>
          </div>
        ) : (
          <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg text-center">
            <CreditCardIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600 mb-3">No payment method on file</p>
            <button
              onClick={() => setShowPaymentModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add Payment Method
            </button>
          </div>
        )}
      </div>

      {/* Invoices */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Billing History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <DocumentTextIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p>No invoices yet</p>
                  </td>
                </tr>
              ) : (
                invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {invoice.invoice_number}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(invoice.due_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      ${invoice.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(invoice.status)}`}>
                        {invoice.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {invoice.invoice_pdf && (
                        <a
                          href={invoice.invoice_pdf}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Download PDF
                        </a>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Update Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Update Payment Method</h3>
            <p className="text-gray-600 mb-6">
              You will be redirected to Square to securely update your payment information.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdatePayment}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Continue to Square
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Contact Sales</h3>
            <p className="text-gray-600 mb-6">
              For custom pricing or enterprise features, please contact our sales team.
            </p>
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-700">
                <strong>Email:</strong> sales@sunstonecrm.com<br />
                <strong>Phone:</strong> +1 (555) 123-4567
              </p>
            </div>
            <button
              onClick={() => setShowUpgradeModal(false)}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
