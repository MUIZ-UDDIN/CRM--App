import { useState, useEffect } from 'react';
import { 
  UserPlusIcon, 
  EnvelopeIcon, 
  UserIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon
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

interface Team {
  id: string;
  name: string;
  description: string | null;
  company_id: string;
  team_lead_id: string | null;
}

export default function TeamManagement() {
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [inviting, setInviting] = useState(false);
  
  // Check user roles
  const isAdmin = user?.role === 'company_admin' || user?.role === 'super_admin' || user?.role === 'Super Admin';
  const isSalesManager = user?.role === 'sales_manager';
  const canManageUsers = isAdmin || isSalesManager;
  const canManageTeams = isAdmin;

  const [teamForm, setTeamForm] = useState({
    name: '',
    description: ''
  });

  const [inviteForm, setInviteForm] = useState({
    email: '',
    first_name: '',
    last_name: '',
    user_role: 'company_user'
  });

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (showInviteModal || showCreateTeamModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showInviteModal, showCreateTeamModal]);

  useEffect(() => {
    fetchTeamMembers();
    fetchTeams();
  }, []);
  
  useEffect(() => {
    if (selectedTeam) {
      fetchTeamMembers(selectedTeam.id);
    }
  }, [selectedTeam]);

  const fetchTeams = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await axios.get(`${API_URL}/teams`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setTeams(response.data);
      
      // If teams exist, select the first one by default
      if (response.data.length > 0) {
        setSelectedTeam(response.data[0]);
      }
    } catch (error: any) {
      toast.error('Failed to load teams');
      console.error(error);
    }
  };

  const fetchTeamMembers = async (teamId?: string) => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch current user from API to get fresh data
      const userResponse = await axios.get(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const currentUser = userResponse.data;
      
      // Determine which endpoint to call based on team selection and user role
      let apiUrl;
      if (teamId) {
        // If a team is selected, get its members
        apiUrl = `${API_URL}/teams/${teamId}/members`;
      } else if (currentUser.role === 'super_admin' || currentUser.role === 'Super Admin') {
        // Super Admin sees all users
        apiUrl = `${API_URL}/users/`;
      } else {
        // Company users see only their company's users
        if (!currentUser.company_id) {
          toast.error('Company not found. Please contact support.');
          return;
        }
        apiUrl = `${API_URL}/companies/${currentUser.company_id}/users`;
      }
      
      const response = await axios.get(apiUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
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
      if (selectedTeam) {
        fetchTeamMembers(selectedTeam.id);
      } else {
        fetchTeamMembers();
      }
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
      sales_manager: 'bg-yellow-100 text-yellow-800',
      sales_rep: 'bg-green-100 text-green-800',
      company_user: 'bg-gray-100 text-gray-800'
    };
    
    const labels = {
      super_admin: 'Super Admin',
      company_admin: 'Admin',
      sales_manager: 'Sales Manager',
      sales_rep: 'Sales Rep',
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

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      
      const response = await axios.post(`${API_URL}/teams`, teamForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Team created successfully');
      setTeams([...teams, response.data]);
      setSelectedTeam(response.data);
      setShowCreateTeamModal(false);
      setTeamForm({ name: '', description: '' });
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to create team');
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!confirm('Are you sure you want to delete this team? All members will be unassigned.')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      
      await axios.delete(`${API_URL}/teams/${teamId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Team deleted successfully');
      setTeams(teams.filter(team => team.id !== teamId));
      setSelectedTeam(null);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to delete team');
    }
  };

  const handleSetTeamLead = async (userId: string) => {
    if (!selectedTeam) return;
    
    try {
      const token = localStorage.getItem('token');
      
      await axios.post(`${API_URL}/teams/${selectedTeam.id}/lead/${userId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Team lead set successfully');
      
      // Update the selected team with the new team lead
      setSelectedTeam({
        ...selectedTeam,
        team_lead_id: userId
      });
      
      // Refresh team members to update roles
      fetchTeamMembers(selectedTeam.id);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to set team lead');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
          <p className="text-gray-600 mt-1">
            {isAdmin ? 'Manage your teams and team members' : 'View your team members'}
          </p>
        </div>
        <div className="flex gap-3">
          {canManageTeams && (
            <button
              onClick={() => setShowCreateTeamModal(true)}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              <PlusIcon className="w-5 h-5" />
              Create Team
            </button>
          )}
          {canManageUsers && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <UserPlusIcon className="w-5 h-5" />
              Invite Member
            </button>
          )}
        </div>
      </div>
      
      {/* Teams Selection */}
      {teams.length > 0 && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Team</label>
          <div className="flex flex-wrap gap-2">
            {teams.map(team => (
              <button
                key={team.id}
                onClick={() => setSelectedTeam(team)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedTeam?.id === team.id
                  ? 'bg-blue-100 text-blue-800 border border-blue-300'
                  : 'bg-gray-100 text-gray-800 border border-gray-200 hover:bg-gray-200'
                }`}
              >
                {team.name}
                {canManageTeams && selectedTeam?.id === team.id && (
                  <span 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTeam(team.id);
                    }}
                    className="ml-2 text-red-500 hover:text-red-700"
                    title="Delete team"
                  >
                    ×
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Team Members List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {selectedTeam && (
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{selectedTeam.name}</h2>
                {selectedTeam.description && (
                  <p className="text-sm text-gray-600 mt-1">{selectedTeam.description}</p>
                )}
              </div>
            </div>
          </div>
        )}
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
              {canManageUsers && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {teamMembers.length === 0 ? (
              <tr>
                <td colSpan={canManageUsers ? 6 : 5} className="px-6 py-12 text-center text-gray-500">
                  <UserIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p>{teams.length === 0 ? 'No teams created yet' : 'No members in this team'}</p>
                  <p className="text-sm mt-1">
                    {teams.length === 0 
                      ? (canManageTeams ? 'Create your first team to get started' : 'No teams available') 
                      : (canManageUsers ? 'Invite members to this team' : 'This team has no members')}
                  </p>
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
                      <div className="ml-4 min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-900 truncate" title={`${member.first_name} ${member.last_name}`}>
                          {member.first_name} {member.last_name}
                          {selectedTeam?.team_lead_id === member.id && (
                            <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                              Team Lead
                            </span>
                          )}
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
                  {canManageUsers && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        {selectedTeam && selectedTeam.team_lead_id !== member.id && (
                          <button
                            onClick={() => handleSetTeamLead(member.id)}
                            className="p-1 text-yellow-600 hover:text-yellow-800 hover:bg-yellow-50 rounded"
                            title="Set as Team Lead"
                          >
                            <CheckCircleIcon className="w-5 h-5" />
                          </button>
                        )}
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

      {/* Create Team Modal */}
      {showCreateTeamModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Create New Team</h2>
            
            <form onSubmit={handleCreateTeam} className="space-y-4">
              {/* Team Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Team Name *
                </label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={teamForm.name}
                  onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Sales Team"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  maxLength={500}
                  value={teamForm.description}
                  onChange={(e) => setTeamForm({ ...teamForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Team description (optional)"
                  rows={3}
                />
                <p className="mt-1 text-xs text-gray-500">{teamForm.description.length}/500 characters</p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateTeamModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                  maxLength={100}
                  value={inviteForm.first_name}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value.length > 100) {
                      toast.error('First name cannot exceed 100 characters');
                      return;
                    }
                    if (!/<[^>]*>/gi.test(value)) {
                      setInviteForm({ ...inviteForm, first_name: value });
                    } else {
                      toast.error('HTML tags and scripts are not allowed. Please enter plain text only.');
                    }
                  }}
                  onPaste={(e) => {
                    const pastedText = e.clipboardData.getData('text');
                    if (/<[^>]*>/gi.test(pastedText)) {
                      e.preventDefault();
                      toast.error('HTML tags and scripts are not allowed. Please enter plain text only.');
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="John"
                />
                <p className="mt-1 text-xs text-gray-500">{inviteForm.first_name.length}/100 characters</p>
              </div>

              {/* Last Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={inviteForm.last_name}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value.length > 100) {
                      toast.error('Last name cannot exceed 100 characters');
                      return;
                    }
                    if (!/<[^>]*>/gi.test(value)) {
                      setInviteForm({ ...inviteForm, last_name: value });
                    } else {
                      toast.error('HTML tags and scripts are not allowed. Please enter plain text only.');
                    }
                  }}
                  onPaste={(e) => {
                    const pastedText = e.clipboardData.getData('text');
                    if (/<[^>]*>/gi.test(pastedText)) {
                      e.preventDefault();
                      toast.error('HTML tags and scripts are not allowed. Please enter plain text only.');
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Doe"
                />
                <p className="mt-1 text-xs text-gray-500">{inviteForm.last_name.length}/100 characters</p>
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
                  {isAdmin && (
                    <>
                      <option value="company_admin">Admin</option>
                      <option value="sales_manager">Sales Manager</option>
                    </>
                  )}
                  <option value="sales_rep">Sales Rep</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {inviteForm.user_role === 'company_admin' && 'Admins can invite users and manage company settings'}
                  {inviteForm.user_role === 'sales_manager' && 'Sales Managers can manage their team members and assign leads'}
                  {inviteForm.user_role === 'sales_rep' && 'Sales Reps can manage their own leads and clients'}
                  {inviteForm.user_role === 'company_user' && 'Team Members have basic access to the system'}
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
