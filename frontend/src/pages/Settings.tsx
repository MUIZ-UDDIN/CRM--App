import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import ActionButtons from '../components/common/ActionButtons';
import { useAuth } from '../contexts/AuthContext';
import {
  UserGroupIcon,
  BuildingOfficeIcon,
  ShieldCheckIcon,
  CreditCardIcon,
  PuzzlePieceIcon,
  PlusIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

type TabType = 'team' | 'company' | 'security' | 'billing' | 'integrations';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  joined_at: string;
}

interface Integration {
  id: string;
  name: string;
  description: string;
  status: 'connected' | 'disconnected';
  icon: string;
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState<TabType>('team');
  const [showAddTeamModal, setShowAddTeamModal] = useState(false);
  const [showEditTeamModal, setShowEditTeamModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const { token, user } = useAuth();
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  
  // Check if current user is super admin
  const isSuperAdmin = user?.role === 'Super Admin' || user?.role === 'Admin';

  useEffect(() => {
    if (activeTab === 'team') {
      fetchTeamMembers();
    } else if (activeTab === 'company') {
      // Load company settings from localStorage
      const savedCompany = localStorage.getItem('companySettings');
      if (savedCompany) {
        setCompanyForm(JSON.parse(savedCompany));
      }
    } else if (activeTab === 'integrations') {
      // Check if Twilio is connected
      const savedTwilio = localStorage.getItem('twilioConfig');
      const savedGmail = localStorage.getItem('gmailConfig');
      
      setIntegrations(integrations.map(i => {
        if (i.name === 'Twilio' && savedTwilio) {
          return { ...i, status: 'connected' };
        }
        if (i.name === 'Gmail' && savedGmail) {
          return { ...i, status: 'connected' };
        }
        return i;
      }));
    }
  }, [activeTab]);

  const fetchTeamMembers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setTeamMembers(data.map((user: any) => ({
          id: user.id,
          name: `${user.first_name} ${user.last_name}`,
          email: user.email,
          role: user.role || 'User',
          status: user.is_active ? 'active' : 'inactive',
          joined_at: user.created_at?.split('T')[0] || 'N/A',
        })));
      }
    } catch (error) {
      console.error('Error fetching team members:', error);
      toast.error('Failed to load team members');
    }
  };

  const [integrations, setIntegrations] = useState<Integration[]>([
    { id: '1', name: 'Twilio', description: 'SMS, Voice calls, and messaging', status: 'disconnected', icon: '📱' },
    { id: '2', name: 'Gmail', description: 'Sync emails and calendar', status: 'disconnected', icon: '📧' },
  ]);
  
  const [showTwilioModal, setShowTwilioModal] = useState(false);
  const [twilioForm, setTwilioForm] = useState({
    accountSid: '',
    authToken: '',
    phoneNumber: ''
  });
  
  const [showGmailModal, setShowGmailModal] = useState(false);
  const [gmailForm, setGmailForm] = useState({
    email: '',
    appPassword: ''
  });
  
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const [teamForm, setTeamForm] = useState({ name: '', email: '', role: 'Regular User' });
  const [companyForm, setCompanyForm] = useState(() => {
    // Load company settings from localStorage on mount
    const saved = localStorage.getItem('companySettings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse company settings:', e);
      }
    }
    return {
      name: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zip: '',
    };
  });
  const [securityForm, setSecurityForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    twoFactorEnabled: false,
  });

  const tabs = [
    { id: 'team' as TabType, name: 'Team', icon: UserGroupIcon },
    { id: 'company' as TabType, name: 'Company', icon: BuildingOfficeIcon },
    { id: 'security' as TabType, name: 'Security', icon: ShieldCheckIcon },
    { id: 'billing' as TabType, name: 'Billing', icon: CreditCardIcon },
    { id: 'integrations' as TabType, name: 'Integrations', icon: PuzzlePieceIcon },
  ];

  const handleAddTeamMember = async () => {
    // Validate inputs
    if (!teamForm.name.trim()) {
      toast.error('Please enter a name for the team member');
      return;
    }
    if (!teamForm.email.trim()) {
      toast.error('Please enter an email address');
      return;
    }
    if (!teamForm.role) {
      toast.error('Please select a role');
      return;
    }
    if (teamForm.name.length > 255) {
      toast.error('Name cannot exceed 255 characters');
      return;
    }
    
    // Check for script tags
    if (/<script[^>]*>.*?<\/script>/gi.test(teamForm.name)) {
      toast.error('Invalid characters in name. Script tags are not allowed.');
      return;
    }
    
    try {
      const [firstName, ...lastNameParts] = teamForm.name.split(' ');
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: teamForm.email,
          password: 'ChangeMe123!',
          first_name: firstName,
          last_name: lastNameParts.join(' ') || 'User',
          role: teamForm.role,  // Send the selected role
        }),
      });
      if (response.ok) {
        toast.success(`Team member added with role: ${teamForm.role}. Default password: ChangeMe123!`);
        setShowAddTeamModal(false);
        setTeamForm({ name: '', email: '', role: 'Regular User' });  // Reset to Regular User default
        fetchTeamMembers();
      } else {
        const errorData = await response.json();
        // User-friendly error messages
        if (errorData.detail?.includes('already registered')) {
          toast.error(`A user with email '${teamForm.email}' is already registered. Please use a different email address.`);
        } else if (errorData.detail?.includes('exceed 255')) {
          toast.error('Name is too long. Please use a shorter name (max 255 characters).');
        } else if (errorData.detail?.includes('Script') || errorData.detail?.includes('HTML')) {
          toast.error('Invalid characters in name. Please remove any special characters or tags.');
        } else if (errorData.detail?.includes('empty')) {
          toast.error('Name cannot be empty. Please enter a valid name.');
        } else {
          toast.error(errorData.detail || 'Failed to add team member. Please check your inputs and try again.');
        }
      }
    } catch (error) {
      console.error('Error adding team member:', error);
      toast.error('Failed to add team member. Please check your connection and try again.');
    }
  };

  const handleEditTeamMember = (member: TeamMember) => {
    setSelectedMember(member);
    setTeamForm({ name: member.name, email: member.email, role: member.role });
    setShowEditTeamModal(true);
  };

  const handleUpdateTeamMember = async () => {
    if (!selectedMember) return;
    
    // Validate inputs
    if (!teamForm.name.trim()) {
      toast.error('Please enter a name');
      return;
    }
    if (!teamForm.email.trim()) {
      toast.error('Please enter an email address');
      return;
    }
    if (teamForm.name.length > 255) {
      toast.error('Name cannot exceed 255 characters');
      return;
    }
    
    // Check for script tags
    if (/<script[^>]*>.*?<\/script>/gi.test(teamForm.name)) {
      toast.error('Invalid characters in name. Script tags are not allowed.');
      return;
    }
    
    try {
      const [firstName, ...lastNameParts] = teamForm.name.split(' ');
      const response = await fetch(`${API_BASE_URL}/api/users/${selectedMember.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastNameParts.join(' ') || 'User',
          email: teamForm.email,
          role: teamForm.role,
        }),
      });
      
      if (response.ok) {
        toast.success('Team member updated successfully');
        setShowEditTeamModal(false);
        fetchTeamMembers();
      } else {
        const errorData = await response.json();
        if (errorData.detail?.includes('already')) {
          toast.error(`Email '${teamForm.email}' is already in use by another user`);
        } else {
          toast.error(errorData.detail || 'Failed to update team member');
        }
      }
    } catch (error) {
      console.error('Error updating team member:', error);
      toast.error('Failed to update team member. Please try again.');
    }
  };

  const handleDeleteTeamMember = async (member: TeamMember) => {
    if (!confirm(`Remove ${member.name}? This will permanently delete their account.`)) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/${member.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        setTeamMembers(teamMembers.filter(m => m.id !== member.id));
        toast.success('Team member removed permanently');
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to remove team member');
      }
    } catch (error) {
      console.error('Error deleting team member:', error);
      toast.error('Failed to remove team member');
    }
  };

  const handleToggleIntegration = (integration: Integration) => {
    // Twilio handling
    if (integration.name === 'Twilio' && integration.status === 'disconnected') {
      const savedTwilio = localStorage.getItem('twilioConfig');
      if (savedTwilio) {
        setTwilioForm(JSON.parse(savedTwilio));
      }
      setShowTwilioModal(true);
      return;
    }
    
    if (integration.name === 'Twilio' && integration.status === 'connected') {
      localStorage.removeItem('twilioConfig');
      setIntegrations(integrations.map(i =>
        i.id === integration.id ? { ...i, status: 'disconnected' } : i
      ));
      toast.success('Twilio disconnected');
      return;
    }
    
    // Gmail handling
    if (integration.name === 'Gmail' && integration.status === 'disconnected') {
      const savedGmail = localStorage.getItem('gmailConfig');
      if (savedGmail) {
        setGmailForm(JSON.parse(savedGmail));
      }
      setShowGmailModal(true);
      return;
    }
    
    if (integration.name === 'Gmail' && integration.status === 'connected') {
      localStorage.removeItem('gmailConfig');
      setIntegrations(integrations.map(i =>
        i.id === integration.id ? { ...i, status: 'disconnected' } : i
      ));
      toast.success('Gmail disconnected');
      return;
    }
    
    setIntegrations(integrations.map(i =>
      i.id === integration.id
        ? { ...i, status: i.status === 'connected' ? 'disconnected' : 'connected' }
        : i
    ));
    toast.success(`${integration.name} ${integration.status === 'connected' ? 'disconnected' : 'connected'}`);
  };
  
  const handleSaveTwilio = () => {
    if (!twilioForm.accountSid || !twilioForm.authToken || !twilioForm.phoneNumber) {
      toast.error('Please fill in all Twilio credentials');
      return;
    }
    
    // Save to localStorage
    localStorage.setItem('twilioConfig', JSON.stringify(twilioForm));
    
    // Update integration status
    setIntegrations(integrations.map(i =>
      i.name === 'Twilio' ? { ...i, status: 'connected' } : i
    ));
    
    setShowTwilioModal(false);
    toast.success('Twilio connected successfully!');
  };
  
  const handleSaveGmail = () => {
    if (!gmailForm.email || !gmailForm.appPassword) {
      toast.error('Please fill in all Gmail credentials');
      return;
    }
    
    // Save to localStorage
    localStorage.setItem('gmailConfig', JSON.stringify(gmailForm));
    
    // Update integration status
    setIntegrations(integrations.map(i =>
      i.name === 'Gmail' ? { ...i, status: 'connected' } : i
    ));
    
    setShowGmailModal(false);
    toast.success('Gmail connected successfully!');
  };

  const handleChangePassword = async () => {
    if (!securityForm.currentPassword || !securityForm.newPassword) {
      toast.error('Please fill in all password fields');
      return;
    }
    if (securityForm.newPassword !== securityForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (securityForm.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/users/me/change-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_password: securityForm.currentPassword,
          new_password: securityForm.newPassword,
        }),
      });

      if (response.ok) {
        toast.success('Password changed successfully');
        setSecurityForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
          twoFactorEnabled: securityForm.twoFactorEnabled,
        });
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to change password');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error('Failed to change password');
    }
  };

  return (
    <div className="min-h-full">
      <div className="bg-white shadow">
        <div className="px-4 sm:px-6 lg:max-w-7xl lg:mx-auto lg:px-8">
          <div className="py-6">
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            <p className="mt-1 text-sm text-gray-500">Manage your account and application settings</p>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:max-w-7xl lg:mx-auto lg:px-8 py-6">
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

        {activeTab === 'team' && (
          <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <h2 className="text-lg font-medium text-gray-900">Team Members</h2>
              {isSuperAdmin && (
                <button
                  onClick={() => setShowAddTeamModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 w-full sm:w-auto justify-center"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add Member
                </button>
              )}
            </div>
            
            {/* Desktop Table */}
            <div className="hidden md:block bg-white shadow rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {teamMembers.map((member) => (
                    <tr key={member.id}>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{member.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{member.email}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{member.role}</td>
                      <td className="px-6 py-4 text-right">
                        {isSuperAdmin ? (
                          <ActionButtons
                            onEdit={() => handleEditTeamMember(member)}
                            onDelete={() => handleDeleteTeamMember(member)}
                            showView={false}
                          />
                        ) : (
                          <span className="text-sm text-gray-400">No actions</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'company' && (
          <div className="bg-white shadow rounded-lg p-4 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4 sm:mb-6">Company Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
                <input
                  type="text"
                  value={companyForm.name}
                  onChange={(e) => setCompanyForm({...companyForm, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={companyForm.email}
                  onChange={(e) => setCompanyForm({...companyForm, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input
                  type="tel"
                  value={companyForm.phone}
                  onChange={(e) => setCompanyForm({...companyForm, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                <input
                  type="text"
                  value={companyForm.address}
                  onChange={(e) => setCompanyForm({...companyForm, address: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                <input
                  type="text"
                  value={companyForm.city}
                  onChange={(e) => setCompanyForm({...companyForm, city: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                <input
                  type="text"
                  value={companyForm.state}
                  onChange={(e) => setCompanyForm({...companyForm, state: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ZIP Code</label>
                <input
                  type="text"
                  value={companyForm.zip}
                  onChange={(e) => setCompanyForm({...companyForm, zip: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  localStorage.setItem('companySettings', JSON.stringify(companyForm));
                  toast.success('Company settings saved successfully');
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="bg-white shadow rounded-lg p-4 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4 sm:mb-6">Security Settings</h2>
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-4">Change Password</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                    <input
                      type="password"
                      value={securityForm.currentPassword}
                      onChange={(e) => setSecurityForm({...securityForm, currentPassword: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                    <input
                      type="password"
                      value={securityForm.newPassword}
                      onChange={(e) => setSecurityForm({...securityForm, newPassword: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                    <input
                      type="password"
                      value={securityForm.confirmPassword}
                      onChange={(e) => setSecurityForm({...securityForm, confirmPassword: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleChangePassword}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
                >
                  Update Security Settings
                </button>
              </div>
              
              {/* Delete Account Section */}
              <div className="pt-6 border-t border-gray-200">
                <h3 className="text-sm font-medium text-red-900 mb-2">Delete Account</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Once you delete your account, there is no going back. Please be certain.
                </p>
                <button
                  onClick={() => setShowDeleteAccountModal(true)}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                >
                  Delete My Account
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'billing' && (
          <div className="bg-white shadow rounded-lg p-4 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4 sm:mb-6">Billing & Subscription</h2>
            <div className="space-y-6">
              <div className="border border-gray-200 rounded-lg p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Professional Plan</h3>
                    <p className="text-sm text-gray-600 mt-1">Billed monthly</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">$99</p>
                    <p className="text-sm text-gray-600">/month</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600">Next billing date: February 15, 2024</p>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-4">Payment Method</h3>
                <div className="border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center">
                    <CreditCardIcon className="h-8 w-8 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">•••• •••• •••• 4242</p>
                      <p className="text-sm text-gray-600">Expires 12/2025</p>
                    </div>
                  </div>
                  <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">Update</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'integrations' && (
          <div className="space-y-4 sm:space-y-6">
            <h2 className="text-lg font-medium text-gray-900">Integrations</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {integrations.map((integration) => (
                <div key={integration.id} className="bg-white shadow rounded-lg p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center">
                      <span className="text-4xl mr-3">{integration.icon}</span>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{integration.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">{integration.description}</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      integration.status === 'connected' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {integration.status}
                    </span>
                    <button
                      onClick={() => handleToggleIntegration(integration)}
                      className={`px-4 py-2 text-sm font-medium rounded-lg ${
                        integration.status === 'connected'
                          ? 'text-red-600 hover:bg-red-50'
                          : 'text-white bg-primary-600 hover:bg-primary-700'
                      }`}
                    >
                      {integration.status === 'connected' ? 'Disconnect' : 'Connect'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Team Member Modal */}
      {showAddTeamModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Add Team Member</h3>
              <button onClick={() => setShowAddTeamModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter full name"
                  value={teamForm.name}
                  onChange={(e) => setTeamForm({...teamForm, name: e.target.value})}
                  maxLength={255}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  placeholder="Enter email address"
                  value={teamForm.email}
                  onChange={(e) => setTeamForm({...teamForm, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role <span className="text-red-500">*</span>
                </label>
                <select
                  value={teamForm.role}
                  onChange={(e) => setTeamForm({...teamForm, role: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                  required
                >
                  <option value="Super Admin">Super Admin</option>
                  <option value="Admin">Admin</option>
                  <option value="Sales Manager">Sales Manager</option>
                  <option value="Sales Rep">Sales Rep</option>
                  <option value="Regular User">Regular User</option>
                  <option value="Support">Support</option>
                </select>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowAddTeamModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddTeamMember}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
                >
                  Add Member
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Team Member Modal */}
      {showEditTeamModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Edit Team Member</h3>
              <button onClick={() => setShowEditTeamModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter full name"
                  value={teamForm.name}
                  onChange={(e) => setTeamForm({...teamForm, name: e.target.value})}
                  maxLength={255}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  placeholder="Enter email address"
                  value={teamForm.email}
                  onChange={(e) => setTeamForm({...teamForm, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role <span className="text-red-500">*</span>
                </label>
                <select
                  value={teamForm.role}
                  onChange={(e) => setTeamForm({...teamForm, role: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                  required
                >
                  <option value="Super Admin">Super Admin</option>
                  <option value="Admin">Admin</option>
                  <option value="Sales Manager">Sales Manager</option>
                  <option value="Sales Rep">Sales Rep</option>
                  <option value="Regular User">Regular User</option>
                  <option value="Support">Support</option>
                </select>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowEditTeamModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateTeamMember}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Twilio Configuration Modal */}
      {showTwilioModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Configure Twilio</h3>
              <button onClick={() => setShowTwilioModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account SID</label>
                <input
                  type="text"
                  placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  value={twilioForm.accountSid}
                  onChange={(e) => setTwilioForm({...twilioForm, accountSid: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Auth Token</label>
                <input
                  type="password"
                  placeholder="Your Twilio Auth Token"
                  value={twilioForm.authToken}
                  onChange={(e) => setTwilioForm({...twilioForm, authToken: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  placeholder="+1234567890"
                  value={twilioForm.phoneNumber}
                  onChange={(e) => setTwilioForm({...twilioForm, phoneNumber: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Get your Twilio credentials from{' '}
                  <a href="https://console.twilio.com" target="_blank" rel="noopener noreferrer" className="underline">
                    console.twilio.com
                  </a>
                </p>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowTwilioModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveTwilio}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
                >
                  Connect Twilio
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gmail Configuration Modal */}
      {showGmailModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Configure Gmail</h3>
              <button onClick={() => setShowGmailModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gmail Address</label>
                <input
                  type="email"
                  placeholder="your.email@gmail.com"
                  value={gmailForm.email}
                  onChange={(e) => setGmailForm({...gmailForm, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">App Password</label>
                <input
                  type="password"
                  placeholder="16-character app password"
                  value={gmailForm.appPassword}
                  onChange={(e) => setGmailForm({...gmailForm, appPassword: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Generate an App Password from{' '}
                  <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="underline">
                    Google Account Settings
                  </a>
                  . Regular passwords won't work.
                </p>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowGmailModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveGmail}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
                >
                  Connect Gmail
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {showDeleteAccountModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-red-900">Delete Account</h3>
              <button onClick={() => {
                setShowDeleteAccountModal(false);
                setDeleteConfirmText('');
              }} className="text-gray-400 hover:text-gray-600">
                <span className="text-2xl">&times;</span>
              </button>
            </div>
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">
                  <strong>Warning:</strong> This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type <strong>DELETE MY ACCOUNT</strong> to confirm
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE MY ACCOUNT"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => {
                    setShowDeleteAccountModal(false);
                    setDeleteConfirmText('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (deleteConfirmText === 'DELETE MY ACCOUNT') {
                      try {
                        const response = await fetch(`${API_BASE_URL}/api/users/me`, {
                          method: 'DELETE',
                          headers: {
                            'Authorization': `Bearer ${token}`,
                          },
                        });
                        if (response.ok) {
                          toast.success('Account deleted successfully');
                          // Logout and redirect
                          localStorage.removeItem('token');
                          window.location.href = '/auth/login';
                        } else {
                          toast.error('Failed to delete account');
                        }
                      } catch (error) {
                        toast.error('Failed to delete account');
                      }
                    } else {
                      toast.error('Please type DELETE MY ACCOUNT to confirm');
                    }
                  }}
                  disabled={deleteConfirmText !== 'DELETE MY ACCOUNT'}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
