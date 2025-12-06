import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import ActionButtons from '../components/common/ActionButtons';
import { useAuth } from '../contexts/AuthContext';
import * as twilioService from '../services/twilioService';
import * as emailService from '../services/emailService';
import apiClient from '../services/apiClient';
import {
  UserGroupIcon,
  BuildingOfficeIcon,
  ShieldCheckIcon,
  CreditCardIcon,
  PuzzlePieceIcon,
  PlusIcon,
  XMarkIcon,
  AdjustmentsHorizontalIcon,
  BanknotesIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ClockIcon,
  UserPlusIcon,
  UserIcon,
  PencilIcon,
  TrashIcon,
  PlusCircleIcon,
  PhoneIcon,
  ArrowPathIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';

type TabType = 'company' | 'security' | 'billing' | 'team' | 'team_members' | 'integrations' | 'custom_fields';

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

interface Team {
  id: string;
  name: string;
  description: string | null;
  company_id: string;
  team_lead_id: string | null;
}

interface Integration {
  id: string;
  name: string;
  description: string;
  status: 'connected' | 'disconnected';
  icon: string;
}

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

export default function CompanySettings() {
  const { companyId } = useParams<{ companyId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tabFromUrl = searchParams.get('tab') as TabType | null;
  const subPageFromUrl = searchParams.get('subpage');
  const [activeTab, setActiveTab] = useState<TabType>(tabFromUrl || 'company');
  const [integrationsSubPage, setIntegrationsSubPage] = useState<string | null>(subPageFromUrl);
  
  // Update active tab when URL changes
  useEffect(() => {
    if (tabFromUrl) {
      setActiveTab(tabFromUrl);
    }
    if (subPageFromUrl) {
      setIntegrationsSubPage(subPageFromUrl);
    }
  }, [tabFromUrl, subPageFromUrl]);
  
  // Helper function to change tab and update URL
  const changeTab = (tab: TabType) => {
    setActiveTab(tab);
    setIntegrationsSubPage(null);
    navigate(`/admin/companies/${companyId}/manage/settings?tab=${tab}`, { replace: true });
  };
  
  // Helper function to navigate to integrations subpage
  const navigateToIntegrationsSubPage = (subpage: string) => {
    setActiveTab('integrations');
    setIntegrationsSubPage(subpage);
    navigate(`/admin/companies/${companyId}/manage/settings?tab=integrations&subpage=${subpage}`, { replace: true });
  };
  const [showAddTeamModal, setShowAddTeamModal] = useState(false);
  const [showEditTeamModal, setShowEditTeamModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [showAddRoleModal, setShowAddRoleModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [customRoles, setCustomRoles] = useState<string[]>([]);
  const [roleSearchTerm, setRoleSearchTerm] = useState('');
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showDeleteTeamModal, setShowDeleteTeamModal] = useState(false);
  const [showRemoveMemberModal, setShowRemoveMemberModal] = useState(false);
  const [showDeleteMemberModal, setShowDeleteMemberModal] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null);
  const [availableUsers, setAvailableUsers] = useState<TeamMember[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [teamForm, setTeamForm] = useState({ name: '', description: '' });
  const [teamNameError, setTeamNameError] = useState('');
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [billingLoading, setBillingLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [monthlyPrice, setMonthlyPrice] = useState<number>(50); // Dynamic price from backend
  
  const { token, user } = useAuth();
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  
  // Check if current user is super admin, company admin, or admin
  const isSuperAdmin = user?.role === 'super_admin' || user?.role === 'Super Admin';
  const isCompanyAdmin = user?.role === 'company_admin' || user?.role === 'Company Admin';
  const isRegularAdmin = user?.role === 'Admin' || user?.role === 'admin';
  const isAdmin = isSuperAdmin || isCompanyAdmin || isRegularAdmin;
  
  // Default roles - Only 2 roles as per scope: Company Admin and Regular User
  // Super Admin is system-level and not assignable by Company Admins
  const defaultRoles = ['Company Admin', 'Regular User'];

  useEffect(() => {
    // Load custom roles from localStorage
    const savedRoles = localStorage.getItem('customRoles');
    if (savedRoles) {
      setCustomRoles(JSON.parse(savedRoles));
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'company') {
      // Fetch company details from backend
      fetchCompanyDetails();
    } else if (activeTab === 'team') {
      fetchTeams();
    } else if (activeTab === 'team_members') {
      fetchTeamMembers();
    } else if (activeTab === 'billing') {
      fetchBillingData();
    } else if (activeTab === 'integrations') {
      // Check all integrations from backend
      checkTwilioConnection();
      checkEmailIntegrations();
    }
  }, [activeTab]);

  useEffect(() => {
    if (selectedTeam) {
      fetchTeamMembersForTeam(selectedTeam.id);
    }
  }, [selectedTeam]);

  const fetchTeamMembers = async () => {
    try {
      // Use companyId from URL params (Super Admin managing specific company)
      if (!companyId) {
        toast.error('Company not found.');
        return;
      }
      
      const apiUrl = `${API_BASE_URL}/api/admin/companies/${companyId}/users`;
      
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        
        const mappedData = data.map((user: any) => ({
          id: user.id,
          first_name: user.first_name || '',
          last_name: user.last_name || '',
          name: `${user.first_name} ${user.last_name}`,
          email: user.email,
          role: user.user_role || user.role || 'User',
          user_role: user.user_role || user.role || 'User',
          status: user.status || (user.is_active ? 'active' : 'inactive'),
          joined_at: user.created_at?.split('T')[0] || 'N/A',
        }));
        
        setTeamMembers(mappedData);
      } else {
        // Handle error response
        const errorData = await response.json().catch(() => ({ detail: 'Failed to load team members' }));
        console.error('Failed to fetch team members:', errorData);
        toast.error(errorData.detail || 'Failed to load team members');
      }
    } catch (error: any) {
      console.error('Error fetching team members:', error);
      const errorMessage = error?.response?.data?.detail || error?.message || 'Failed to load team members';
      toast.error(errorMessage);
    }
  };

  const fetchCompanyDetails = async () => {
    try {
      // Use companyId from URL params (Super Admin managing specific company)
      if (!companyId) {
        console.error('No company_id found');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/companies/${companyId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const company = await response.json();
        setCompanyForm({
          name: company.name || '',
          email: company.email || '',
          phone: company.phone || '',
          address: company.address || '',
          city: company.city || '',
          state: company.state || '',
          zip: company.zip || '',
        });
      } else {
        console.error('Failed to fetch company details:', response.status);
      }
    } catch (error) {
      console.error('Error fetching company details:', error);
    }
  };

  const fetchBillingData = async () => {
    setBillingLoading(true);
    try {
      // Fetch current plan price
      const priceResponse = await apiClient.get('/billing/plans/current-price').catch(err => {
        console.error('Failed to fetch plan price:', err);
        return { data: { monthly_price: 50 } }; // Default fallback
      });
      setMonthlyPrice(priceResponse?.data?.monthly_price || 50);
      
      // Try to fetch subscription
      const subResponse = await apiClient.get('/billing/subscription').catch(err => {
        if (err.response?.status === 404) {
          // No subscription found - this is expected for new companies
          return null;
        }
        throw err;
      });
      
      // Try to fetch invoices
      const invoicesResponse = await apiClient.get('/billing/invoices').catch(err => {
        if (err.response?.status === 404) {
          // No invoices found - this is expected
          return { data: [] };
        }
        throw err;
      });
      
      setSubscription(subResponse?.data || null);
      setInvoices(invoicesResponse?.data || []);
    } catch (error: any) {
      console.error('Failed to load billing data:', error);
      const errorMessage = error?.response?.data?.detail || error?.message || 'Failed to load billing data';
      
      // Only show error toast for non-404 errors
      if (error.response?.status !== 404) {
        toast.error(errorMessage);
      }
      
      setSubscription(null);
      setInvoices([]);
    } finally {
      setBillingLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
      // Pass company_id_filter for Super Admin to get specific company's teams
      const response = await apiClient.get('/teams', {
        params: { company_id_filter: companyId }
      });
      setTeams(response.data);
      
      // If teams exist, select the first one by default
      if (response.data.length > 0 && !selectedTeam) {
        setSelectedTeam(response.data[0]);
      }
    } catch (error: any) {
      console.error('Failed to load teams:', error);
      if (error.response?.status !== 404) {
        toast.error('Failed to load teams');
      }
    }
  };

  const fetchTeamMembersForTeam = async (teamId: string) => {
    try {
      const response = await apiClient.get(`/teams/${teamId}/members`);
      setTeamMembers(response.data);
    } catch (error: any) {
      console.error('Failed to load team members:', error);
      const errorMessage = error?.response?.data?.detail || error?.message || 'Failed to load team members';
      toast.error(errorMessage);
    }
  };

  const fetchAvailableUsers = async () => {
    try {
      // For Super Admin managing specific company, use company-specific endpoint
      const response = await apiClient.get(`/admin/companies/${companyId}/users`);
      setAvailableUsers(response.data);
    } catch (error: any) {
      console.error('Failed to load available users:', error);
      toast.error('Failed to load available users');
    }
  };

  // Sanitize input to prevent script tags
  const sanitizeInput = (input: string): string => {
    // Remove script tags and other potentially dangerous HTML
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]*>/g, '') // Remove all HTML tags
      .trim();
  };

  // Validate team name
  const validateTeamName = (name: string): boolean => {
    const sanitized = sanitizeInput(name);
    
    // Check if input contains script tags or HTML FIRST
    if (name !== sanitized) {
      setTeamNameError('HTML tags and scripts are not allowed. Please enter plain text only.');
      return false;
    }
    
    if (!sanitized || !name.trim()) {
      setTeamNameError('Team name is required');
      return false;
    }
    
    if (sanitized.length < 2) {
      setTeamNameError('Team name must be at least 2 characters');
      return false;
    }
    
    // Check for duplicate team names (case-insensitive)
    const isDuplicate = teams.some(
      team => team.name.toLowerCase() === sanitized.toLowerCase()
    );
    
    if (isDuplicate) {
      setTeamNameError('A team with this name already exists');
      return false;
    }
    
    setTeamNameError('');
    return true;
  };

  const handleTeamNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTeamForm({ ...teamForm, name: value });
    
    // Clear error when user starts typing
    if (teamNameError) {
      setTeamNameError('');
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent multiple clicks
    if (isCreatingTeam) return;
    
    // Validate team name
    if (!validateTeamName(teamForm.name)) {
      return;
    }
    
    setIsCreatingTeam(true);
    
    try {
      // Sanitize inputs before sending
      const sanitizedData = {
        name: sanitizeInput(teamForm.name),
        description: sanitizeInput(teamForm.description)
      };
      
      const response = await apiClient.post('/teams', sanitizedData);
      toast.success('Team created successfully');
      setTeams([...teams, response.data]);
      setSelectedTeam(response.data);
      setShowCreateTeamModal(false);
      setTeamForm({ name: '', description: '' });
      setTeamNameError('');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to create team');
    } finally {
      setIsCreatingTeam(false);
    }
  };

  const openDeleteTeamModal = (team: Team) => {
    setTeamToDelete(team);
    setShowDeleteTeamModal(true);
  };

  const closeDeleteTeamModal = () => {
    setShowDeleteTeamModal(false);
    setTeamToDelete(null);
  };

  const confirmDeleteTeam = async () => {
    if (!teamToDelete) return;
    
    try {
      await apiClient.delete(`/teams/${teamToDelete.id}`);
      toast.success('Team deleted successfully');
      setTeams(teams.filter(team => team.id !== teamToDelete.id));
      setSelectedTeam(null);
      closeDeleteTeamModal();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to delete team');
      closeDeleteTeamModal();
    }
  };

  const handleAddMemberToTeam = async () => {
    if (!selectedTeam || !selectedUserId || isAddingMember) return;
    
    setIsAddingMember(true);
    
    try {
      await apiClient.post(`/teams/${selectedTeam.id}/members`, {
        user_id: selectedUserId
      });
      
      toast.success('Member added to team');
      fetchTeamMembersForTeam(selectedTeam.id);
      setShowAddMemberModal(false);
      setSelectedUserId('');
      setUserSearchTerm('');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to add member to team');
    } finally {
      setIsAddingMember(false);
    }
  };

  const openRemoveMemberModal = (member: TeamMember) => {
    setMemberToRemove(member);
    setShowRemoveMemberModal(true);
  };

  const closeRemoveMemberModal = () => {
    setShowRemoveMemberModal(false);
    setMemberToRemove(null);
  };

  const confirmRemoveMember = async () => {
    if (!selectedTeam || !memberToRemove) return;
    
    try {
      await apiClient.delete(`/teams/${selectedTeam.id}/members/${memberToRemove.id}`);
      toast.success('Member removed from team');
      fetchTeamMembersForTeam(selectedTeam.id);
      closeRemoveMemberModal();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to remove member from team');
      closeRemoveMemberModal();
    }
  };

  const handleSetTeamLead = async (userId: string) => {
    if (!selectedTeam) return;
    
    try {
      await apiClient.post(`/teams/${selectedTeam.id}/lead/${userId}`, {});
      toast.success('Team lead set successfully');
      
      // Update the selected team with the new team lead
      setSelectedTeam({
        ...selectedTeam,
        team_lead_id: userId
      });
      
      // Refresh team members to update roles
      fetchTeamMembersForTeam(selectedTeam.id);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to set team lead');
    }
  };

  const handleUpdatePayment = () => {
    // Redirect to Square payment form
    toast('Redirecting to payment processor...');
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

  const checkTwilioConnection = async () => {
    try {
      const data = await twilioService.getTwilioSettings();
      
      if (data && data.account_sid) {
        setTwilioDetails(data);
        setIntegrations(integrations.map(i =>
          i.name === 'Twilio' ? { ...i, status: 'connected' } : i
        ));
        // Fetch phone numbers
        fetchPhoneNumbers();
      } else {
        // No settings configured
        setTwilioDetails(null);
        setPhoneNumbers([]);
        setIntegrations(integrations.map(i =>
          i.name === 'Twilio' ? { ...i, status: 'disconnected' } : i
        ));
      }
    } catch (error) {
      // No settings found or error, set as disconnected
      setTwilioDetails(null);
      setPhoneNumbers([]);
      setIntegrations(integrations.map(i =>
        i.name === 'Twilio' ? { ...i, status: 'disconnected' } : i
      ));
    }
  };

  const checkEmailIntegrations = async () => {
    try {
      const data = await emailService.getEmailSettings();
      
      // Update SendGrid status
      if (data.sendgrid_enabled && data.sendgrid_from_email) {
        setSendGridDetails({
          fromEmail: data.sendgrid_from_email,
          fromName: data.sendgrid_from_name,
        });
        setIntegrations(prev => prev.map(i =>
          i.name === 'SendGrid' ? { ...i, status: 'connected' } : i
        ));
      } else {
        setSendGridDetails(null);
        setIntegrations(prev => prev.map(i =>
          i.name === 'SendGrid' ? { ...i, status: 'disconnected' } : i
        ));
      }
      
      // Update Gmail status
      if (data.gmail_enabled && data.gmail_email) {
        setGmailDetails({
          email: data.gmail_email,
          syncEnabled: data.gmail_sync_enabled,
          syncFrequency: data.gmail_sync_frequency,
        });
        setIntegrations(prev => prev.map(i =>
          i.name === 'Gmail' ? { ...i, status: 'connected' } : i
        ));
      } else {
        setGmailDetails(null);
        setIntegrations(prev => prev.map(i =>
          i.name === 'Gmail' ? { ...i, status: 'disconnected' } : i
        ));
      }
    } catch (error) {
      // No settings found or error, set as disconnected
      setSendGridDetails(null);
      setGmailDetails(null);
      setIntegrations(prev => prev.map(i =>
        (i.name === 'SendGrid' || i.name === 'Gmail') ? { ...i, status: 'disconnected' } : i
      ));
    }
  };
  
  const fetchPhoneNumbers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/sms/phone-numbers`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setPhoneNumbers(data);
      }
    } catch (error) {
      console.error('Error fetching phone numbers:', error);
    }
  };
  
  const handleSyncPhoneNumbers = async () => {
    try {
      toast.loading('Syncing phone numbers...');
      const response = await fetch(`${API_BASE_URL}/api/twilio/sync/phone-numbers`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        toast.dismiss();
        toast.success(`Synced ${data.added || 0} new numbers`);
        fetchPhoneNumbers();
      } else {
        toast.dismiss();
        toast.error('Failed to sync phone numbers');
      }
    } catch (error) {
      toast.dismiss();
      console.error('Error syncing phone numbers:', error);
      toast.error('Failed to sync phone numbers');
    }
  };

  const [integrations, setIntegrations] = useState<Integration[]>([
    { id: '1', name: 'Twilio', description: 'SMS, Voice calls, and messaging', status: 'disconnected', icon: '📱' },
    { id: '2', name: 'SendGrid', description: 'Bulk email campaigns and transactional emails', status: 'disconnected', icon: '📧' },
    { id: '3', name: 'Gmail', description: 'Send and receive emails via Gmail', status: 'disconnected', icon: '📬' },
  ]);
  
  const [twilioDetails, setTwilioDetails] = useState<any>(null);
  const [phoneNumbers, setPhoneNumbers] = useState<any[]>([]);
  
  const [showTwilioModal, setShowTwilioModal] = useState(false);
  const [isSavingTwilio, setIsSavingTwilio] = useState(false);
  const [twilioForm, setTwilioForm] = useState({
    accountSid: '',
    authToken: ''
  });
  
  // SendGrid state
  const [showSendGridModal, setShowSendGridModal] = useState(false);
  const [isSavingSendGrid, setIsSavingSendGrid] = useState(false);
  const [sendGridForm, setSendGridForm] = useState({
    apiKey: '',
    fromEmail: '',
    fromName: ''
  });
  const [sendGridDetails, setSendGridDetails] = useState<any>(null);
  
  // Gmail state
  const [showGmailModal, setShowGmailModal] = useState(false);
  const [gmailDetails, setGmailDetails] = useState<any>(null);
  
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const [teamMemberForm, setTeamMemberForm] = useState({ first_name: '', last_name: '', email: '', role: 'Regular User' });
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

  const [billingForm, setBillingForm] = useState(() => {
    const saved = localStorage.getItem('billingSettings');
    if (saved) {
      return JSON.parse(saved);
    }
    return {
      plan: 'Professional',
      billingCycle: 'monthly',
      cardNumber: '',
      cardExpiry: '',
      cardCVC: '',
      cardholderName: '',
    };
  });

  const [showUpdatePaymentModal, setShowUpdatePaymentModal] = useState(false);

  // Calculate next billing date (30 days from now)
  const getNextBillingDate = () => {
    const saved = localStorage.getItem('billingSettings');
    if (saved) {
      const billing = JSON.parse(saved);
      if (billing.nextBillingDate) {
        return new Date(billing.nextBillingDate).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
      }
    }
    // Default: 30 days from now
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 30);
    return nextDate.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const handleAddCustomRole = () => {
    if (!newRoleName.trim()) {
      toast.error('Please enter a role name');
      return;
    }
    
    const allRoles = [...defaultRoles, ...customRoles];
    if (allRoles.includes(newRoleName.trim())) {
      toast.error('This role already exists');
      return;
    }
    
    const updatedRoles = [...customRoles, newRoleName.trim()];
    setCustomRoles(updatedRoles);
    localStorage.setItem('customRoles', JSON.stringify(updatedRoles));
    toast.success(`Role "${newRoleName.trim()}" added successfully`);
    setNewRoleName('');
    setShowAddRoleModal(false);
  };

  const handleDeleteCustomRole = (roleToDelete: string) => {
    if (!confirm(`Delete custom role "${roleToDelete}"? Users with this role will keep it, but it won't be available for new assignments.`)) {
      return;
    }
    const updatedRoles = customRoles.filter(role => role !== roleToDelete);
    setCustomRoles(updatedRoles);
    localStorage.setItem('customRoles', JSON.stringify(updatedRoles));
    toast.success(`Role "${roleToDelete}" deleted successfully`);
  };

  const tabs = [
    { id: 'company' as TabType, name: 'Company', icon: BuildingOfficeIcon },
    { id: 'team' as TabType, name: 'Teams', icon: UserGroupIcon },
    { id: 'team_members' as TabType, name: 'Team Members', icon: UserIcon },
    { id: 'security' as TabType, name: 'Security', icon: ShieldCheckIcon },
    { id: 'integrations' as TabType, name: 'Integrations', icon: PuzzlePieceIcon },
    { id: 'custom_fields' as TabType, name: 'Custom Fields', icon: AdjustmentsHorizontalIcon },
  ];

  const handleAddTeamMember = async () => {
    // Validate inputs
    if (!teamMemberForm.first_name.trim()) {
      toast.error('Please enter a first name for the team member.');
      return;
    }
    if (!teamMemberForm.last_name.trim()) {
      toast.error('Please enter a last name for the team member.');
      return;
    }
    if (!teamMemberForm.email.trim()) {
      toast.error('Please enter an email address.');
      return;
    }
    if (!teamMemberForm.role) {
      toast.error('Please select a role for the team member.');
      return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(teamMemberForm.email)) {
      toast.error('Please enter a valid email address.');
      return;
    }
    
    // Check for HTML tags or script tags
    if (/<[^>]+>/gi.test(teamMemberForm.first_name) || /<[^>]+>/gi.test(teamMemberForm.last_name)) {
      toast.error('HTML tags and scripts are not allowed. Please enter plain text only.');
      return;
    }
    
    // Validate name length
    if (teamMemberForm.first_name.length > 50 || teamMemberForm.last_name.length > 50) {
      toast.error('Names are too long. Maximum 50 characters each.');
      return;
    }
    
    // Validate name contains only letters, spaces, hyphens, and apostrophes
    if (!/^[a-zA-Z\s\-']+$/.test(teamMemberForm.first_name) || !/^[a-zA-Z\s\-']+$/.test(teamMemberForm.last_name)) {
      toast.error('Names can only contain letters, spaces, hyphens, and apostrophes.');
      return;
    }
    
    // CRITICAL: Prevent Company Admin from inviting new Company Admins
    // Only Super Admin can assign Company Admin role
    const inviteRole = teamMemberForm.role.toLowerCase();
    const isInvitingCompanyAdmin = inviteRole === 'company_admin' || inviteRole === 'company admin';
    
    if (!isSuperAdmin && isInvitingCompanyAdmin) {
      toast.error('Only Super Admin can invite Company Admins');
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/team/members`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: teamMemberForm.email.toLowerCase(),
          first_name: teamMemberForm.first_name.trim(),
          last_name: teamMemberForm.last_name.trim(),
          role: teamMemberForm.role,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        toast.success(data.message || `Team member added successfully! Default password: ${data.default_password}`);
        setShowAddTeamModal(false);
        setTeamMemberForm({ first_name: '', last_name: '', email: '', role: 'Regular User' });
        setRoleSearchTerm('');
        // Refresh team members list
        setTimeout(() => {
          fetchTeamMembers();
        }, 500);
      } else {
        try {
          const errorData = await response.json();
          const errorMessage = typeof errorData.detail === 'string' 
            ? errorData.detail 
            : 'Failed to add team member. Please try again.';
          
          // Display the backend's user-friendly error message
          toast.error(errorMessage);
        } catch (parseError) {
          toast.error('Failed to add team member. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error adding team member:', error);
      toast.error('Failed to add team member. Please check your connection and try again.');
    }
  };

  const handleOpenAddModal = () => {
    setTeamMemberForm({ first_name: '', last_name: '', email: '', role: 'Regular User' });
    setRoleSearchTerm('');
    setShowAddTeamModal(true);
  };

  const handleEditTeamMember = (member: TeamMember) => {
    setSelectedMember(member);
    setTeamMemberForm({ 
      first_name: member.first_name || '', 
      last_name: member.last_name || '',
      email: member.email, 
      role: member.role || member.user_role || 'Regular User' 
    });
    setRoleSearchTerm('');
    setShowEditTeamModal(true);
  };

  const handleSaveCompanySettings = async () => {
    // Validate company name
    if (!companyForm.name.trim()) {
      toast.error('Company name is required');
      return;
    }
    if (companyForm.name.length > 255) {
      toast.error('Company name cannot exceed 255 characters');
      return;
    }

    // Validate email if provided
    if (companyForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(companyForm.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    // Validate phone if provided
    if (companyForm.phone && !/^\+?[\d\s\-()]+$/.test(companyForm.phone)) {
      toast.error('Please enter a valid phone number');
      return;
    }

    // Validate ZIP code if provided
    if (companyForm.zip && !/^[\d\-\s]+$/.test(companyForm.zip)) {
      toast.error('Please enter a valid ZIP code');
      return;
    }

    // Check field lengths
    if (companyForm.email.length > 255) {
      toast.error('Email cannot exceed 255 characters');
      return;
    }
    if (companyForm.phone.length > 50) {
      toast.error('Phone number cannot exceed 50 characters');
      return;
    }
    if (companyForm.address.length > 255) {
      toast.error('Address cannot exceed 255 characters');
      return;
    }
    if (companyForm.city.length > 100) {
      toast.error('City cannot exceed 100 characters');
      return;
    }
    if (companyForm.state.length > 100) {
      toast.error('State cannot exceed 100 characters');
      return;
    }
    if (companyForm.zip.length > 20) {
      toast.error('ZIP code cannot exceed 20 characters');
      return;
    }

    // Save to backend
    try {
      // Fetch current user to get company_id
      const userResponse = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!userResponse.ok) {
        toast.error('Failed to get user info');
        return;
      }

      const userData = await userResponse.json();
      const companyId = userData.company_id;

      if (!companyId) {
        toast.error('No company found for user');
        return;
      }

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
        // Refresh company details to confirm save
        await fetchCompanyDetails();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to save company settings');
        console.error('Save error:', error);
      }
    } catch (error) {
      console.error('Error saving company settings:', error);
      toast.error('Failed to save company settings');
    }
  };

  const handleUpdateTeamMember = async () => {
    if (!selectedMember) return;
    
    // Validate inputs
    if (!teamMemberForm.first_name.trim()) {
      toast.error('Please enter a first name');
      return;
    }
    if (!teamMemberForm.last_name.trim()) {
      toast.error('Please enter a last name');
      return;
    }
    if (!teamMemberForm.email.trim()) {
      toast.error('Please enter an email address');
      return;
    }
    if (teamMemberForm.first_name.length > 50 || teamMemberForm.last_name.length > 50) {
      toast.error('Names cannot exceed 50 characters each');
      return;
    }
    
    // Check for any HTML tags or script tags
    if (/<[^>]+>/gi.test(teamMemberForm.first_name) || /<[^>]+>/gi.test(teamMemberForm.last_name)) {
      toast.error('HTML tags and scripts are not allowed. Please enter plain text only.');
      return;
    }
    
    // CRITICAL: Prevent Company Admin from changing Company Admin roles (including their own)
    // Only Super Admin can change Company Admin roles
    const originalRole = (selectedMember.role || selectedMember.user_role || '').toLowerCase();
    const newRole = teamMemberForm.role.toLowerCase();
    const isTargetCompanyAdmin = originalRole === 'company_admin' || originalRole === 'company admin';
    const isChangingToCompanyAdmin = newRole === 'company_admin' || newRole === 'company admin';
    
    if (!isSuperAdmin) {
      // Company Admin cannot change any Company Admin's role (including their own)
      if (isTargetCompanyAdmin && originalRole !== newRole) {
        toast.error('Only Super Admin can change Company Admin roles');
        return;
      }
      // Company Admin cannot promote anyone to Company Admin
      if (isChangingToCompanyAdmin && !isTargetCompanyAdmin) {
        toast.error('Only Super Admin can assign Company Admin role');
        return;
      }
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/${selectedMember.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: teamMemberForm.first_name.trim(),
          last_name: teamMemberForm.last_name.trim(),
          email: teamMemberForm.email,
          role: teamMemberForm.role,
        }),
      });
      
      if (response.ok) {
        toast.success('Team member updated successfully');
        setShowEditTeamModal(false);
        setRoleSearchTerm('');  // Clear search term
        fetchTeamMembers();
      } else {
        try {
          const errorData = await response.json();
          if (errorData.detail?.includes('already') || errorData.detail?.includes('in use')) {
            toast.error(`Email '${teamMemberForm.email}' is already in use by another user`);
          } else {
            toast.error(errorData.detail || 'Failed to update team member');
          }
        } catch (parseError) {
          // If response is not JSON (500 error with HTML)
          toast.error('Failed to update team member. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error updating team member:', error);
      toast.error('Failed to update team member. Please check your connection and try again.');
    }
  };

  const openDeleteTeamMemberModal = (member: TeamMember) => {
    setMemberToRemove(member);
    setShowDeleteMemberModal(true);
  };

  const handleDeleteTeamMember = async () => {
    if (!memberToRemove) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/${memberToRemove.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        setTeamMembers(teamMembers.filter(m => m.id !== memberToRemove.id));
        toast.success('Team member deleted permanently');
        setShowDeleteMemberModal(false);
        setMemberToRemove(null);
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to delete team member');
      }
    } catch (error) {
      console.error('Error deleting team member:', error);
      toast.error('Failed to delete team member');
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
      handleDisconnectTwilio();
      return;
    }
    
    // SendGrid handling
    if (integration.name === 'SendGrid' && integration.status === 'disconnected') {
      setShowSendGridModal(true);
      return;
    }
    
    if (integration.name === 'SendGrid' && integration.status === 'connected') {
      handleDisconnectSendGrid();
      return;
    }
    
    // Gmail handling
    if (integration.name === 'Gmail' && integration.status === 'disconnected') {
      handleConnectGmail();
      return;
    }
    
    if (integration.name === 'Gmail' && integration.status === 'connected') {
      handleDisconnectGmail();
      return;
    }
  };
  
  const handleDisconnectTwilio = async () => {
    if (!confirm('Are you sure you want to disconnect Twilio? This will remove all settings.')) {
      return;
    }

    try {
      await twilioService.deleteTwilioSettings();
      
      setIntegrations(integrations.map(i =>
        i.name === 'Twilio' ? { ...i, status: 'disconnected' } : i
      ));
      setTwilioDetails(null);
      setPhoneNumbers([]);
      toast.success('Twilio disconnected successfully');
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Failed to disconnect Twilio';
      toast.error(errorMessage);
    }
  };

  const handleSaveTwilio = async () => {
    // Prevent multiple submissions
    if (isSavingTwilio) return;
    
    if (!twilioForm.accountSid || !twilioForm.authToken) {
      toast.error('Please fill in all Twilio credentials');
      return;
    }

    // Validate Account SID format (starts with AC and 34 chars, alphanumeric)
    if (!twilioForm.accountSid.startsWith('AC') || twilioForm.accountSid.length !== 34) {
      toast.error('Invalid Twilio Account SID format (should start with AC and be 34 characters)');
      return;
    }

    if (!/^AC[a-zA-Z0-9]{32}$/.test(twilioForm.accountSid)) {
      toast.error('Twilio Account SID should only contain letters and numbers');
      return;
    }

    // Validate Auth Token (32 characters, alphanumeric)
    if (twilioForm.authToken.length !== 32) {
      toast.error('Invalid Twilio Auth Token format (should be 32 characters)');
      return;
    }

    if (!/^[a-zA-Z0-9]{32}$/.test(twilioForm.authToken)) {
      toast.error('Twilio Auth Token should only contain letters and numbers');
      return;
    }

    setIsSavingTwilio(true);
    
    try {
      const settings = {
        account_sid: twilioForm.accountSid,
        auth_token: twilioForm.authToken
      };
      
      // Try to create first
      try {
        await twilioService.createTwilioSettings(settings);
      } catch (error: any) {
        // If settings already exist, try to update
        if (error.response?.status === 400 && error.response?.data?.detail?.includes('already exist')) {
          await twilioService.updateTwilioSettings(settings);
        } else {
          // Re-throw other errors (like invalid credentials)
          throw error;
        }
      }
      
      setShowTwilioModal(false);
      toast.success('Twilio connected successfully!');
      
      // Sync phone numbers
      const syncToast = toast.loading('Syncing phone numbers...');
      try {
        await twilioService.syncPhoneNumbers();
        toast.success('Phone numbers synced!', { id: syncToast });
      } catch (error) {
        toast.dismiss(syncToast);
        // Don't show error for sync failure, connection is already successful
      }
      
      // Refresh Twilio connection status and details
      await checkTwilioConnection();
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Failed to connect Twilio';
      toast.error(errorMessage);
    } finally {
      setIsSavingTwilio(false);
    }
  };

  // SendGrid handlers
  const handleSaveSendGrid = async () => {
    if (isSavingSendGrid) return;
    
    if (!sendGridForm.apiKey || !sendGridForm.fromEmail || !sendGridForm.fromName) {
      toast.error('Please fill in all SendGrid fields');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sendGridForm.fromEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsSavingSendGrid(true);
    
    try {
      await emailService.saveSendGridSettings({
        apiKey: sendGridForm.apiKey,
        fromEmail: sendGridForm.fromEmail,
        fromName: sendGridForm.fromName,
      });
      
      setShowSendGridModal(false);
      toast.success('SendGrid connected successfully!');
      
      // Refresh email integrations
      await checkEmailIntegrations();
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Failed to connect SendGrid';
      toast.error(errorMessage);
    } finally {
      setIsSavingSendGrid(false);
    }
  };

  const handleDisconnectSendGrid = async () => {
    if (!confirm('Are you sure you want to disconnect SendGrid? This will remove all settings.')) {
      return;
    }

    try {
      await emailService.deleteSendGridSettings();
      
      setIntegrations(prev => prev.map(i =>
        i.name === 'SendGrid' ? { ...i, status: 'disconnected' } : i
      ));
      setSendGridDetails(null);
      setSendGridForm({ apiKey: '', fromEmail: '', fromName: '' });
      toast.success('SendGrid disconnected successfully');
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Failed to disconnect SendGrid';
      toast.error(errorMessage);
    }
  };

  // Gmail handlers
  const handleConnectGmail = async () => {
    try {
      const data = await emailService.getGmailAuthUrl();
      
      if (data.auth_url) {
        // Open OAuth popup
        window.open(data.auth_url, 'Gmail OAuth', 'width=600,height=700');
        toast.success('Opening Gmail authorization window...');
        
        // Listen for OAuth callback
        window.addEventListener('message', handleGmailCallback);
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Failed to initiate Gmail connection';
      toast.error(errorMessage);
    }
  };

  const handleGmailCallback = async (event: MessageEvent) => {
    if (event.data.type === 'gmail-oauth-success') {
      window.removeEventListener('message', handleGmailCallback);
      toast.success('Gmail connected successfully!');
      await checkEmailIntegrations();
    }
  };

  const handleDisconnectGmail = async () => {
    if (!confirm('Are you sure you want to disconnect Gmail? This will remove all settings and stop email sync.')) {
      return;
    }

    try {
      await emailService.disconnectGmail();
      
      setIntegrations(prev => prev.map(i =>
        i.name === 'Gmail' ? { ...i, status: 'disconnected' } : i
      ));
      setGmailDetails(null);
      toast.success('Gmail disconnected successfully');
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Failed to disconnect Gmail';
      toast.error(errorMessage);
    }
  };

  const handleChangePassword = async () => {
    if (!securityForm.currentPassword || !securityForm.newPassword || !securityForm.confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }

    // Check if current and new password are the same
    if (securityForm.currentPassword === securityForm.newPassword) {
      toast.error('New password must be different from current password');
      return;
    }

    if (securityForm.newPassword !== securityForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    // Comprehensive password validation
    if (securityForm.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }
    if (securityForm.newPassword.length > 128) {
      toast.error('Password cannot exceed 128 characters');
      return;
    }
    if (!/[A-Z]/.test(securityForm.newPassword)) {
      toast.error('Password must contain at least one uppercase letter');
      return;
    }
    if (!/[a-z]/.test(securityForm.newPassword)) {
      toast.error('Password must contain at least one lowercase letter');
      return;
    }
    if (!/[0-9]/.test(securityForm.newPassword)) {
      toast.error('Password must contain at least one number');
      return;
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(securityForm.newPassword)) {
      toast.error('Password must contain at least one special character');
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
        <div className="px-4 sm:px-6 lg:max-w-7xl xl:max-w-8xl 2xl:max-w-9xl 3xl:max-w-10xl lg:mx-auto lg:px-8">
          <div className="py-6">
            <button
              onClick={() => navigate(`/admin/companies/${companyId}/manage`)}
              className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5 mr-2" />
              Back to Company Management
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Company Settings</h1>
            <p className="mt-1 text-sm text-gray-500">
              Managing settings for {companyForm.name || 'this company'}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:max-w-7xl xl:max-w-8xl 2xl:max-w-9xl 3xl:max-w-10xl lg:mx-auto lg:px-8 py-8">
        <div className="border-b border-gray-200 mb-6 overflow-x-auto scrollbar-hide">
          <nav className="-mb-px flex space-x-3 sm:space-x-8 min-w-max">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => changeTab(tab.id)}
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
              {!isAdmin && (
                <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                  View Only
                </span>
              )}
            </div>
            {!isAdmin && (
              <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  💡 Only Company Admins can edit company settings. Contact your administrator to make changes.
                </p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={companyForm.name}
                  onChange={(e) => setCompanyForm({...companyForm, name: e.target.value})}
                  maxLength={255}
                  disabled={!isAdmin}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  required
                />
                <div className="text-xs text-gray-500 mt-1">
                  {companyForm.name.length}/255 characters
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={companyForm.email}
                  onChange={(e) => setCompanyForm({...companyForm, email: e.target.value})}
                  maxLength={255}
                  disabled={!isAdmin}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                <div className="text-xs text-gray-500 mt-1">
                  {companyForm.email.length}/255 characters
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input
                  type="tel"
                  placeholder="+1234567890"
                  value={companyForm.phone}
                  onChange={(e) => {
                    // Only allow numbers, +, -, (, ), and spaces
                    const value = e.target.value.replace(/[^0-9+\-() ]/g, '');
                    setCompanyForm({...companyForm, phone: value});
                  }}
                  pattern="[+]?[0-9\-() ]+"
                  maxLength={50}
                  disabled={!isAdmin}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                <div className="text-xs text-gray-500 mt-1">
                  {companyForm.phone.length}/50 characters
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                <input
                  type="text"
                  value={companyForm.address}
                  onChange={(e) => setCompanyForm({...companyForm, address: e.target.value})}
                  maxLength={255}
                  disabled={!isAdmin}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                <div className="text-xs text-gray-500 mt-1">
                  {companyForm.address.length}/255 characters
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                <input
                  type="text"
                  value={companyForm.city}
                  onChange={(e) => {
                    // Only allow letters, spaces, hyphens, and apostrophes
                    const value = e.target.value.replace(/[^a-zA-Z\s\-']/g, '');
                    setCompanyForm({...companyForm, city: value});
                  }}
                  maxLength={100}
                  disabled={!isAdmin}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="Enter city name (letters only)"
                />
                <div className="text-xs text-gray-500 mt-1">
                  {companyForm.city.length}/100 characters
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                <input
                  type="text"
                  value={companyForm.state}
                  onChange={(e) => {
                    // Only allow letters, spaces, hyphens, and apostrophes
                    const value = e.target.value.replace(/[^a-zA-Z\s\-']/g, '');
                    setCompanyForm({...companyForm, state: value});
                  }}
                  maxLength={100}
                  disabled={!isAdmin}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="Enter state name (letters only)"
                />
                <div className="text-xs text-gray-500 mt-1">
                  {companyForm.state.length}/100 characters
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ZIP Code</label>
                <input
                  type="text"
                  value={companyForm.zip}
                  onChange={(e) => {
                    // Only allow numbers, hyphens, and spaces
                    const value = e.target.value.replace(/[^0-9\-\s]/g, '');
                    setCompanyForm({...companyForm, zip: value});
                  }}
                  maxLength={20}
                  disabled={!isAdmin}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="Enter ZIP code (numbers only)"
                />
                <div className="text-xs text-gray-500 mt-1">
                  {companyForm.zip.length}/20 characters
                </div>
              </div>
            </div>
            {isAdmin && (
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleSaveCompanySettings}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
                >
                  Save Changes
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'team' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Teams</h2>
                <p className="text-gray-600 mt-1">Manage your teams and team members</p>
              </div>
              {(isCompanyAdmin || isSuperAdmin) && (
                <button
                  onClick={() => setShowCreateTeamModal(true)}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <PlusCircleIcon className="w-5 h-5" />
                  Create Team
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Teams List */}
              <div className="lg:col-span-1 bg-white rounded-lg shadow overflow-hidden">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-800">Teams</h3>
                </div>
                <div className="divide-y divide-gray-200">
                  {teams.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      <UserGroupIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                      <p>No teams yet</p>
                      {(isCompanyAdmin || isSuperAdmin) && (
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
                  </div>
                ) : (
                  <>
                    <div className="p-6 border-b border-gray-200">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">{selectedTeam.name}</h3>
                          {selectedTeam.description && (
                            <p className="text-gray-600 mt-1">{selectedTeam.description}</p>
                          )}
                        </div>
                        {(isCompanyAdmin || isSuperAdmin) && (
                          <button
                            onClick={() => openDeleteTeamModal(selectedTeam)}
                            className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                            title="Delete team"
                          >
                            <TrashIcon className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Team Members */}
                    <div className="p-6">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="text-lg font-semibold text-gray-900">Team Members</h4>
                        {(isCompanyAdmin || isSuperAdmin) && (
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
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Member</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                              {(isCompanyAdmin || isSuperAdmin) && (
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                              )}
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {teamMembers.length === 0 ? (
                              <tr>
                                <td colSpan={(isCompanyAdmin || isSuperAdmin) ? 4 : 3} className="px-6 py-12 text-center text-gray-500">
                                  <UserIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                                  <p>No team members yet</p>
                                </td>
                              </tr>
                            ) : (
                              teamMembers.map((member) => (
                                <tr key={member.id} className="hover:bg-gray-50">
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                      <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                                        <span className="text-blue-600 font-semibold">
                                          {member.first_name?.[0]}{member.last_name?.[0]}
                                        </span>
                                      </div>
                                      <div className="ml-4">
                                        <div className="text-sm font-medium text-gray-900">
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
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{member.email}</td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                                      {member.user_role || member.role}
                                    </span>
                                  </td>
                                  {(isCompanyAdmin || isSuperAdmin) && (
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
                                          onClick={() => openRemoveMemberModal(member)}
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
          </div>
        )}

        {activeTab === 'team_members' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Team Members</h2>
              {(isCompanyAdmin || isSuperAdmin) && (
                <button
                  onClick={handleOpenAddModal}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                >
                  <UserPlusIcon className="w-5 h-5" />
                  Invite Team Member
                </button>
              )}
            </div>

            <div className="bg-white shadow rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    {(isCompanyAdmin || isSuperAdmin) && (
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {teamMembers.map((member) => (
                    <tr key={member.id}>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {member.name || `${member.first_name} ${member.last_name}`}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{member.email}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{member.role || member.user_role}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          member.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {member.status}
                        </span>
                      </td>
                      {(isCompanyAdmin || isSuperAdmin) && (
                        <td className="px-6 py-4 text-right">
                          <ActionButtons
                            onEdit={() => handleEditTeamMember(member)}
                            onDelete={() => openDeleteTeamMemberModal(member)}
                            showView={false}
                          />
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
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
                    <div className="text-xs text-gray-500 mt-1">
                      Must be 8-128 characters with uppercase, lowercase, number, and special character
                    </div>
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
          <div className="space-y-6">
            {billingLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : !subscription ? (
              isCompanyAdmin && !isSuperAdmin ? (
                <div>
                  {/* Header */}
                  <div className="mb-8 text-center">
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">Upgrade to Sunstone CRM</h2>
                    <p className="text-gray-600">Continue using all features without interruption</p>
                  </div>

                  {/* Single Pricing Plan */}
                  <div className="max-w-2xl mx-auto mb-8">
                    <div className="bg-white rounded-xl shadow-2xl border-2 border-blue-600 p-8 relative">
                      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                        <span className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-2 rounded-full text-sm font-semibold shadow-lg">
                          Complete CRM Solution
                        </span>
                      </div>
                      
                      <div className="text-center mb-8 mt-4">
                        <h3 className="text-2xl font-bold text-gray-900 mb-4">All-Inclusive Plan</h3>
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <span className="text-5xl font-bold text-blue-600">${monthlyPrice}</span>
                          <div className="text-left">
                            <div className="text-lg text-gray-600 font-medium">/month</div>
                          </div>
                        </div>
                        <p className="text-gray-600 mt-2">Unlimited users • Billed monthly • Cancel anytime</p>
                      </div>

                      <div className="mb-8">
                        <h4 className="font-semibold text-gray-900 mb-4 text-center">Everything Included:</h4>
                        <div className="grid md:grid-cols-2 gap-4">
                          <ul className="space-y-3">
                            <li className="flex items-center gap-3">
                              <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
                              <span className="text-gray-700">Unlimited users</span>
                            </li>
                            <li className="flex items-center gap-3">
                              <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
                              <span className="text-gray-700">Complete CRM features</span>
                            </li>
                            <li className="flex items-center gap-3">
                              <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
                              <span className="text-gray-700">Sales pipeline management</span>
                            </li>
                            <li className="flex items-center gap-3">
                              <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
                              <span className="text-gray-700">Contact & lead management</span>
                            </li>
                            <li className="flex items-center gap-3">
                              <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
                              <span className="text-gray-700">Email integration</span>
                            </li>
                            <li className="flex items-center gap-3">
                              <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
                              <span className="text-gray-700">Phone system integration</span>
                            </li>
                          </ul>
                          <ul className="space-y-3">
                            <li className="flex items-center gap-3">
                              <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
                              <span className="text-gray-700">SMS messaging</span>
                            </li>
                            <li className="flex items-center gap-3">
                              <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
                              <span className="text-gray-700">Document management</span>
                            </li>
                            <li className="flex items-center gap-3">
                              <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
                              <span className="text-gray-700">Advanced analytics</span>
                            </li>
                            <li className="flex items-center gap-3">
                              <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
                              <span className="text-gray-700">Workflow automation</span>
                            </li>
                            <li className="flex items-center gap-3">
                              <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
                              <span className="text-gray-700">Priority support</span>
                            </li>
                            <li className="flex items-center gap-3">
                              <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
                              <span className="text-gray-700">Unlimited storage</span>
                            </li>
                          </ul>
                        </div>
                      </div>

                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                        <div className="flex items-start gap-3">
                          <ClockIcon className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-semibold text-blue-900">Monthly Subscription</p>
                            <p className="text-sm text-blue-700">
                              Your subscription starts immediately upon payment. You'll be billed ${monthlyPrice} every 30 days for unlimited access. Cancel anytime.
                            </p>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => setShowPaymentModal(true)}
                        className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg text-lg"
                      >
                        Subscribe Now & Add Payment Method
                      </button>
                      
                      <p className="text-center text-sm text-gray-500 mt-4">
                        Secure payment powered by Square
                      </p>
                    </div>
                  </div>

                  {/* Payment Modal */}
                  {showPaymentModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Add Payment Method</h3>
                        <p className="text-sm text-gray-500 mb-4">Secure payment powered by Square</p>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
                          <p className="text-sm text-blue-800">
                            <strong>Your subscription starts immediately.</strong> You'll be charged ${monthlyPrice} per month for unlimited users and full access. Your first billing cycle starts today.
                          </p>
                        </div>
                        
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
                            onClick={async () => {
                              try {
                                // TODO: Integrate with Square payment gateway
                                // For now, show message that Square needs to be configured
                                toast.error('Payment processing is not yet configured. Please contact support to set up Square payment gateway.');
                                setShowPaymentModal(false);
                              } catch (error: any) {
                                toast.error(error?.response?.data?.detail || 'Failed to process payment');
                              }
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
              ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">Billing Management</h3>
                  <p className="text-blue-800 mb-4">
                    {isSuperAdmin
                      ? 'As a Super Admin, please use the Admin Billing page to manage all subscriptions.'
                      : 'No active subscription found. Please contact your administrator to set up billing.'}
                  </p>
                  {isSuperAdmin && (
                    <button
                      onClick={() => window.location.href = '/admin/billing'}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Go to Admin Billing
                    </button>
                  )}
                </div>
              )
            ) : (
              <>
                {/* Subscription Overview */}
                <div className="bg-white shadow rounded-lg p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">Subscription Overview</h2>
                    <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusBadge(subscription.status)}`}>
                      {subscription.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex items-start space-x-3">
                      <BanknotesIcon className="w-6 h-6 text-blue-600 mt-1" />
                      <div>
                        <p className="text-sm text-gray-600">Plan</p>
                        <p className="text-lg font-semibold text-gray-900">{subscription.plan_name}</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <CheckCircleIcon className="w-6 h-6 text-green-600 mt-1" />
                      <div>
                        <p className="text-sm text-gray-600">Users</p>
                        <p className="text-lg font-semibold text-gray-900">{subscription.user_count}</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <ClockIcon className="w-6 h-6 text-purple-600 mt-1" />
                      <div>
                        <p className="text-sm text-gray-600">Billing Cycle</p>
                        <p className="text-lg font-semibold text-gray-900 capitalize">{subscription.billing_cycle}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-gray-600">Total Amount</p>
                        <p className="text-2xl font-bold text-gray-900">${subscription.total_amount.toFixed(2)}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          ${subscription.monthly_price.toFixed(2)} × {subscription.user_count} users
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Next Billing Date</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {new Date(subscription.current_period_end).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {subscription.trial_ends_at && (
                    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        <strong>Trial Period:</strong> Your trial ends on{' '}
                        {new Date(subscription.trial_ends_at).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>

                {/* Payment Method */}
                <div className="bg-white shadow rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Method</h3>
                  {subscription.card_last_4 ? (
                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <CreditCardIcon className="w-8 h-8 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {subscription.card_brand} •••• {subscription.card_last_4}
                          </p>
                          <p className="text-sm text-gray-600">Primary payment method</p>
                        </div>
                      </div>
                      <button
                        onClick={handleUpdatePayment}
                        className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                      >
                        Update
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <p className="text-sm text-gray-600 mb-3">No payment method on file</p>
                      <button
                        onClick={handleUpdatePayment}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                      >
                        Add Payment Method
                      </button>
                    </div>
                  )}
                </div>

                {/* Recent Invoices */}
                <div className="bg-white shadow rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Invoices</h3>
                  {invoices.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead>
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {invoices.map((invoice) => (
                            <tr key={invoice.id}>
                              <td className="px-4 py-3 text-sm text-gray-900">{invoice.invoice_number}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">${invoice.amount.toFixed(2)}</td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(invoice.status)}`}>
                                  {invoice.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {new Date(invoice.due_date).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-3">
                                {invoice.invoice_pdf && (
                                  <a
                                    href={invoice.invoice_pdf}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-blue-600 hover:text-blue-700"
                                  >
                                    <DocumentTextIcon className="w-5 h-5 inline" />
                                  </a>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600">No invoices found</p>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'integrations' && !integrationsSubPage && (
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
                    {isAdmin ? (
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
                    ) : (
                      <span className="px-4 py-2 text-sm text-gray-400">Admin only</span>
                    )}
                  </div>
                  
                  {/* Show details when connected */}
                  {integration.name === 'Twilio' && integration.status === 'connected' && twilioDetails && (
                    <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                      <div className="text-xs text-gray-600">
                        <p><strong>Account SID:</strong> {twilioDetails.account_sid?.substring(0, 10)}...</p>
                        <p className="mt-1"><strong>Status:</strong> {twilioDetails.is_verified ? '✓ Verified' : '⚠ Not Verified'}</p>
                        <p className="mt-1"><strong>Phone Numbers:</strong> {phoneNumbers.length}</p>
                      </div>
                      {isAdmin && (
                        <>
                          <button
                            onClick={handleSyncPhoneNumbers}
                            className="w-full px-3 py-2 text-xs font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100"
                          >
                            🔄 Sync Phone Numbers
                          </button>
                          {phoneNumbers.length > 0 && (
                            <button
                              onClick={() => navigateToIntegrationsSubPage('phone-numbers')}
                              className="w-full px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                            >
                              📱 Manage Phone Numbers
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}


      {/* Create Team Modal */}
      {showCreateTeamModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Create New Team</h2>
            
            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Team Name *
                </label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={teamForm.name}
                  onChange={handleTeamNameChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    teamNameError ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Sales Team"
                />
                {teamNameError && (
                  <p className="mt-2 text-sm text-red-600 flex items-start gap-1">
                    <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {teamNameError}
                  </p>
                )}
              </div>

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
                  disabled={isCreatingTeam}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {isCreatingTeam ? 'Creating...' : 'Create Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Member to Team Modal */}
      {showAddMemberModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Add Team Member</h2>
            
            {availableUsers.length === 0 ? (
              <div className="text-center py-6">
                <UserIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p className="text-gray-500">No users found</p>
                <p className="text-sm text-gray-500 mt-1">No users available in your company</p>
                <button
                  onClick={() => setShowAddMemberModal(false)}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Close
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Combined Search + Dropdown */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select User *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Type to search or click to select..."
                      value={userSearchTerm}
                      onChange={(e) => {
                        setUserSearchTerm(e.target.value);
                        setShowUserDropdown(true);
                      }}
                      onFocus={() => setShowUserDropdown(true)}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => setShowUserDropdown(!showUserDropdown)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>

                  {/* Custom Dropdown - Opens Below */}
                  {showUserDropdown && (
                    <>
                      {/* Backdrop to close dropdown */}
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setShowUserDropdown(false)}
                      />
                      
                      {/* Dropdown List */}
                      <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                        {availableUsers
                          .filter((user) => {
                            if (!userSearchTerm) return true;
                            const searchLower = userSearchTerm.toLowerCase();
                            const fullName = `${user.first_name} ${user.last_name}`.toLowerCase();
                            const email = user.email.toLowerCase();
                            const role = (user.user_role || '').toLowerCase();
                            return fullName.includes(searchLower) || email.includes(searchLower) || role.includes(searchLower);
                          })
                          .map((user) => (
                            <div
                              key={user.id}
                              onClick={() => {
                                setSelectedUserId(user.id);
                                setUserSearchTerm(`${user.first_name} ${user.last_name} (${user.email})`);
                                setShowUserDropdown(false);
                              }}
                              className={`p-3 cursor-pointer hover:bg-blue-50 border-b border-gray-100 last:border-b-0 ${
                                selectedUserId === user.id ? 'bg-blue-50' : ''
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900">
                                    {user.first_name} {user.last_name}
                                  </p>
                                  <p className="text-sm text-gray-600">{user.email}</p>
                                  {user.user_role && (
                                    <p className="text-xs text-gray-500 mt-1">
                                      {user.user_role}
                                    </p>
                                  )}
                                </div>
                                {selectedUserId === user.id && (
                                  <CheckCircleIcon className="w-5 h-5 text-blue-600 flex-shrink-0 ml-2" />
                                )}
                              </div>
                            </div>
                          ))}
                        {availableUsers.filter((user) => {
                          if (!userSearchTerm) return true;
                          const searchLower = userSearchTerm.toLowerCase();
                          const fullName = `${user.first_name} ${user.last_name}`.toLowerCase();
                          const email = user.email.toLowerCase();
                          const role = (user.user_role || '').toLowerCase();
                          return fullName.includes(searchLower) || email.includes(searchLower) || role.includes(searchLower);
                        }).length === 0 && (
                          <div className="p-4 text-center text-gray-500">
                            No users match your search
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {selectedUserId && (
                    <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-900">
                        ✓ Selected: {availableUsers.find(u => u.id === selectedUserId)?.first_name} {availableUsers.find(u => u.id === selectedUserId)?.last_name}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddMemberModal(false);
                      setUserSearchTerm('');
                      setSelectedUserId('');
                      setShowUserDropdown(false);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddMemberToTeam}
                    disabled={!selectedUserId || isAddingMember}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    {isAddingMember ? 'Adding...' : 'Add to Team'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Invite Team Member Modal */}
      {showAddTeamModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Invite Team Member</h3>
              <button onClick={() => setShowAddTeamModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="John"
                    value={teamMemberForm.first_name}
                    maxLength={50}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (!/<[^>]*>/gi.test(value)) {
                        setTeamMemberForm({...teamMemberForm, first_name: value});
                      } else {
                        toast.error('HTML tags are not allowed');
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Doe"
                    value={teamMemberForm.last_name}
                    maxLength={50}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (!/<[^>]*>/gi.test(value)) {
                        setTeamMemberForm({...teamMemberForm, last_name: value});
                      } else {
                        toast.error('HTML tags are not allowed');
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  placeholder="user@example.com"
                  maxLength={255}
                  value={teamMemberForm.email}
                  onChange={(e) => setTeamMemberForm({...teamMemberForm, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                  required
                />
                <div className="text-xs text-gray-500 mt-1">
                  Enter a valid email address (e.g., name@company.com)
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Role <span className="text-red-500">*</span>
                  </label>
                  {isSuperAdmin && (
                    <button
                      type="button"
                      onClick={() => setShowAddRoleModal(true)}
                      className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                    >
                      + Add New Role
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    placeholder={teamMemberForm.role || "Search and select role..."}
                    value={roleSearchTerm}
                    onChange={(e) => {
                      setRoleSearchTerm(e.target.value);
                      setShowRoleDropdown(true);
                    }}
                    onFocus={() => setShowRoleDropdown(true)}
                    onBlur={() => setTimeout(() => setShowRoleDropdown(false), 200)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                    required
                  />
                  {showRoleDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {defaultRoles
                        .filter(role => role.toLowerCase().includes(roleSearchTerm.toLowerCase()))
                        .map(role => (
                          <div
                            key={role}
                            onClick={() => {
                              setTeamMemberForm({...teamMemberForm, role});
                              setRoleSearchTerm('');
                              setShowRoleDropdown(false);
                            }}
                            className="px-3 py-2 hover:bg-gray-100 cursor-pointer flex items-center justify-between"
                          >
                            <span>{role}</span>
                          </div>
                        ))}
                      {customRoles
                        .filter(role => role.toLowerCase().includes(roleSearchTerm.toLowerCase()))
                        .map(role => (
                          <div
                            key={role}
                            className="px-3 py-2 hover:bg-gray-100 cursor-pointer flex items-center justify-between group"
                          >
                            <span
                              onClick={() => {
                                setTeamMemberForm({...teamMemberForm, role});
                                setRoleSearchTerm('');
                                setShowRoleDropdown(false);
                              }}
                              className="flex-1"
                            >
                              {role} <span className="text-xs text-gray-500">(Custom)</span>
                            </span>
                            {isSuperAdmin && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteCustomRole(role);
                                }}
                                className="ml-2 text-red-600 hover:text-red-800 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Delete role"
                              >
                                <XMarkIcon className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => {
                    setShowAddTeamModal(false);
                    setTeamMemberForm({ first_name: '', last_name: '', email: '', role: 'Regular User' });
                    setRoleSearchTerm('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddTeamMember}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
                >
                  Send Invitation
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="John"
                    value={teamMemberForm.first_name}
                    maxLength={50}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (!/<[^>]*>/gi.test(value)) {
                        setTeamMemberForm({...teamMemberForm, first_name: value});
                      } else {
                        toast.error('HTML tags are not allowed');
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Doe"
                    value={teamMemberForm.last_name}
                    maxLength={50}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (!/<[^>]*>/gi.test(value)) {
                        setTeamMemberForm({...teamMemberForm, last_name: value});
                      } else {
                        toast.error('HTML tags are not allowed');
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  placeholder="Enter email address"
                  value={teamMemberForm.email}
                  onChange={(e) => setTeamMemberForm({...teamMemberForm, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                  required
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Role <span className="text-red-500">*</span>
                  </label>
                  {isSuperAdmin && (
                    <button
                      type="button"
                      onClick={() => setShowAddRoleModal(true)}
                      className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                    >
                      + Add New Role
                    </button>
                  )}
                </div>
                <div className="relative">
                  <div className="relative">
                    {/* Check if editing a Company Admin - only Super Admin can change their role */}
                    {!isSuperAdmin && selectedMember && (selectedMember.role?.toLowerCase() === 'company_admin' || selectedMember.role?.toLowerCase() === 'company admin' || selectedMember.user_role?.toLowerCase() === 'company_admin' || selectedMember.user_role?.toLowerCase() === 'company admin') ? (
                      <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed">
                        {teamMemberForm.role}
                        <p className="text-xs text-gray-500 mt-1">Only Super Admin can change Company Admin roles</p>
                      </div>
                    ) : (
                      <input
                        type="text"
                        placeholder={!teamMemberForm.role ? "Search and select role..." : ""}
                        value={roleSearchTerm || teamMemberForm.role || ''}
                        onChange={(e) => {
                          setRoleSearchTerm(e.target.value);
                          setShowRoleDropdown(true);
                        }}
                        onFocus={(e) => {
                          // Clear the input to show dropdown when focused
                          if (!roleSearchTerm && teamMemberForm.role) {
                            setRoleSearchTerm('');
                          }
                          setShowRoleDropdown(true);
                        }}
                        onBlur={() => setTimeout(() => {
                          setShowRoleDropdown(false);
                          setRoleSearchTerm(''); // Clear search term when closing
                        }, 200)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                        required
                      />
                    )}
                  </div>
                  {showRoleDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {defaultRoles
                        .filter(role => role.toLowerCase().includes(roleSearchTerm.toLowerCase()))
                        .map(role => (
                          <div
                            key={role}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setTeamMemberForm({...teamMemberForm, role});
                              setRoleSearchTerm('');
                              setShowRoleDropdown(false);
                            }}
                            className="px-3 py-2 hover:bg-gray-100 cursor-pointer flex items-center justify-between"
                          >
                            <span>{role}</span>
                          </div>
                        ))}
                      {customRoles
                        .filter(role => role.toLowerCase().includes(roleSearchTerm.toLowerCase()))
                        .map(role => (
                          <div
                            key={role}
                            className="px-3 py-2 hover:bg-gray-100 cursor-pointer flex items-center justify-between group"
                          >
                            <span
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setTeamMemberForm({...teamMemberForm, role});
                                setRoleSearchTerm('');
                                setShowRoleDropdown(false);
                              }}
                              className="flex-1"
                            >
                              {role} <span className="text-xs text-gray-500">(Custom)</span>
                            </span>
                            {isSuperAdmin && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteCustomRole(role);
                                }}
                                className="ml-2 text-red-600 hover:text-red-800 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Delete role"
                              >
                                <XMarkIcon className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => {
                    setShowEditTeamModal(false);
                    setRoleSearchTerm('');
                  }}
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

      {/* Add Custom Role Modal */}
      {showAddRoleModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Add Custom Role</h3>
              <button onClick={() => { setShowAddRoleModal(false); setNewRoleName(''); }} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., Marketing Manager"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddCustomRole()}
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => { setShowAddRoleModal(false); setNewRoleName(''); }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddCustomRole}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
                >
                  Add Role
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
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Get your Twilio credentials from{' '}
                  <a href="https://console.twilio.com" target="_blank" rel="noopener noreferrer" className="underline">
                    console.twilio.com
                  </a>
                  . Your phone numbers will be automatically synced after connecting.
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
                  disabled={isSavingTwilio}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingTwilio ? 'Connecting...' : 'Connect Twilio'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SendGrid Configuration Modal */}
      {showSendGridModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Configure SendGrid</h3>
              <button onClick={() => setShowSendGridModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                <input
                  type="password"
                  placeholder="SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  value={sendGridForm.apiKey}
                  onChange={(e) => setSendGridForm({...sendGridForm, apiKey: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Email</label>
                <input
                  type="email"
                  placeholder="noreply@yourcompany.com"
                  value={sendGridForm.fromEmail}
                  onChange={(e) => setSendGridForm({...sendGridForm, fromEmail: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Name</label>
                <input
                  type="text"
                  placeholder="Your Company"
                  value={sendGridForm.fromName}
                  onChange={(e) => setSendGridForm({...sendGridForm, fromName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Get your SendGrid API key from{' '}
                  <a href="https://app.sendgrid.com/settings/api_keys" target="_blank" rel="noopener noreferrer" className="underline">
                    SendGrid Dashboard
                  </a>
                  . Make sure to verify your sender email address.
                </p>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowSendGridModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSendGrid}
                  disabled={isSavingSendGrid}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingSendGrid ? 'Connecting...' : 'Connect SendGrid'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Update Payment Method Modal */}
      {showUpdatePaymentModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Update Payment Method</h3>
              <button onClick={() => setShowUpdatePaymentModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cardholder Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="John Doe"
                  value={billingForm.cardholderName}
                  onChange={(e) => setBillingForm({...billingForm, cardholderName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Card Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="1234 5678 9012 3456"
                  value={billingForm.cardNumber}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\s/g, '');
                    if (/^\d{0,16}$/.test(value)) {
                      setBillingForm({...billingForm, cardNumber: value});
                    }
                  }}
                  maxLength={16}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                  required
                />
                <div className="text-xs text-gray-500 mt-1">
                  {billingForm.cardNumber.length}/16 digits
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expiry (MM/YY) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="12/25"
                    value={billingForm.cardExpiry}
                    onChange={(e) => {
                      let value = e.target.value.replace(/\D/g, '');
                      if (value.length >= 2) {
                        value = value.slice(0, 2) + '/' + value.slice(2, 4);
                      }
                      setBillingForm({...billingForm, cardExpiry: value});
                    }}
                    maxLength={5}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CVC <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="123"
                    value={billingForm.cardCVC}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      if (value.length <= 4) {
                        setBillingForm({...billingForm, cardCVC: value});
                      }
                    }}
                    maxLength={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                    required
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-3 pt-4 mt-4 border-t">
              <button
                onClick={() => setShowUpdatePaymentModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdatePayment}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
              >
                Save Payment Method
              </button>
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

      {activeTab === 'custom_fields' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Custom Fields</h2>
              <p className="text-gray-600 mt-1">Manage custom fields for contacts, deals, and companies</p>
            </div>
            <button
              onClick={() => navigate('/settings/custom-fields')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <AdjustmentsHorizontalIcon className="w-5 h-5" />
              Manage Custom Fields
            </button>
          </div>
          <div className="bg-white shadow rounded-lg p-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                Custom fields allow you to add additional data fields to your contacts, deals, and companies. 
                Click "Manage Custom Fields" to create and configure custom fields for your organization.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'integrations' && integrationsSubPage === 'phone-numbers' && (
        <div className="bg-white shadow rounded-lg p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div>
              <button
                onClick={() => {
                  setIntegrationsSubPage(null);
                  navigate('/settings?tab=integrations', { replace: true });
                }}
                className="text-sm text-gray-600 hover:text-gray-900 mb-2 flex items-center gap-1"
              >
                ← Back to Integrations
              </button>
              <h2 className="text-lg font-medium text-gray-900">Phone Numbers</h2>
              <p className="text-sm text-gray-600 mt-1">Manage your Twilio phone numbers for SMS and calling</p>
            </div>
            <button
              onClick={handleSyncPhoneNumbers}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <ArrowPathIcon className="w-5 h-5" />
              Sync Phone Numbers
            </button>
          </div>
          
          {phoneNumbers.length === 0 ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                No phone numbers found. Click "Sync Phone Numbers" to import your Twilio phone numbers.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone Number</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Friendly Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Capabilities</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rotation</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {phoneNumbers.map((number: any) => (
                    <tr key={number.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{number.phone_number}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{number.friendly_name || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex gap-2">
                          {number.capabilities?.sms && <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">SMS</span>}
                          {number.capabilities?.voice && <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">Voice</span>}
                          {number.capabilities?.mms && <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">MMS</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`px-2 py-1 text-xs rounded ${number.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {number.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`px-2 py-1 text-xs rounded ${number.use_for_rotation ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                          {number.use_for_rotation ? 'Enabled' : 'Disabled'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Delete Team Confirmation Modal */}
      {showDeleteTeamModal && teamToDelete && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-[9999] flex items-center justify-center p-4" 
          onClick={closeDeleteTeamModal}
        >
          <div className="relative mx-auto p-6 border w-full max-w-md shadow-lg rounded-md bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base sm:text-lg font-medium text-gray-900">Confirm Deletion</h3>
              <button onClick={closeDeleteTeamModal} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="mb-6">
              <p className="text-gray-700">
                Are you sure you want to delete <span className="font-semibold">"{teamToDelete.name}"</span>?
              </p>
              <p className="text-sm text-gray-500 mt-2">
                All members will be unassigned from this team. This action cannot be undone.
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={closeDeleteTeamModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                No, Cancel
              </button>
              <button
                onClick={confirmDeleteTeam}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Member Confirmation Modal */}
      {showRemoveMemberModal && memberToRemove && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-[9999] flex items-center justify-center p-4" 
          onClick={closeRemoveMemberModal}
        >
          <div className="relative mx-auto p-6 border w-full max-w-md shadow-lg rounded-md bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base sm:text-lg font-medium text-gray-900">Confirm Removal</h3>
              <button onClick={closeRemoveMemberModal} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="mb-6">
              <p className="text-gray-700">
                Are you sure you want to remove <span className="font-semibold">{memberToRemove.first_name} {memberToRemove.last_name}</span> from the team?
              </p>
              <p className="text-sm text-gray-500 mt-2">
                This member will be unassigned from the team. This action cannot be undone.
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={closeRemoveMemberModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                No, Cancel
              </button>
              <button
                onClick={confirmRemoveMember}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                Yes, Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Member Confirmation Modal */}
      {showDeleteMemberModal && memberToRemove && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-[9999] flex items-center justify-center p-4" 
          onClick={() => setShowDeleteMemberModal(false)}
        >
          <div className="relative mx-auto p-6 border w-full max-w-md shadow-lg rounded-md bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base sm:text-lg font-medium text-gray-900">Confirm Deletion</h3>
              <button onClick={() => setShowDeleteMemberModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="mb-6">
              <p className="text-gray-700">
                Are you sure you want to permanently delete <span className="font-semibold">{memberToRemove.first_name} {memberToRemove.last_name}</span>?
              </p>
              <p className="text-sm text-red-600 mt-2 font-medium">
                ⚠️ This will permanently delete their account and all associated data. This action cannot be undone.
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteMemberModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                No, Cancel
              </button>
              <button
                onClick={handleDeleteTeamMember}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                Yes, Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
