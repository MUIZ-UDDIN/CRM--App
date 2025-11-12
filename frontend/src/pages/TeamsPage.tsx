import React, { useState, useEffect } from 'react';
import { 
  UserPlusIcon, 
  UserGroupIcon,
  UserIcon,
  CheckCircleIcon,
  PencilIcon,
  TrashIcon,
  PlusCircleIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { Permission } from '../components/PermissionGuard';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = 'https://sunstonecrm.com/api';

interface Team {
  id: string;
  name: string;
  description: string | null;
  company_id: string;
  team_lead_id: string | null;
}

interface TeamMember {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  user_role: string;
}

export default function TeamsPage() {
  const { user, hasPermission } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<TeamMember[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  
  const [teamForm, setTeamForm] = useState({
    name: '',
    description: ''
  });

  // Check permissions
  const canManageTeams = hasPermission(Permission.MANAGE_COMPANY_USERS) || 
                         hasPermission(Permission.MANAGE_TEAM_USERS);
  
  const canManageMembers = hasPermission(Permission.MANAGE_TEAM_USERS);
  
  const isSuperAdmin = user?.role === 'super_admin';
  const isCompanyAdmin = user?.role === 'company_admin';
  const isSalesManager = user?.role === 'sales_manager';

  useEffect(() => {
    fetchTeams();
  }, []);

  useEffect(() => {
    if (selectedTeam) {
      fetchTeamMembers(selectedTeam.id);
    }
  }, [selectedTeam]);

  const fetchTeams = async () => {
    try {
      setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamMembers = async (teamId: string) => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await axios.get(`${API_URL}/teams/${teamId}/members`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setTeamMembers(response.data);
    } catch (error: any) {
      toast.error('Failed to load team members');
      console.error(error);
    }
  };

  const fetchAvailableUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Get all users without a team
      const response = await axios.get(`${API_URL}/companies/${user?.company_id}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Filter out users who are already in a team
      const availableUsers = response.data.filter((u: any) => !u.team_id);
      setAvailableUsers(availableUsers);
    } catch (error: any) {
      toast.error('Failed to load available users');
      console.error(error);
    }
  };

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
      setShowCreateModal(false);
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

  const handleAddMember = async () => {
    if (!selectedTeam || !selectedUserId) return;
    
    try {
      const token = localStorage.getItem('token');
      
      await axios.post(`${API_URL}/teams/${selectedTeam.id}/members`, {
        user_id: selectedUserId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Member added to team');
      fetchTeamMembers(selectedTeam.id);
      setShowAddMemberModal(false);
      setSelectedUserId('');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to add member to team');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!selectedTeam) return;
    
    if (!confirm('Are you sure you want to remove this member from the team?')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      
      await axios.delete(`${API_URL}/teams/${selectedTeam.id}/members/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Member removed from team');
      fetchTeamMembers(selectedTeam.id);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to remove member from team');
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
          <h1 className="text-2xl font-bold text-gray-900">Teams</h1>
          <p className="text-gray-600 mt-1">
            Manage your teams and team members
          </p>
        </div>
        {canManageTeams && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusCircleIcon className="w-5 h-5" />
            Create Team
          </button>
        )}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Teams List */}
        <div className="lg:col-span-1 bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-800">Teams</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {teams.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <UserGroupIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p>No teams yet</p>
                {canManageTeams && (
                  <p className="text-sm mt-1">Create your first team to get started</p>
                )}
              </div>
            ) : (
              teams.map((team) => (
                <div
                  key={team.id}
                  onClick={() => setSelectedTeam(team)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 ${
                    selectedTeam?.id === team.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="font-medium text-gray-900">{team.name}</div>
                  {team.description && (
                    <div className="text-sm text-gray-500 truncate">{team.description}</div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Team Details */}
        <div className="lg:col-span-3 bg-white rounded-lg shadow overflow-hidden">
          {!selectedTeam ? (
            <div className="p-6 text-center text-gray-500">
              <UserGroupIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-lg">Select a team to view details</p>
              {teams.length === 0 && canManageTeams && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="mt-4 inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <PlusCircleIcon className="w-5 h-5" />
                  Create Team
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{selectedTeam.name}</h2>
                    {selectedTeam.description && (
                      <p className="text-gray-600 mt-1">{selectedTeam.description}</p>
                    )}
                  </div>
                  {canManageTeams && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => toast('Edit feature coming soon!', { icon: 'ℹ️' })}
                        className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                        title="Edit team"
                      >
                        <PencilIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteTeam(selectedTeam.id)}
                        className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                        title="Delete team"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Team Members */}
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Team Members</h3>
                  {canManageMembers && (
                    <button
                      onClick={() => {
                        fetchAvailableUsers();
                        setShowAddMemberModal(true);
                      }}
                      className="flex items-center gap-2 bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      <UserPlusIcon className="w-4 h-4" />
                      Add Member
                    </button>
                  )}
                </div>

                <div className="overflow-x-auto">
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
                        {canManageMembers && (
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {teamMembers.length === 0 ? (
                        <tr>
                          <td colSpan={canManageMembers ? 4 : 3} className="px-6 py-12 text-center text-gray-500">
                            <UserIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                            <p>No team members yet</p>
                            {canManageMembers && (
                              <p className="text-sm mt-1">Add your first team member to get started</p>
                            )}
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
                                    {selectedTeam.team_lead_id === member.id && (
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
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                member.user_role === 'sales_manager' 
                                  ? 'bg-yellow-100 text-yellow-800' 
                                  : member.user_role === 'sales_rep'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {member.user_role === 'sales_manager' 
                                  ? 'Sales Manager' 
                                  : member.user_role === 'sales_rep'
                                  ? 'Sales Rep'
                                  : member.user_role}
                              </span>
                            </td>
                            {canManageMembers && (
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <div className="flex items-center gap-2">
                                  {selectedTeam.team_lead_id !== member.id && (
                                    <button
                                      onClick={() => handleSetTeamLead(member.id)}
                                      className="p-1 text-yellow-600 hover:text-yellow-800 hover:bg-yellow-50 rounded"
                                      title="Set as Team Lead"
                                    >
                                      <CheckCircleIcon className="w-5 h-5" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleRemoveMember(member.id)}
                                    className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                                    title="Remove from team"
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
              </div>
            </>
          )}
        </div>
      </div>

      {/* Create Team Modal */}
      {showCreateModal && (
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
                  onClick={() => setShowCreateModal(false)}
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

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Add Team Member</h2>
            
            {availableUsers.length === 0 ? (
              <div className="text-center py-6">
                <UserIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p className="text-gray-500">No available users to add</p>
                <p className="text-sm text-gray-500 mt-1">All users are already assigned to teams</p>
                <button
                  onClick={() => setShowAddMemberModal(false)}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Close
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select User *
                  </label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select a user</option>
                    {availableUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.first_name} {user.last_name} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddMemberModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddMember}
                    disabled={!selectedUserId}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    Add to Team
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
