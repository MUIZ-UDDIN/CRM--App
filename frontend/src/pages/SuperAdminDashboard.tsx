import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BuildingOfficeIcon, 
  UsersIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  MagnifyingGlassIcon,
  CreditCardIcon,
  ShieldExclamationIcon,
  PlayIcon,
  EllipsisVerticalIcon,
  PlusIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';
import toast from 'react-hot-toast';
import adminAnalyticsService from '../services/adminAnalyticsService';
import FallbackAdminDashboard from '../components/dashboards/FallbackAdminDashboard';

// Use environment variable or config for API URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface Company {
  id: string;
  name: string;
  plan: string;
  status: string;
  subscription_status: string;
  trial_ends_at: string | null;
  days_remaining: number | null;
  user_count: number;
  created_at: string;
  domain: string | null;
  logo_url: string | null;
  timezone: string;
  currency: string;
}

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [apiError, setApiError] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [newCompany, setNewCompany] = useState({
    name: '',
    admin_first_name: '',
    admin_last_name: '',
    admin_email: ''
  });

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleSuspendCompany = async (companyId: string) => {
    if (!confirm('Are you sure you want to suspend this company? All users will be unable to access the system.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/api/billing/subscriptions/${companyId}/suspend`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Company suspended successfully');
      fetchCompanies();
    } catch (error: any) {
      // Don't log 404 errors to console
      if (error.response?.status !== 404) {
        console.error('Failed to suspend company:', error);
      }
      const errorMsg = error.response?.data?.detail || 'Failed to suspend company';
      toast.error(errorMsg);
    }
  };

  const handleActivateCompany = async (companyId: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/api/billing/subscriptions/${companyId}/activate`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Company activated successfully');
      fetchCompanies();
    } catch (error: any) {
      // Don't log 404 errors to console
      if (error.response?.status !== 404) {
        console.error('Failed to activate company:', error);
      }
      const errorMsg = error.response?.data?.detail || 'Failed to activate company';
      toast.error(errorMsg);
    }
  };

  const handleCreateCompany = async () => {
    if (!newCompany.name.trim()) {
      toast.error('Company name is required');
      return;
    }
    if (!newCompany.admin_first_name.trim()) {
      toast.error('Admin first name is required');
      return;
    }
    if (!newCompany.admin_last_name.trim()) {
      toast.error('Admin last name is required');
      return;
    }
    if (!newCompany.admin_email.trim()) {
      toast.error('Admin email is required');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/api/companies/`,
        {
          name: newCompany.name,
          admin_first_name: newCompany.admin_first_name,
          admin_last_name: newCompany.admin_last_name,
          admin_email: newCompany.admin_email,
          plan: 'free',
          timezone: 'UTC',
          currency: 'USD'
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Company created successfully with 14-day trial. Admin credentials sent to email.');
      setShowCreateModal(false);
      setNewCompany({ name: '', admin_first_name: '', admin_last_name: '', admin_email: '' });
      fetchCompanies();
    } catch (error: any) {
      console.error('Failed to create company:', error);
      const errorMsg = error.response?.data?.detail || 'Failed to create company';
      toast.error(errorMsg);
    }
  };

  const handleDeleteCompany = async (companyId: string, companyName: string) => {
    if (!confirm(`⚠️ WARNING: Delete "${companyName}"?\n\nThis will permanently delete:\n• The company\n• All users in the company\n• All company data\n\nThis action CANNOT be undone!`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${API_URL}/api/companies/${companyId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Company and all users deleted successfully');
      setOpenDropdownId(null);
      fetchCompanies();
    } catch (error: any) {
      console.error('Failed to delete company:', error);
      const errorMsg = error.response?.data?.detail || 'Failed to delete company';
      toast.error(errorMsg);
    }
  };

  const fetchCompanies = async () => {
    try {
      setApiError(false); // Reset error state on each attempt
      
      // First try to use the adminAnalyticsService
      try {
        const analyticsData = await adminAnalyticsService.getCompanyAnalytics();
        if (analyticsData && analyticsData.companies) {
          setCompanies(analyticsData.companies);
          return;
        }
      } catch (analyticsError) {
        console.error('Admin analytics service failed:', analyticsError);
        // Continue to fallback method
      }

      // Fallback to direct API call
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/companies`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setCompanies(response.data);
    } catch (error: any) {
      console.error('Failed to load companies:', error);
      // Set empty array to avoid undefined errors
      setCompanies([]);
      // Set API error flag to true to show fallback dashboard
      setApiError(true);
    } finally {
      setLoading(false);
    }
  };

  const getSubscriptionBadge = (company: Company) => {
    const status = company.subscription_status || company.status || 'active';
    
    if (status === 'trial' || company.plan === 'free') {
      const daysLeft = company.days_remaining || 0;
      
      // Show "Expired" if 0 days left
      if (daysLeft === 0 && status === 'trial') {
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 flex items-center gap-1">
            <XCircleIcon className="w-3 h-3" />
            Expired
          </span>
        );
      }
      
      // Free plan is considered trial
      if (company.plan === 'free') {
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 flex items-center gap-1">
            <ClockIcon className="w-3 h-3" />
            Trial
          </span>
        );
      }
      
      const color = daysLeft <= 3 ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800';
      return (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${color} flex items-center gap-1`}>
          <ClockIcon className="w-3 h-3" />
          Trial: {daysLeft}d left
        </span>
      );
    }

    if (status === 'active') {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 flex items-center gap-1">
          <CheckCircleIcon className="w-3 h-3" />
          Active
        </span>
      );
    }

    if (status === 'expired' || status === 'suspended') {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 flex items-center gap-1">
          <XCircleIcon className="w-3 h-3" />
          {status === 'suspended' ? 'Suspended' : 'Expired'}
        </span>
      );
    }

    return (
      <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
        {status}
      </span>
    );
  };

  const getPlanBadge = (company: Company) => {
    const plan = company.plan || 'free';
    const colors = {
      free: 'bg-gray-100 text-gray-800',
      pro: 'bg-blue-100 text-blue-800',
      enterprise: 'bg-purple-100 text-purple-800',
      trial: 'bg-yellow-100 text-yellow-800'
    };

    const color = colors[plan.toLowerCase() as keyof typeof colors] || colors.free;
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${color}`}>
        {plan.toUpperCase()}
      </span>
    );
  };

  const filteredCompanies = companies.filter(company => {
    const matchesSearch = (company.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    // Use subscription_status if available, otherwise fall back to status
    const companyStatus = company.subscription_status || company.status || 'active';
    
    // Handle filter matching
    let matchesFilter = false;
    if (filterStatus === 'all') {
      matchesFilter = true;
    } else if (filterStatus === 'expired') {
      // Match expired subscriptions OR trials with 0 days remaining
      matchesFilter = companyStatus === 'expired' || 
                     (companyStatus === 'trial' && (company.days_remaining || 0) === 0);
    } else if (filterStatus === 'trial') {
      // Match only active trials (days remaining > 0)
      matchesFilter = companyStatus === 'trial' && (company.days_remaining || 0) > 0;
    } else if (filterStatus === 'suspended') {
      // Match suspended companies
      matchesFilter = company.status === 'suspended' || companyStatus === 'suspended';
    } else {
      matchesFilter = companyStatus === filterStatus;
    }
    
    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: companies.length,
    active: companies.filter(c => c.subscription_status === 'active').length,
    trial: companies.filter(c => c.subscription_status === 'trial' && (c.days_remaining || 0) > 0).length,
    expired: companies.filter(c => 
      c.subscription_status === 'expired' || 
      (c.subscription_status === 'trial' && (c.days_remaining || 0) === 0)
    ).length,
    totalUsers: companies.reduce((sum, c) => sum + c.user_count, 0)
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  // If there was an API error, show the fallback dashboard
  if (apiError) {
    return <FallbackAdminDashboard />;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1920px] mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Super Admin Dashboard</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Manage all companies and subscriptions</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <PlusIcon className="w-5 h-5" />
            Create Company
          </button>
          <button
            onClick={() => navigate('/admin/billing')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <CreditCardIcon className="w-5 h-5" />
            Billing Management
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Companies</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <BuildingOfficeIcon className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active</p>
              <p className="text-2xl font-bold text-green-600">{stats.active}</p>
            </div>
            <CheckCircleIcon className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">On Trial</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.trial}</p>
            </div>
            <ClockIcon className="w-8 h-8 text-yellow-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Expired</p>
              <p className="text-2xl font-bold text-red-600">{stats.expired}</p>
            </div>
            <XCircleIcon className="w-8 h-8 text-red-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
            </div>
            <UsersIcon className="w-8 h-8 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-3 sm:p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search companies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full sm:w-auto px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="trial">Trial</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Companies Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto overflow-y-visible">
          <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Company
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Plan
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Subscription
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Users
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredCompanies.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  <BuildingOfficeIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p>No companies found</p>
                </td>
              </tr>
            ) : (
              filteredCompanies.map((company) => (
                <tr key={company.id} className="hover:bg-gray-50 relative">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <BuildingOfficeIcon className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="ml-4 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate max-w-xs" title={company.name}>
                          {company.name}
                        </div>
                        <div className="text-sm text-gray-500">{company.id.slice(0, 8)}...</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getPlanBadge(company)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getSubscriptionBadge(company)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1 text-sm text-gray-900">
                      <UsersIcon className="w-4 h-4 text-gray-400" />
                      {company.user_count}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(company.created_at).toLocaleDateString('en-US')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => {
                          setSelectedCompany(company);
                          setShowDetailsModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        View Details
                      </button>
                      
                      {/* Dropdown Menu */}
                      <div className="relative">
                        <button
                          onClick={() => setOpenDropdownId(openDropdownId === company.id ? null : company.id)}
                          className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                          title="More actions"
                        >
                          <EllipsisVerticalIcon className="w-5 h-5 text-gray-600" />
                        </button>
                        
                        {openDropdownId === company.id && (
                          <>
                            {/* Backdrop to close dropdown */}
                            <div 
                              className="fixed inset-0 z-10" 
                              onClick={() => setOpenDropdownId(null)}
                            />
                            
                            {/* Dropdown Menu */}
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-[60]">
                              <button
                                onClick={() => {
                                  setOpenDropdownId(null);
                                  navigate(`/admin/billing`);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                              >
                                <CreditCardIcon className="w-4 h-4" />
                                Manage Billing
                              </button>
                              
                              {company.status === 'active' ? (
                                <button
                                  onClick={() => {
                                    setOpenDropdownId(null);
                                    handleSuspendCompany(company.id);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-orange-600 hover:bg-orange-50 flex items-center gap-2"
                                >
                                  <ShieldExclamationIcon className="w-4 h-4" />
                                  Suspend Company
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    setOpenDropdownId(null);
                                    handleActivateCompany(company.id);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-green-600 hover:bg-green-50 flex items-center gap-2"
                                >
                                  <PlayIcon className="w-4 h-4" />
                                  Activate Company
                                </button>
                              )}
                              
                              <div className="border-t border-gray-200 my-1"></div>
                              
                              <button
                                onClick={() => {
                                  setOpenDropdownId(null);
                                  handleDeleteCompany(company.id, company.name);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                              >
                                <TrashIcon className="w-4 h-4" />
                                Delete Company
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Company Details Modal */}
      {showDetailsModal && selectedCompany && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Company Details</h2>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircleIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Company Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Company Name</label>
                  <p className="text-lg font-semibold text-gray-900">{selectedCompany.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Company ID</label>
                  <p className="text-sm text-gray-900 font-mono">{selectedCompany.id}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Plan</label>
                  <p className="text-lg">{getPlanBadge(selectedCompany)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <p className="text-lg">{getSubscriptionBadge(selectedCompany)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Total Users</label>
                  <p className="text-lg font-semibold text-gray-900">{selectedCompany.user_count}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Created</label>
                  <p className="text-lg text-gray-900">
                    {new Date(selectedCompany.created_at).toLocaleDateString('en-US')}
                  </p>
                </div>
              </div>

              {selectedCompany.subscription_status === 'trial' && selectedCompany.trial_ends_at && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Trial Ends</label>
                  <p className="text-lg text-gray-900">
                    {new Date(selectedCompany.trial_ends_at).toLocaleDateString('en-US')} 
                    <span className="text-sm text-gray-500 ml-2">
                      ({selectedCompany.days_remaining !== null ? selectedCompany.days_remaining : 0} days remaining)
                    </span>
                  </p>
                </div>
              )}

              {selectedCompany.domain && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Domain</label>
                  <p className="text-lg text-gray-900">{selectedCompany.domain}</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="mt-6 pt-6 border-t flex gap-3">
              <button
                onClick={async () => {
                  try {
                    const token = localStorage.getItem('token');
                    const endpoint = selectedCompany.status === 'active' ? 
                      `${API_URL}/api/companies/${selectedCompany.id}/suspend` : 
                      `${API_URL}/api/companies/${selectedCompany.id}/activate`;
                    
                    await axios.post(endpoint, {}, {
                      headers: { Authorization: `Bearer ${token}` }
                    });
                    
                    // Update company status locally
                    setSelectedCompany({
                      ...selectedCompany,
                      status: selectedCompany.status === 'active' ? 'suspended' : 'active'
                    });
                    
                    // Refresh companies list
                    fetchCompanies();
                    
                    toast.success(
                      selectedCompany.status === 'active' ? 
                      'Company suspended successfully' : 
                      'Company activated successfully'
                    );
                  } catch (error: any) {
                    toast.error(error.response?.data?.detail || 'Operation failed');
                    console.error(error);
                  }
                }}
                className={`flex-1 px-4 py-2 text-white text-sm sm:text-base rounded-lg ${selectedCompany.status === 'active' ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-green-600 hover:bg-green-700'}`}
              >
                {selectedCompany.status === 'active' ? 'Suspend Company' : 'Activate Company'}
              </button>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 text-sm sm:text-base hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Company Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Create New Company</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircleIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name *
                </label>
                <input
                  type="text"
                  value={newCompany.name}
                  onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter company name"
                  autoFocus
                />
              </div>

              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Company Admin Details</h3>
                
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name *
                    </label>
                    <input
                      type="text"
                      value={newCompany.admin_first_name}
                      onChange={(e) => setNewCompany({ ...newCompany, admin_first_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="First name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      value={newCompany.admin_last_name}
                      onChange={(e) => setNewCompany({ ...newCompany, admin_last_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Last name"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={newCompany.admin_email}
                    onChange={(e) => setNewCompany({ ...newCompany, admin_email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="admin@company.com"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Login credentials will be sent to this email
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h3 className="text-xs font-semibold text-blue-900 mb-1">Default Settings</h3>
                <ul className="text-xs text-blue-800 space-y-0.5">
                  <li>• Plan: Free (14-day trial)</li>
                  <li>• Timezone: UTC</li>
                  <li>• Currency: USD</li>
                </ul>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={handleCreateCompany}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Create Company
              </button>
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
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
