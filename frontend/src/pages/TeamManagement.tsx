import { useState, useEffect } from 'react';
import { 
  UserPlusIcon, 
  EnvelopeIcon, 
  UserIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = 'https://sunstonecrm.com/api';

interface TeamMember {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  user_role: string;
  status: string;
  created_at: string;
}

export default function TeamManagement() {
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviting, setInviting] = useState(false);
  
  // Check if current user is admin
  const isAdmin = user?.role === 'company_admin' || user?.role === 'super_admin' || user?.role === 'Super Admin';

  const [inviteForm, setInviteForm] = useState({
    email: '',
    first_name: '',
    last_name: '',
    user_role: 'company_user'
  });

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const fetchTeamMembers = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch current user from API to get fresh data
      const userResponse = await axios.get(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const user = userResponse.data;
      
      console.log('TeamManagement - User data:', user);
      console.log('TeamManagement - User role:', user.role);
      console.log('TeamManagement - Company ID:', user.company_id);
      
      // Super Admins see all users, Company admins/users see only their company's users
      let response;
      
      if (user.role === 'super_admin' || user.role === 'Super Admin') {
        console.log('TeamManagement - Fetching ALL users (Super Admin)');
        // Super Admin sees all users across all companies
        response = await axios.get(`${API_URL}/users/`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        console.log('TeamManagement - Fetching company users (Company Admin/User)');
        // Company users see only their company's users
        if (!user.company_id) {
          toast.error('Company not found. Please contact support.');
          setLoading(false);
          return;
        }
        
        console.log('TeamManagement - Calling API:', `${API_URL}/companies/${user.company_id}/users`);
        response = await axios.get(`${API_URL}/companies/${user.company_id}/users`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      setTeamMembers(response.data);
    } catch (error: any) {
      toast.error('Failed to load team members');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);

    try {
      const token = localStorage.getItem('token');
      
      await axios.post(`${API_URL}/invitations/send`, inviteForm, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success(`Invitation sent to ${inviteForm.email}`);
      setShowInviteModal(false);
      setInviteForm({
        email: '',
        first_name: '',
        last_name: '',
        user_role: 'company_user'
      });
      
      // Refresh team members list
      fetchTeamMembers();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  const getRoleBadge = (role: string) => {
    const badges = {
      super_admin: 'bg-purple-100 text-purple-800',
      company_admin: 'bg-blue-100 text-blue-800',
      company_user: 'bg-gray-100 text-gray-800'
    };
    
    const labels = {
      super_admin: 'Super Admin',
      company_admin: 'Admin',
      company_user: 'User'
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${badges[role as keyof typeof badges] || badges.company_user}`}>
        {labels[role as keyof typeof labels] || role}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    if (status === 'active') {
      return (
        <span className="flex items-center gap-1 text-green-600">
          <CheckCircleIcon className="w-4 h-4" />
          <span className="text-sm">Active</span>
        </span>
      );
    }
    
    if (status === 'pending') {
      return (
        <span className="flex items-center gap-1 text-yellow-600">
          <ClockIcon className="w-4 h-4" />
          <span className="text-sm">Pending</span>
        </span>
      );
    }

    return (
      <span className="flex items-center gap-1 text-gray-600">
        <XCircleIcon className="w-4 h-4" />
        <span className="text-sm">{status}</span>
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
          <p className="text-gray-600 mt-1">
            {isAdmin ? 'Manage your team members and send invitations' : 'View your team members'}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <UserPlusIcon className="w-5 h-5" />
            Invite Team Member
          </button>
        )}
      </div>

      {/* Team Members List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Member
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Joined
              </th>
              {isAdmin && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {teamMembers.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 6 : 5} className="px-6 py-12 text-center text-gray-500">
                  <UserIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p>No team members yet</p>
                  <p className="text-sm mt-1">Invite your first team member to get started</p>
                </td>
              </tr>
            ) : (
              teamMembers.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-semibold">
                          {member.first_name[0]}{member.last_name[0]}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {member.first_name} {member.last_name}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{member.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getRoleBadge(member.user_role)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(member.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(member.created_at).toLocaleDateString()}
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toast('Edit feature coming soon!', { icon: 'ℹ️' })}
                          className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                          title="Edit member"
                        >
                          <PencilIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to remove ${member.first_name} ${member.last_name}?`)) {
                              toast('Delete feature coming soon!', { icon: 'ℹ️' });
                            }
                          }}
                          className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                          title="Remove member"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Invite Team Member</h2>
            
            <form onSubmit={handleInvite} className="space-y-4">
              {/* First Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  required
                  value={inviteForm.first_name}
                  onChange={(e) => setInviteForm({ ...inviteForm, first_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="John"
                />
              </div>

              {/* Last Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  required
                  value={inviteForm.last_name}
                  onChange={(e) => setInviteForm({ ...inviteForm, last_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Doe"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="john@company.com"
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role *
                </label>
                <select
                  value={inviteForm.user_role}
                  onChange={(e) => setInviteForm({ ...inviteForm, user_role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="company_user">Team Member</option>
                  <option value="company_admin">Admin</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Admins can invite users and manage settings
                </p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {inviting ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
