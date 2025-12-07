import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { toast } from 'react-hot-toast';
import {
  ArrowLeftIcon,
  UserPlusIcon,
  TrashIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  UserIcon,
  EllipsisVerticalIcon,
  XMarkIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';

const API_URL = 'https://sunstonecrm.com/api';

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
  team_id?: string;
}

interface Company {
  id: string;
  name: string;
  plan_type: string;
  status: string;
  created_at: string;
}

interface Team {
  id: string;
  name: string;
}

const CompanyManagement: React.FC = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  
  const [company, setCompany] = useState<Company | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  const [showRoleChangeModal, setShowRoleChangeModal] = useState(false);
  const [selectedUserForRoleChange, setSelectedUserForRoleChange] = useState<User | null>(null);
  const [showTeamReassignModal, setShowTeamReassignModal] = useState(false);
  const [selectedUserForTeamReassign, setSelectedUserForTeamReassign] = useState<User | null>(null);
  const [reassignmentImpact, setReassignmentImpact] = useState<any>(null);
  const [reassignData, setReassignData] = useState(false);
  const [newOwnerId, setNewOwnerId] = useState('');
  const [showDeleteUserModal, setShowDeleteUserModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string } | null>(null);
  
  // Add user form state
  const [newUser, setNewUser] = useState({
    first_name: '',
    last_name: '',
    email: '',
    role: 'regular_user',
    team_id: '',
  });

  useEffect(() => {
    fetchCompanyData();
    fetchUsers();
    fetchTeams();
  }, [companyId]);

  // Close dropdown on any scroll
  useEffect(() => {
    const handleScroll = () => {
      if (openDropdownId) {
        setOpenDropdownId(null);
        setDropdownPosition(null);
      }
    };

    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [openDropdownId]);

  const fetchCompanyData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/companies/${companyId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCompany(data);
      } else {
        toast.error('Failed to load company details');
      }
    } catch (error) {
      console.error('Error fetching company:', error);
      toast.error('Error loading company details');
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/admin/companies/${companyId}/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else {
        toast.error('Failed to load users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Error loading users');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/admin/companies/${companyId}/teams`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTeams(data);
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newUser.first_name || !newUser.last_name || !newUser.email || !newUser.role) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    // Check for HTML tags or script tags
    if (/<[^>]+>/gi.test(newUser.first_name) || /<[^>]+>/gi.test(newUser.last_name)) {
      toast.error('HTML tags and scripts are not allowed. Please enter plain text only.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/admin/companies/${companyId}/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newUser,
          team_id: newUser.team_id || null,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`User created successfully! Password: ${data.password}`);
        setShowAddUserModal(false);
        setNewUser({
          first_name: '',
          last_name: '',
          email: '',
          role: 'regular_user',
          team_id: '',
        });
        fetchUsers();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to create user');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error('Error creating user');
    }
  };

  const openDeleteUserModal = (userId: string, userName: string) => {
    setUserToDelete({ id: userId, name: userName });
    setShowDeleteUserModal(true);
    setOpenDropdownId(null);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/admin/companies/${companyId}/users/${userToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast.success('User deleted successfully');
        setShowDeleteUserModal(false);
        setUserToDelete(null);
        fetchUsers();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Error deleting user');
    }
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (response.ok) {
        toast.success('User role updated successfully');
        fetchUsers();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to update role');
      }
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Error updating role');
    }
  };

  // Normalize role to lowercase with underscores
  const normalizeRole = (role: string): string => {
    if (!role) return 'regular_user';
    // Handle both enum values and display names
    const cleaned = role.toLowerCase().trim().replace(/\s+/g, '_');
    return cleaned;
  };

  const getRoleDisplayName = (role: string) => {
    if (!role) {
      return 'Sales Rep';
    }
    const normalized = normalizeRole(role);
    
    // Map all possible role variations
    const roleMap: { [key: string]: string } = {
      'company_admin': 'Company Admin',
      'companyadmin': 'Company Admin',
      'sales_manager': 'Company Admin',  // Legacy - now company_admin
      'salesmanager': 'Company Admin',
      'super_admin': 'Super Admin',
      'superadmin': 'Super Admin',
      'regular_user': 'Regular User',
      'regularuser': 'Regular User',
      'sales_rep': 'Regular User',  // Legacy - now regular_user
      'salesrep': 'Regular User',
      'company_user': 'Regular User',  // Legacy - now regular_user
      'companyuser': 'Regular User',
      'user': 'Regular User',
      'employee': 'Regular User',
    };
    
    const displayName = roleMap[normalized] || role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    return displayName;
  };

  const getRoleIcon = (role: string) => {
    const normalized = normalizeRole(role);
    switch (normalized) {
      case 'company_admin':
      case 'super_admin':
        return <ShieldCheckIcon className="w-5 h-5 text-purple-600" />;
      case 'regular_user':
      case 'sales_rep':  // Legacy
      case 'sales_manager':  // Legacy
      case 'company_user':  // Legacy
        return <UserIcon className="w-5 h-5 text-green-600" />;
      default:
        return <UserIcon className="w-5 h-5 text-gray-600" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    const normalized = normalizeRole(role);
    switch (normalized) {
      case 'company_admin':
      case 'super_admin':
        return 'bg-purple-100 text-purple-800';
      case 'regular_user':
      case 'sales_rep':  // Legacy
      case 'sales_manager':  // Legacy
      case 'company_user':  // Legacy
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    const statusLower = status.toLowerCase();
    switch (statusLower) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-red-100 text-red-800';
      case 'suspended':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-50">
      <div className="px-4 sm:px-6 lg:max-w-7xl xl:max-w-8xl 2xl:max-w-9xl 3xl:max-w-10xl lg:mx-auto lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeftIcon className="w-5 h-5 mr-2" />
            Back to Dashboard
          </button>
          
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0 mr-4">
              <h1 className="text-3xl font-bold text-gray-900 truncate" title={company?.name}>{company?.name}</h1>
              <p className="text-gray-600 mt-1">Manage users and permissions</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAddUserModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <UserPlusIcon className="w-5 h-5" />
                Add User
              </button>
              <button
                onClick={() => navigate(`/admin/companies/${companyId}/manage/settings`)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <Cog6ToothIcon className="w-5 h-5" />
                Settings
              </button>
            </div>
          </div>
        </div>

        {/* Company Info Card */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-gray-600">Plan</p>
              <p className="text-lg font-semibold text-gray-900">
                {(() => {
                  const plan = (company?.plan_type || 'free').toLowerCase();
                  if (plan === 'free') return 'Free Trial';
                  if (plan === 'pro') return 'Pro';
                  if (plan === 'enterprise') return 'Enterprise';
                  return 'Free Trial';
                })()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeColor(company?.status || '')}`}>
                {company?.status ? company.status.charAt(0).toUpperCase() + company.status.slice(1).toLowerCase() : 'Active'}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Users</p>
              <p className="text-lg font-semibold text-gray-900">{users.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Created</p>
              <p className="text-lg font-semibold text-gray-900">
                {company?.created_at ? new Date(company.created_at).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow-sm relative z-0">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Users</h2>
          </div>
          
          <div 
            className="overflow-x-auto overflow-y-auto max-h-[600px] relative z-0 rounded-b-lg"
            onScroll={() => {
              // Close dropdown when scrolling
              if (openDropdownId) {
                setOpenDropdownId(null);
                setDropdownPosition(null);
              }
            }}
          >
            <table className="min-w-full divide-y divide-gray-200 relative z-0">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
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
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user, index) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold">
                            {user.first_name[0]}{user.last_name[0]}
                          </span>
                        </div>
                        <div className="ml-4 min-w-0 flex-1">
                          <div className="text-sm font-medium text-gray-900 truncate max-w-xs" title={`${user.first_name} ${user.last_name}`}>
                            {user.first_name} {user.last_name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 truncate max-w-xs" title={user.email}>{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getRoleIcon(user.role)}
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                          {getRoleDisplayName(user.role)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(user.status)}`}>
                        {user.status.charAt(0).toUpperCase() + user.status.slice(1).toLowerCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="relative inline-block z-50">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (openDropdownId === user.id) {
                              setOpenDropdownId(null);
                              setDropdownPosition(null);
                            } else {
                              setOpenDropdownId(user.id);
                              const rect = e.currentTarget.getBoundingClientRect();
                              setDropdownPosition({
                                top: rect.bottom + 8,
                                left: rect.right - 224 // 224px = w-56
                              });
                            }
                          }}
                          className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                          id={`dropdown-button-${user.id}`}
                        >
                          <EllipsisVerticalIcon className="w-5 h-5 text-gray-600" />
                        </button>
                        
                        {openDropdownId === user.id && dropdownPosition && createPortal(
                          <>
                            <div 
                              className="fixed inset-0 z-[9998]" 
                              onClick={() => {
                                setOpenDropdownId(null);
                                setDropdownPosition(null);
                              }}
                            />
                            <div 
                              className="fixed w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-[9999]"
                              style={{
                                top: `${dropdownPosition.top}px`,
                                left: `${dropdownPosition.left}px`
                              }}
                            >
                                {/* Change Role */}
                                <button
                                  onClick={() => {
                                    setSelectedUserForRoleChange(user);
                                    setShowRoleChangeModal(true);
                                    setOpenDropdownId(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                >
                                  <ShieldCheckIcon className="w-4 h-4 text-blue-600" />
                                  Change Role
                                </button>
                                
                                {/* Reassign Team */}
                                <button
                                  onClick={async () => {
                                    setSelectedUserForTeamReassign(user);
                                    setOpenDropdownId(null);
                                    // Fetch impact
                                    try {
                                      const token = localStorage.getItem('token');
                                      const response = await fetch(`${API_URL}/team/reassignment-impact/${user.id}`, {
                                        headers: { 'Authorization': `Bearer ${token}` }
                                      });
                                      if (response.ok) {
                                        const data = await response.json();
                                        setReassignmentImpact(data.impact);
                                      }
                                    } catch (error) {
                                      console.error('Error fetching impact:', error);
                                    }
                                    setShowTeamReassignModal(true);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                >
                                  <UserGroupIcon className="w-4 h-4 text-purple-600" />
                                  Reassign Team
                                </button>
                                
                                <div className="border-t border-gray-200 my-1"></div>
                                
                                {/* Delete User */}
                                <button
                                  onClick={() => openDeleteUserModal(user.id, `${user.first_name} ${user.last_name}`)}
                                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                >
                                  <TrashIcon className="w-4 h-4" />
                                  Delete User
                                </button>
                              </div>
                            </>
                          ,
                          document.body
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">Add New User</h3>
              <button
                onClick={() => setShowAddUserModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleAddUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newUser.first_name}
                  onChange={(e) => setNewUser({ ...newUser, first_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  maxLength={50}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">{newUser.first_name.length}/50 characters</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newUser.last_name}
                  onChange={(e) => setNewUser({ ...newUser, last_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  maxLength={50}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">{newUser.last_name.length}/50 characters</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  maxLength={255}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">{newUser.email.length}/255 characters</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role <span className="text-red-500">*</span>
                </label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="regular_user">Regular User</option>
                  <option value="company_admin">Company Admin</option>
                </select>
              </div>
              
              {/* Team assignment removed - company admins manage all company data, regular users manage own data */}
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Role Change Modal */}
      {showRoleChangeModal && selectedUserForRoleChange && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">Change User Role</h3>
              <button
                onClick={() => {
                  setShowRoleChangeModal(false);
                  setSelectedUserForRoleChange(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  Change role for: <span className="font-semibold">{selectedUserForRoleChange.first_name} {selectedUserForRoleChange.last_name}</span>
                </p>
                <p className="text-sm text-gray-500">
                  Current role: <span className="font-medium">{getRoleDisplayName(selectedUserForRoleChange.role)}</span>
                </p>
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select New Role
                </label>

                {/* Role Options */}
                <div className="space-y-2">
                  {[
                    { value: 'company_admin', label: 'Company Admin', icon: ShieldCheckIcon, color: 'purple' },
                    { value: 'regular_user', label: 'Regular User', icon: UserIcon, color: 'green' },
                  ]
                    .filter(role => normalizeRole(selectedUserForRoleChange.role) !== role.value)
                    .map((role) => {
                      const Icon = role.icon;
                      return (
                        <button
                          key={role.value}
                          onClick={() => {
                            handleChangeRole(selectedUserForRoleChange.id, role.value);
                            setShowRoleChangeModal(false);
                            setSelectedUserForRoleChange(null);
                          }}
                          className={`w-full px-4 py-3 text-left border-2 border-gray-200 rounded-lg hover:border-${role.color}-500 hover:bg-${role.color}-50 transition-all flex items-center gap-3 group`}
                        >
                          <Icon className={`w-5 h-5 text-${role.color}-600`} />
                          <div>
                            <div className="font-medium text-gray-900">{role.label}</div>
                            <div className="text-xs text-gray-500">
                              {role.value === 'company_admin' && 'Full access to company data and team management'}
                              {role.value === 'regular_user' && 'Access to own deals and contacts'}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                </div>

              </div>

              <div className="mt-6">
                <button
                  onClick={() => {
                    setShowRoleChangeModal(false);
                    setSelectedUserForRoleChange(null);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Team Reassignment Modal */}
      {showTeamReassignModal && selectedUserForTeamReassign && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Reassign Team</h2>
                <button
                  onClick={() => {
                    setShowTeamReassignModal(false);
                    setSelectedUserForTeamReassign(null);
                    setReassignmentImpact(null);
                    setReassignData(false);
                    setNewOwnerId('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="mb-6">
                <p className="text-gray-600">
                  Reassigning <span className="font-semibold">{selectedUserForTeamReassign.first_name} {selectedUserForTeamReassign.last_name}</span> to a different team.
                </p>
              </div>

              {/* Impact Preview */}
              {reassignmentImpact && reassignmentImpact.total_records > 0 && (
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h3 className="font-semibold text-yellow-900 mb-2">⚠️ Data Ownership Impact</h3>
                  <p className="text-sm text-yellow-800 mb-3">
                    This user currently owns:
                  </p>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="bg-white p-3 rounded">
                      <div className="text-2xl font-bold text-blue-600">{reassignmentImpact.deals_count}</div>
                      <div className="text-xs text-gray-600">Deals</div>
                    </div>
                    <div className="bg-white p-3 rounded">
                      <div className="text-2xl font-bold text-green-600">{reassignmentImpact.contacts_count}</div>
                      <div className="text-xs text-gray-600">Contacts</div>
                    </div>
                    <div className="bg-white p-3 rounded">
                      <div className="text-2xl font-bold text-purple-600">{reassignmentImpact.activities_count}</div>
                      <div className="text-xs text-gray-600">Activities</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Team Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Team
                </label>
                <select
                  value={newUser.team_id}
                  onChange={(e) => setNewUser({ ...newUser, team_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">No Team (Remove from team)</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Data Reassignment Option */}
              {reassignmentImpact && reassignmentImpact.total_records > 0 && (
                <div className="mb-6">
                  <label className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
                    <input
                      type="checkbox"
                      checked={reassignData}
                      onChange={(e) => setReassignData(e.target.checked)}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <div>
                      <div className="font-medium text-gray-900">Transfer data ownership</div>
                      <div className="text-sm text-gray-600">
                        Reassign all deals, contacts, and activities to another user
                      </div>
                    </div>
                  </label>

                  {reassignData && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        New Owner <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={newOwnerId}
                        onChange={(e) => setNewOwnerId(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      >
                        <option value="">Select new owner...</option>
                        {users
                          .filter(u => u.id !== selectedUserForTeamReassign.id && u.status === 'active')
                          .map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.first_name} {user.last_name} ({user.role})
                            </option>
                          ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowTeamReassignModal(false);
                    setSelectedUserForTeamReassign(null);
                    setReassignmentImpact(null);
                    setReassignData(false);
                    setNewOwnerId('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (reassignData && !newOwnerId) {
                      toast.error('Please select a new owner for the data');
                      return;
                    }

                    try {
                      const token = localStorage.getItem('token');
                      const response = await fetch(`${API_URL}/team/reassign`, {
                        method: 'POST',
                        headers: {
                          'Authorization': `Bearer ${token}`,
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          user_id: selectedUserForTeamReassign.id,
                          new_team_id: newUser.team_id || null,
                          reassign_data: reassignData,
                          new_owner_id: reassignData ? newOwnerId : null,
                        }),
                      });

                      if (response.ok) {
                        const data = await response.json();
                        toast.success(data.message || 'User reassigned successfully');
                        fetchUsers(); // Refresh user list
                        setShowTeamReassignModal(false);
                        setSelectedUserForTeamReassign(null);
                        setReassignmentImpact(null);
                        setReassignData(false);
                        setNewOwnerId('');
                      } else {
                        const error = await response.json();
                        toast.error(error.detail || 'Failed to reassign user');
                      }
                    } catch (error) {
                      console.error('Error reassigning user:', error);
                      toast.error('Failed to reassign user');
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Reassign Team
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {showDeleteUserModal && userToDelete && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-[9999] flex items-center justify-center p-4" 
          onClick={() => setShowDeleteUserModal(false)}
        >
          <div className="relative mx-auto p-6 border w-full max-w-md shadow-lg rounded-md bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base sm:text-lg font-medium text-gray-900">Confirm User Deletion</h3>
              <button onClick={() => setShowDeleteUserModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="mb-6">
              <p className="text-gray-700">
                Are you sure you want to permanently delete <span className="font-semibold text-red-600">{userToDelete.name}</span>?
              </p>
              <p className="text-sm text-red-600 mt-2 font-semibold">
                This action CANNOT be undone!
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteUserModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                No, Cancel
              </button>
              <button
                onClick={confirmDeleteUser}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                Yes, Delete User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyManagement;
