import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import * as contactsService from '../services/contactsService';
import ActionButtons from '../components/common/ActionButtons';
import ContactUpload from '../components/contacts/ContactUpload';
import Pagination from '../components/common/Pagination';
import CompanyCombobox from '../components/common/CompanyCombobox';
import StatusCombobox from '../components/common/StatusCombobox';
import { 
  UserGroupIcon, 
  PlusIcon, 
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowUpTrayIcon,
  XMarkIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  company?: string;
  title?: string;
  type?: string;
  status?: string;
  source?: string;
  lead_score?: number;
  owner_id?: string;
}

export default function Contacts() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [contactTypes, setContactTypes] = useState<string[]>([]);
  const [users, setUsers] = useState<Array<{id: string, name: string, email: string}>>([]);
  const [showAddTypeModal, setShowAddTypeModal] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [contactForm, setContactForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company: '',
    title: '',
    type: '',
    status: 'new',
    source: '',
    owner_id: ''
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Prevent background scroll when modals are open
  useEffect(() => {
    if (showAddModal || showEditModal || showViewModal || showUploadModal || showAddTypeModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showAddModal, showEditModal, showViewModal, showUploadModal, showAddTypeModal]);

  const resetContactForm = async () => {
    // Get current user ID for default owner
    try {
      const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/api/users/me', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const userData = await response.json();
      setContactForm({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        company: '',
        title: '',
        type: contactTypes.length > 0 ? contactTypes[0] : '',
        status: 'new',
        source: '',
        owner_id: userData.id
      });
    } catch (error) {
      console.error('Failed to fetch current user:', error);
      setContactForm({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        company: '',
        title: '',
        type: contactTypes.length > 0 ? contactTypes[0] : '',
        status: 'new',
        source: '',
        owner_id: ''
      });
    }
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
    resetContactForm();
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    resetContactForm();
  };
  
  // Fetch current user and users for owner dropdown
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/api/users/me', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        const userData = await response.json();
        // Set default owner_id to current user
        setContactForm(prev => ({
          ...prev,
          owner_id: userData.id
        }));
      } catch (error) {
        console.error('Failed to fetch current user:', error);
      }
    };
    
    const fetchUsers = async () => {
      try {
        const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/api/users', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        const data = await response.json();
        setUsers(data.map((user: any) => ({
          id: user.id,
          name: `${user.first_name} ${user.last_name}`,
          email: user.email
        })));
      } catch (error) {
        console.error('Failed to fetch users:', error);
      }
    };
    
    fetchCurrentUser();
    fetchUsers();
  }, []);
  
  // Check for action and search query parameters
  useEffect(() => {
    const action = searchParams.get('action');
    const search = searchParams.get('search');
    
    if (action === 'add') {
      setShowAddModal(true);
      // Remove the action parameter from URL
      searchParams.delete('action');
      setSearchParams(searchParams);
    }
    
    if (search) {
      setSearchQuery(search);
      // Remove the search parameter from URL after setting it
      searchParams.delete('search');
      setSearchParams(searchParams);
    }
  }, [searchParams]);

  // Fetch all contact types on mount
  useEffect(() => {
    const fetchAllTypes = async () => {
      try {
        const allContacts = await contactsService.getContacts({});
        const types = allContacts
          .map((contact: Contact) => contact.type)
          .filter((type: string | undefined): type is string => !!type);
        const uniqueTypes = [...new Set(types)].sort() as string[];
        setContactTypes(uniqueTypes);
      } catch (error) {
        console.error('Error fetching types:', error);
      }
    };
    fetchAllTypes();
  }, []);

  // Fetch contacts
  useEffect(() => {
    fetchContacts();
  }, [filterType]); // Removed searchQuery - filtering is done client-side

  // Listen for real-time WebSocket updates
  useEffect(() => {
    const handleEntityChange = (event: any) => {
      const { entity_type, action } = event.detail;
      
      // Refresh contacts when any contact is created, updated, or deleted
      if (entity_type === 'contact') {
        fetchContacts();
      }
    };

    window.addEventListener('entity_change', handleEntityChange);
    return () => window.removeEventListener('entity_change', handleEntityChange);
  }, []);
  
  const fetchContacts = async () => {
    setLoading(true);
    try {
      const data = await contactsService.getContacts({ 
        type: filterType !== 'all' ? filterType : undefined
        // Removed search parameter - doing client-side filtering instead
      });
      setContacts(data);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle view contact
  const handleView = (contact: Contact) => {
    setSelectedContact(contact);
    setShowViewModal(true);
  };
  
  // Handle edit contact
  const handleEdit = (contact: Contact) => {
    setSelectedContact(contact);
    setContactForm({
      first_name: contact.first_name,
      last_name: contact.last_name,
      email: contact.email,
      phone: contact.phone || '',
      company: contact.company || '',
      title: contact.title || '',
      type: contact.type || 'Lead',
      status: contact.status || 'new',
      source: contact.source || '',
      owner_id: contact.owner_id || ''
    });
    setShowEditModal(true);
  };
  
  // Handle delete contact
  const handleDelete = async (contact: Contact) => {
    if (!confirm(`Delete ${contact.first_name} ${contact.last_name}?`)) return;
    
    try {
      await contactsService.deleteContact(contact.id);
      toast.success('Contact deleted');
      fetchContacts();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(error?.response?.data?.detail || error?.message || 'Failed to delete contact');
    }
  };
  
  // Handle add new contact type
  const handleAddContactType = () => {
    const trimmedName = newTypeName.trim();
    
    // Validate not empty
    if (!trimmedName) {
      toast.error('Contact type name is required');
      return;
    }
    
    // Character limit validation
    if (trimmedName.length > 50) {
      toast.error('Contact type name must be less than 50 characters');
      return;
    }
    
    // XSS prevention - check for ANY HTML tags and JavaScript
    if (/<[^>]*>/gi.test(trimmedName)) {
      toast.error('HTML tags are not allowed in contact type name');
      return;
    }
    
    // Additional check for JavaScript patterns
    if (/javascript:|on\w+=/gi.test(trimmedName)) {
      toast.error('JavaScript code is not allowed in contact type name');
      return;
    }
    
    // Check for duplicate
    if (contactTypes.includes(trimmedName)) {
      toast.error('This contact type already exists');
      return;
    }
    
    setContactTypes([...contactTypes, trimmedName]);
    setContactForm({...contactForm, type: trimmedName});
    setNewTypeName('');
    setShowAddTypeModal(false);
    toast.success('New contact type added');
  };
  
  // Handle create contact
  const handleCreate = async () => {
    if (submitting) return;
    
    // Validate mandatory fields
    if (!contactForm.first_name || !contactForm.first_name.trim()) {
      toast.error('First name is required');
      return;
    }
    
    if (!contactForm.last_name || !contactForm.last_name.trim()) {
      toast.error('Last name is required');
      return;
    }
    
    if (!contactForm.email || !contactForm.email.trim()) {
      toast.error('Email is required');
      return;
    }
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contactForm.email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    
    if (!contactForm.phone || !contactForm.phone.trim()) {
      toast.error('Phone number is required');
      return;
    }
    
    // Phone format validation (basic - allows +, digits, spaces, hyphens, parentheses)
    const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/;
    if (!phoneRegex.test(contactForm.phone.replace(/\s/g, ''))) {
      toast.error('Please enter a valid phone number');
      return;
    }
    
    // Validate owner_id is set
    if (!contactForm.owner_id) {
      toast.error('Please select an owner');
      return;
    }
    
    // Character limit validation
    if (contactForm.first_name && contactForm.first_name.length > 100) {
      toast.error('First name must be less than 100 characters');
      return;
    }
    if (contactForm.last_name && contactForm.last_name.length > 100) {
      toast.error('Last name must be less than 100 characters');
      return;
    }
    if (contactForm.email && contactForm.email.length > 255) {
      toast.error('Email must be less than 255 characters');
      return;
    }
    if (contactForm.phone && contactForm.phone.length > 50) {
      toast.error('Phone must be less than 50 characters');
      return;
    }
    if (contactForm.company && contactForm.company.length > 200) {
      toast.error('Company name must be less than 200 characters');
      return;
    }
    if (contactForm.title && contactForm.title.length > 200) {
      toast.error('Title must be less than 200 characters');
      return;
    }
    
    // XSS prevention - check for script tags
    const fields = [contactForm.first_name, contactForm.last_name, contactForm.company, contactForm.title];
    for (const field of fields) {
      if (field && /<script|<\/script|javascript:|onerror=|onload=/gi.test(field)) {
        toast.error('Script tags and JavaScript code are not allowed');
        return;
      }
    }
    
    setSubmitting(true);
    try {
      
      await contactsService.createContact(contactForm);
      toast.success('Contact created');
      setShowAddModal(false);
      await resetContactForm();
      fetchContacts();
    } catch (error: any) {
      const errorDetail = error?.response?.data?.detail;
      
      // User-friendly error messages
      if (typeof errorDetail === 'string') {
        if (errorDetail.includes('already exists') || errorDetail.includes('duplicate')) {
          toast.error('A contact with this email already exists in your company.');
        } else if (errorDetail.includes('email')) {
          toast.error('Please enter a valid email address.');
        } else if (errorDetail.includes('required')) {
          toast.error('Please fill in all required fields.');
        } else {
          toast.error(errorDetail);
        }
      } else {
        toast.error('Failed to create contact. Please check your information and try again.');
      }
      
      console.error('Contact creation error:', error);
    } finally {
      setSubmitting(false);
    }
  };
  
  // Handle update contact
  const handleUpdate = async () => {
    if (!selectedContact) return;
    if (submitting) return;
    
    // Validate mandatory fields
    if (!contactForm.first_name || !contactForm.first_name.trim()) {
      toast.error('First name is required');
      return;
    }
    
    if (!contactForm.last_name || !contactForm.last_name.trim()) {
      toast.error('Last name is required');
      return;
    }
    
    if (!contactForm.email || !contactForm.email.trim()) {
      toast.error('Email is required');
      return;
    }
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contactForm.email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    
    if (!contactForm.phone || !contactForm.phone.trim()) {
      toast.error('Phone number is required');
      return;
    }
    
    // Phone format validation
    const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/;
    if (!phoneRegex.test(contactForm.phone.replace(/\s/g, ''))) {
      toast.error('Please enter a valid phone number');
      return;
    }
    
    try {
      // Validate owner_id is set
      if (!contactForm.owner_id) {
        toast.error('Please select an owner');
        return;
      }
      
      setSubmitting(true);
      
      // Remove empty source field to avoid enum validation errors
      const { source, ...updateData } = contactForm;
      await contactsService.updateContact(selectedContact.id, updateData);
      toast.success('Contact updated');
      setShowEditModal(false);
      fetchContacts();
    } catch (error: any) {
      const errorDetail = error?.response?.data?.detail;
      
      // User-friendly error messages
      if (typeof errorDetail === 'string') {
        if (errorDetail.includes('already exists') || errorDetail.includes('duplicate')) {
          toast.error('A contact with this email already exists in your company.');
        } else if (errorDetail.includes('email')) {
          toast.error('Please enter a valid email address.');
        } else if (errorDetail.includes('required')) {
          toast.error('Please fill in all required fields.');
        } else {
          toast.error(errorDetail);
        }
      } else {
        toast.error('Failed to update contact. Please check your information and try again.');
      }
      
      console.error('Contact update error:', error);
    } finally {
      setSubmitting(false);
    }
  };
  
  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      await contactsService.bulkImportContacts(file);
      toast.success('Contacts imported successfully');
      setShowUploadModal(false);
      fetchContacts();
    } catch (error) {
      toast.error('Failed to import contacts');
    }
  };
  
  // Filter contacts - search in full name, company, email, and phone
  const filteredContacts = contacts.filter(contact => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase().trim();
    const fullName = `${contact.first_name} ${contact.last_name}`.toLowerCase();
    const company = contact.company?.toLowerCase() || '';
    const email = contact.email?.toLowerCase() || '';
    const phone = contact.phone?.toLowerCase() || '';
    
    return fullName.includes(query) || 
           company.includes(query) || 
           email.includes(query) || 
           phone.includes(query);
  });

  // Pagination
  const itemsPerPage = 15;
  const totalPages = Math.ceil(filteredContacts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedContacts = filteredContacts.slice(startIndex, endIndex);

  // Reset to page 1 when search/filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterType]);

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="px-4 sm:px-6 lg:max-w-7xl xl:max-w-8xl 2xl:max-w-9xl 3xl:max-w-10xl lg:mx-auto lg:px-8">
          <div className="py-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold leading-tight sm:leading-7 text-gray-900">Contacts</h1>
              <p className="mt-1 text-xs sm:text-sm text-gray-500">
                Manage your contacts and leads
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setShowUploadModal(true)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50"
              >
                <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
                Import
              </button>
              <button
                onClick={async () => {
                  await resetContactForm();
                  setShowAddModal(true);
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Contact
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 sm:px-6 lg:max-w-7xl xl:max-w-8xl 2xl:max-w-9xl 3xl:max-w-10xl lg:mx-auto lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg transition-colors ${
                showFilters 
                  ? 'bg-primary-100 text-primary-600' 
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              }`}
              title="Toggle Filters"
            >
              <FunnelIcon className="h-5 w-5" />
            </button>
            {showFilters && (
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 min-w-[180px]"
              >
                <option value="all">All Types</option>
                {contactTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Contacts Table */}
        <div className="mt-6 bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading contacts...</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedContacts.map((contact) => (
                    <tr key={contact.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {contact.first_name} {contact.last_name}
                        </div>
                        <div className="text-sm text-gray-500">{contact.title}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {contact.company}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {contact.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {contact.phone}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          contact.type?.toLowerCase().trim() === 'customer' ? 'bg-blue-100 text-blue-800' :
                          contact.type?.toLowerCase().trim() === 'prospect' ? 'bg-teal-100 text-teal-800' :
                          contact.type?.toLowerCase().trim() === 'marketing qualified lead' ? 'bg-purple-100 text-purple-800' :
                          contact.type?.toLowerCase().trim() === 'partner' ? 'bg-orange-100 text-orange-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {contact.type || 'Lead'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          contact.status === 'customer' ? 'bg-green-100 text-green-800' :
                          contact.status === 'qualified' ? 'bg-blue-100 text-blue-800' :
                          contact.status === 'contacted' ? 'bg-yellow-100 text-yellow-800' :
                          contact.status === 'new' ? 'bg-gray-100 text-gray-800' :
                          contact.status === 'unqualified' ? 'bg-orange-100 text-orange-800' :
                          contact.status === 'lost' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {contact.status ? contact.status.charAt(0).toUpperCase() + contact.status.slice(1) : 'New'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {users.find(u => u.id === contact.owner_id)?.name || 'Unassigned'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <ActionButtons
                          onView={() => handleView(contact)}
                          onEdit={() => handleEdit(contact)}
                          onDelete={() => handleDelete(contact)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredContacts.length === 0 && (
                <div className="p-12 text-center">
                  <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No contacts</h3>
                  <p className="mt-1 text-sm text-gray-500">Get started by creating a new contact.</p>
                </div>
              )}
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-gray-200">
                {paginatedContacts.length > 0 ? (
                  paginatedContacts.map((contact) => (
                    <div key={contact.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-gray-900 truncate">
                            {contact.first_name} {contact.last_name}
                          </h3>
                          {contact.title && (
                            <p className="text-xs text-gray-500 mt-0.5">{contact.title}</p>
                          )}
                          {contact.company && (
                            <p className="text-xs text-gray-600 mt-1 flex items-center">
                              <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                              {contact.company}
                            </p>
                          )}
                          <div className="mt-2 flex flex-wrap gap-2">
                            {contact.email && (
                              <a href={`mailto:${contact.email}`} className="text-xs text-primary-600 hover:text-primary-700 flex items-center">
                                <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                {contact.email}
                              </a>
                            )}
                            {contact.phone && (
                              <a href={`tel:${contact.phone}`} className="text-xs text-primary-600 hover:text-primary-700 flex items-center">
                                <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                {contact.phone}
                              </a>
                            )}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              contact.type?.toLowerCase().trim() === 'customer' ? 'bg-blue-100 text-blue-800' :
                              contact.type?.toLowerCase().trim() === 'prospect' ? 'bg-teal-100 text-teal-800' :
                              contact.type?.toLowerCase().trim() === 'marketing qualified lead' ? 'bg-purple-100 text-purple-800' :
                              contact.type?.toLowerCase().trim() === 'partner' ? 'bg-orange-100 text-orange-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {contact.type || 'Lead'}
                            </span>
                            <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              contact.status === 'customer' ? 'bg-green-100 text-green-800' :
                              contact.status === 'qualified' ? 'bg-blue-100 text-blue-800' :
                              contact.status === 'contacted' ? 'bg-yellow-100 text-yellow-800' :
                              contact.status === 'new' ? 'bg-gray-100 text-gray-800' :
                              contact.status === 'unqualified' ? 'bg-orange-100 text-orange-800' :
                              contact.status === 'lost' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {contact.status ? contact.status.charAt(0).toUpperCase() + contact.status.slice(1) : 'New'}
                            </span>
                          </div>
                          {/* Owner/Team Member */}
                          <div className="mt-2">
                            <p className="text-xs text-gray-500">
                              Owner: <span className="font-medium text-gray-700">{users.find(u => u.id === contact.owner_id)?.name || 'Unassigned'}</span>
                            </p>
                          </div>
                        </div>
                        <div className="ml-3 flex flex-col gap-1">
                          <button
                            onClick={() => handleView(contact)}
                            className="p-2 text-gray-400 hover:text-primary-600 rounded-lg hover:bg-gray-100"
                            title="View"
                          >
                            <EyeIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleEdit(contact)}
                            className="p-2 text-gray-400 hover:text-primary-600 rounded-lg hover:bg-gray-100"
                            title="Edit"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(contact)}
                            className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-100"
                            title="Delete"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No contacts</h3>
                    <p className="mt-1 text-sm text-gray-500">Get started by creating a new contact.</p>
                  </div>
                )}
              </div>
            </>
          )}
          {filteredContacts.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              itemsPerPage={itemsPerPage}
              totalItems={filteredContacts.length}
            />
          )}
        </div>
      </div>

      {/* Add Contact Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto p-4 sm:p-5 border w-full max-w-md max-h-[90vh] overflow-y-auto shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base sm:text-lg font-medium text-gray-900">Add New Contact</h3>
              <button onClick={handleCloseAddModal} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="First Name"
                    value={contactForm.first_name}
                    onChange={(e) => setContactForm({...contactForm, first_name: e.target.value})}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Last Name"
                    value={contactForm.last_name}
                    onChange={(e) => setContactForm({...contactForm, last_name: e.target.value})}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  placeholder="Email"
                  value={contactForm.email}
                  onChange={(e) => setContactForm({...contactForm, email: e.target.value})}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  placeholder="Phone (e.g., +1234567890)"
                  value={contactForm.phone}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9+\-() ]/g, '');
                    setContactForm({...contactForm, phone: value});
                  }}
                  pattern="[+]?[0-9\-() ]+"
                  title="Please enter a valid phone number"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company
                </label>
                <CompanyCombobox
                  value={contactForm.company}
                  onChange={(value) => setContactForm({...contactForm, company: value})}
                  placeholder="Select or type company name"
                />
              </div>
              <input
                type="text"
                placeholder="Title"
                value={contactForm.title}
                onChange={(e) => setContactForm({...contactForm, title: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              
              {/* Type Field */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={contactForm.type}
                    onChange={(e) => setContactForm({...contactForm, type: e.target.value})}
                    className="w-full sm:flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                  >
                    {contactTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowAddTypeModal(true)}
                    className="px-3 py-2 text-sm text-primary-600 border border-primary-300 rounded-lg hover:bg-primary-50 whitespace-nowrap flex-shrink-0"
                  >
                    + Add New Value
                  </button>
                </div>
              </div>
              
              {/* Status Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status <span className="text-red-500">*</span>
                </label>
                <StatusCombobox
                  value={contactForm.status}
                  onChange={(value) => setContactForm({...contactForm, status: value})}
                  placeholder="Select or type status"
                  required
                />
              </div>
              
              {/* Owner Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Owner <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <select
                    value={contactForm.owner_id}
                    onChange={(e) => setContactForm({...contactForm, owner_id: e.target.value})}
                    className="flex-1 min-w-0 w-0 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                  >
                    {users.length === 0 && <option value="">Loading users...</option>}
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>{user.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      toast('Please add new users from Settings > Team Members', { icon: 'ℹ️' });
                    }}
                    className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex-shrink-0"
                    title="Add new owner"
                  >
                    <PlusIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={handleCloseAddModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Creating...' : 'Create Contact'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Contact Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto p-4 sm:p-5 border w-full max-w-md max-h-[90vh] overflow-y-auto shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base sm:text-lg font-medium text-gray-900">Edit Contact</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="First Name"
                    value={contactForm.first_name}
                    onChange={(e) => setContactForm({...contactForm, first_name: e.target.value})}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Last Name"
                    value={contactForm.last_name}
                    onChange={(e) => setContactForm({...contactForm, last_name: e.target.value})}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  placeholder="Email"
                  value={contactForm.email}
                  onChange={(e) => setContactForm({...contactForm, email: e.target.value})}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  placeholder="Phone (e.g., +1234567890)"
                  value={contactForm.phone}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9+\-() ]/g, '');
                    setContactForm({...contactForm, phone: value});
                  }}
                  pattern="[+]?[0-9\-() ]+"
                  title="Please enter a valid phone number"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company
                </label>
                <CompanyCombobox
                  value={contactForm.company}
                  onChange={(value) => setContactForm({...contactForm, company: value})}
                  placeholder="Select or type company name"
                />
              </div>
                <input
                  type="text"
                  placeholder="Title"
                  value={contactForm.title}
                  onChange={(e) => setContactForm({...contactForm, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                
                {/* Type Field */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type <span className="text-red-500">*</span>
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <select
                      value={contactForm.type}
                      onChange={(e) => setContactForm({...contactForm, type: e.target.value})}
                      className="w-full sm:flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                    >
                      {contactTypes.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowAddTypeModal(true)}
                      className="px-3 py-2 text-sm text-primary-600 border border-primary-300 rounded-lg hover:bg-primary-50 whitespace-nowrap flex-shrink-0"
                    >
                      + Add New Value
                    </button>
                  </div>
                </div>
                
                {/* Status Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status <span className="text-red-500">*</span>
                  </label>
                  <StatusCombobox
                    value={contactForm.status}
                    onChange={(value) => setContactForm({...contactForm, status: value})}
                    placeholder="Select or type status"
                    required
                  />
                </div>
                
                {/* Owner Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Owner <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={contactForm.owner_id}
                      onChange={(e) => setContactForm({...contactForm, owner_id: e.target.value})}
                      className="flex-1 min-w-0 w-0 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                    >
                      {users.length === 0 && <option value="">Loading users...</option>}
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>{user.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        toast('Please add new users from Settings > Team Members', { icon: 'ℹ️' });
                      }}
                      className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex-shrink-0"
                      title="Add new owner"
                    >
                      <PlusIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={handleCloseEditModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdate}
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Contact Modal */}
      {showViewModal && selectedContact && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base sm:text-lg font-medium text-gray-900">Contact Details</h3>
              <button onClick={() => setShowViewModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">Name</label>
                <p className="text-gray-900">{selectedContact.first_name} {selectedContact.last_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Email</label>
                <p className="text-gray-900">{selectedContact.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Phone</label>
                <p className="text-gray-900">{selectedContact.phone || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Company</label>
                <p className="text-gray-900">{selectedContact.company || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Title</label>
                <p className="text-gray-900">{selectedContact.title || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Lead Score</label>
                <p className="text-gray-900">{selectedContact.lead_score || 0}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto p-6 border w-full max-w-2xl shadow-lg rounded-md bg-white my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">Import Contacts</h3>
              <button onClick={() => setShowUploadModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            
            <ContactUpload onUploadComplete={() => {
              fetchContacts();
              setShowUploadModal(false);
            }} />
          </div>
        </div>
      )}
      
      {/* Add New Type Modal */}
      {showAddTypeModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Add New Contact Type</h3>
              <button onClick={() => setShowAddTypeModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <input
                  type="text"
                  placeholder="Enter new contact type"
                  value={newTypeName}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Block HTML tags in real-time
                    if (/<[^>]*>/gi.test(value)) {
                      toast.error('HTML tags are not allowed');
                      return;
                    }
                    setNewTypeName(value);
                  }}
                  maxLength={50}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddContactType()}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {newTypeName.length}/50 characters
                </p>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowAddTypeModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddContactType}
                  disabled={!newTypeName.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Type
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
