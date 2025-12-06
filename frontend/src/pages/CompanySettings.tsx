import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../services/apiClient';
import {
  UserGroupIcon,
  BuildingOfficeIcon,
  ShieldCheckIcon,
  PuzzlePieceIcon,
  AdjustmentsHorizontalIcon,
  ArrowLeftIcon,
  UserIcon,
} from '@heroicons/react/24/outline';

type TabType = 'company' | 'security' | 'team' | 'team_members' | 'integrations' | 'custom_fields';

interface Company {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}

interface Team {
  id: string;
  name: string;
  description: string | null;
  company_id: string;
  team_lead_id: string | null;
}

interface TeamMember {
  id: string;
  name?: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  user_role?: string;
  status: string;
  joined_at?: string;
  created_at?: string;
}

export default function CompanySettings() {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const [activeTab, setActiveTab] = useState<TabType>('company');
  const [company, setCompany] = useState<Company | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  const [companyForm, setCompanyForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip: '',
  });

  // Check if current user is super admin
  const isSuperAdmin = user?.role === 'super_admin' || user?.role === 'Super Admin';

  // Tabs configuration
  const tabs = [
    { id: 'company' as TabType, name: 'Company', icon: BuildingOfficeIcon },
    { id: 'team' as TabType, name: 'Teams', icon: UserGroupIcon },
    { id: 'team_members' as TabType, name: 'Team Members', icon: UserIcon },
    { id: 'security' as TabType, name: 'Security', icon: ShieldCheckIcon },
    { id: 'integrations' as TabType, name: 'Integrations', icon: PuzzlePieceIcon },
    { id: 'custom_fields' as TabType, name: 'Custom Fields', icon: AdjustmentsHorizontalIcon },
  ];

  useEffect(() => {
    if (!isSuperAdmin) {
      toast.error('Access denied. Super Admin only.');
      navigate('/');
      return;
    }
    fetchCompanyData();
  }, [companyId]);

  useEffect(() => {
    if (activeTab === 'team') {
      fetchTeams();
    } else if (activeTab === 'team_members') {
      fetchTeamMembers();
    }
  }, [activeTab]);

  const fetchCompanyData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/companies/${companyId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCompany(data);
        setCompanyForm({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || '',
          city: data.city || '',
          state: data.state || '',
          zip: data.zip || '',
        });
      } else {
        toast.error('Failed to load company data');
      }
    } catch (error) {
      console.error('Error fetching company:', error);
      toast.error('Failed to load company data');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
      // Fetch teams - backend filters by company automatically based on auth
      // But for Super Admin viewing specific company, we need to pass company context
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/teams?company_id=${companyId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setTeams(data);
      }
    } catch (error: any) {
      console.error('Failed to load teams:', error);
      if (error.response?.status !== 404) {
        toast.error('Failed to load teams');
      }
    }
  };

  const fetchTeamMembers = async () => {
    try {
      // Fetch all users for this specific company
      const response = await apiClient.get(`/admin/companies/${companyId}/users`);
      setTeamMembers(response.data);
    } catch (error: any) {
      console.error('Failed to load team members:', error);
      toast.error('Failed to load team members');
    }
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/companies/${companyId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(companyForm),
      });

      if (response.ok) {
        toast.success('Company settings saved successfully');
        await fetchCompanyData();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to save company settings');
      }
    } catch (error) {
      console.error('Error saving company settings:', error);
      toast.error('Failed to save company settings');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-full">
      <div className="bg-white shadow">
        <div className="px-4 sm:px-6 lg:max-w-7xl xl:max-w-8xl 2xl:max-w-9xl 3xl:max-w-10xl lg:mx-auto lg:px-8">
          <div className="py-6">
            <button
              onClick={() => navigate(`/admin/companies/${companyId}/manage`)}
              className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5 mr-2" />
              Back to Company Management
            </button>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Company Settings</h1>
                <p className="mt-1 text-sm text-gray-500">
                  Managing settings for {company?.name || 'this company'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:max-w-7xl xl:max-w-8xl 2xl:max-w-9xl 3xl:max-w-10xl lg:mx-auto lg:px-8 py-8">
        <div className="border-b border-gray-200 mb-6 overflow-x-auto scrollbar-hide">
          <nav className="-mb-px flex space-x-3 sm:space-x-8 min-w-max">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center py-3 sm:py-4 px-3 sm:px-4 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap flex-shrink-0 ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2 flex-shrink-0" />
                <span className="truncate">{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        {activeTab === 'company' && (
          <div className="bg-white shadow rounded-lg p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-lg font-medium text-gray-900">Company Information</h2>
            </div>
            <form onSubmit={handleSaveCompany}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={companyForm.name}
                    onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={companyForm.email}
                    onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={companyForm.phone}
                    onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address
                  </label>
                  <input
                    type="text"
                    value={companyForm.address}
                    onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    value={companyForm.city}
                    onChange={(e) => setCompanyForm({ ...companyForm, city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State
                  </label>
                  <input
                    type="text"
                    value={companyForm.state}
                    onChange={(e) => setCompanyForm({ ...companyForm, state: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ZIP Code
                  </label>
                  <input
                    type="text"
                    value={companyForm.zip}
                    onChange={(e) => setCompanyForm({ ...companyForm, zip: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'team' && (
          <div className="bg-white shadow rounded-lg p-4 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Teams</h2>
            {teams.length === 0 ? (
              <p className="text-gray-500">No teams found for this company.</p>
            ) : (
              <div className="space-y-4">
                {teams.map((team) => (
                  <div key={team.id} className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900">{team.name}</h3>
                    {team.description && (
                      <p className="text-sm text-gray-600 mt-1">{team.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'team_members' && (
          <div className="bg-white shadow rounded-lg p-4 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Team Members</h2>
            {teamMembers.length === 0 ? (
              <p className="text-gray-500">No team members found for this company.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {teamMembers.map((member) => (
                      <tr key={member.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {member.first_name} {member.last_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {member.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {member.role || member.user_role || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {member.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'security' && (
          <div className="bg-white shadow rounded-lg p-4 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Security Settings</h2>
            <p className="text-gray-500">Security settings for {company?.name}</p>
          </div>
        )}

        {activeTab === 'integrations' && (
          <div className="bg-white shadow rounded-lg p-4 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Integrations</h2>
            <p className="text-gray-500">Integrations for {company?.name}</p>
          </div>
        )}

        {activeTab === 'custom_fields' && (
          <div className="bg-white shadow rounded-lg p-4 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Custom Fields</h2>
            <p className="text-gray-500">Custom fields for {company?.name}</p>
          </div>
        )}
      </div>
    </div>
  );
}
