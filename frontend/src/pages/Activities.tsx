import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import * as activitiesService from '../services/activitiesService';
import * as customFieldsService from '../services/customFieldsService';
import { CustomField } from '../services/customFieldsService';
import CustomFieldsForm from '../components/CustomFieldsForm';
import CustomFieldsDisplay from '../components/CustomFieldsDisplay';
import ActionButtons from '../components/common/ActionButtons';
import Pagination from '../components/common/Pagination';
import { 
  CalendarIcon, 
  PlusIcon, 
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

interface Activity {
  id: string;
  type: string;
  subject: string;
  description?: string;
  status?: string;
  due_date?: string;
  completed_at?: string;
  duration_minutes?: number;
  owner_id?: string;
  owner_name?: string;
  contact_id?: string;
  deal_id?: string;
  company_id?: string;
  company_name?: string;
  priority?: number;
}

// Helper function to capitalize first letter
const capitalize = (str: string) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export default function Activities() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [activityToDelete, setActivityToDelete] = useState<Activity | null>(null);
  const [showFilters, setShowFilters] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [activityForm, setActivityForm] = useState({
    type: 'call',
    subject: '',
    description: '',
    status: 'pending',
    due_date: '',
    duration_minutes: 30,
    priority: 1,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Custom Fields state
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});
  
  // Prevent background scroll when modals are open
  useEffect(() => {
    if (showAddModal || showEditModal || showViewModal || showDeleteModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showAddModal, showEditModal, showViewModal, showDeleteModal]);
  
  // Check for action query parameter
  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'add') {
      setShowAddModal(true);
      searchParams.delete('action');
      setSearchParams(searchParams);
    }
  }, [searchParams]);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filterType !== 'all') params.type = filterType;
      // Don't send status filter to backend - we'll filter on client side after overdue conversion
      
      const data = await activitiesService.getActivities(params);
      
      // Check for overdue activities (client-side display only)
      // Note: Activities don't auto-execute - they need manual completion
      const now = new Date();
      const updatedData = data.map((activity: Activity) => {
        if (activity.status === 'pending' && activity.due_date) {
          const dueDate = new Date(activity.due_date);
          if (dueDate < now) {
            // Mark as overdue for display purposes
            return { ...activity, status: 'overdue' };
          }
        }
        return activity;
      });
      
      // Filter activities by status
      const filteredData = updatedData.filter((activity: Activity) => {
        if (filterStatus === 'all') return true;
        return activity.status === filterStatus;
      });
      
      setActivities(filteredData);
    } catch (error) {
      console.error('Error fetching activities:', error);
      toast.error('Failed to load activities');
    } finally {
      setLoading(false);
    }
  };

  // Fetch custom fields for activities
  useEffect(() => {
    const fetchCustomFields = async () => {
      try {
        const fields = await customFieldsService.getCustomFieldsForEntity('activity');
        setCustomFields(fields);
      } catch (error) {
        console.error('Failed to load custom fields:', error);
      }
    };
    fetchCustomFields();
  }, []);

  // Fetch activities
  useEffect(() => {
    fetchActivities();
  }, [filterType, filterStatus]);

  // Listen for real-time WebSocket updates
  useEffect(() => {
    const handleEntityChange = (event: any) => {
      const { entity_type, action } = event.detail;
      
      // Refresh activities when any activity is created, updated, or deleted
      if (entity_type === 'activity') {
        fetchActivities();
      }
    };

    window.addEventListener('entity_change', handleEntityChange);
    return () => window.removeEventListener('entity_change', handleEntityChange);
  }, [filterType, filterStatus]);

  const handleView = async (activity: Activity) => {
    setSelectedActivity(activity);
    
    // Load custom field values
    try {
      const values = await customFieldsService.getCustomFieldValues('activity', activity.id);
      setCustomFieldValues(values);
    } catch (error) {
      console.error('Failed to load custom field values:', error);
      setCustomFieldValues({});
    }
    
    setShowViewModal(true);
  };
  
  // Handle edit activity
  const handleEdit = async (activity: Activity) => {
    // Prevent editing completed activities
    if (activity.status === 'completed') {
      toast.error('Cannot edit completed activities');
      return;
    }
    
    setSelectedActivity(activity);
    // Convert ISO date to datetime-local format (YYYY-MM-DDTHH:MM)
    let formattedDate = '';
    if (activity.due_date) {
      const date = new Date(activity.due_date);
      // Format as YYYY-MM-DDTHH:MM for datetime-local input
      formattedDate = date.toISOString().slice(0, 16);
    }
    setActivityForm({
      type: activity.type,
      subject: activity.subject,
      description: activity.description || '',
      status: activity.status || 'pending',
      due_date: formattedDate,
      duration_minutes: activity.duration_minutes || 30,
      priority: activity.priority || 1,
    });
    
    // Load custom field values
    try {
      const values = await customFieldsService.getCustomFieldValues('activity', activity.id);
      setCustomFieldValues(values);
    } catch (error) {
      console.error('Failed to load custom field values:', error);
      setCustomFieldValues({});
    }
    
    setShowEditModal(true);
  };
  
  // Handle delete activity
  const handleDelete = (activity: Activity) => {
    setActivityToDelete(activity);
    setShowDeleteModal(true);
  };
  
  // Confirm delete activity
  const confirmDelete = async () => {
    if (!activityToDelete) return;
    
    try {
      await activitiesService.deleteActivity(activityToDelete.id);
      toast.success('Activity deleted');
      setShowDeleteModal(false);
      setActivityToDelete(null);
      fetchActivities();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to delete activity');
    }
  };
  
  // Handle complete activity
  const handleComplete = async (activity: Activity) => {
    try {
      await activitiesService.completeActivity(activity.id);
      toast.success('Activity completed');
      fetchActivities();
    } catch (error) {
      toast.error('Failed to complete activity');
    }
  };
  
  // Handle create activity
  const handleCreate = async () => {
    // Validate required fields
    if (!activityForm.subject.trim()) {
      toast.error('Subject is required');
      return;
    }

    if (!activityForm.due_date) {
      toast.error('Due date is required');
      return;
    }

    // Check for HTML/script tags in subject
    if (/<[^>]*>/gi.test(activityForm.subject)) {
      toast.error('HTML tags and script tags are not allowed in subject');
      return;
    }

    // Check for HTML/script tags in description
    if (activityForm.description && /<[^>]*>/gi.test(activityForm.description)) {
      toast.error('HTML tags and script tags are not allowed in description');
      return;
    }

    // Check character limits
    if (activityForm.subject.length > 255) {
      toast.error('Subject cannot exceed 255 characters');
      return;
    }

    if (activityForm.description && activityForm.description.length > 1000) {
      toast.error('Description cannot exceed 1000 characters');
      return;
    }

    // Validate date is not in the past
    const selectedDate = new Date(activityForm.due_date);
    const now = new Date();
    if (selectedDate < now) {
      toast.error('Due date cannot be in the past');
      return;
    }

    // Validate status vs date
    if (activityForm.status === 'overdue' && selectedDate >= now) {
      toast.error('Cannot set status as overdue for future dates');
      return;
    }

    setIsSubmitting(true);
    try {
      const newActivity = await activitiesService.createActivity(activityForm);
      
      // Save custom field values if any
      if (customFields.length > 0) {
        const customFieldValuesToSave = customFieldsService.prepareCustomFieldValues(customFields, customFieldValues);
        if (customFieldValuesToSave.length > 0) {
          await customFieldsService.setCustomFieldValues('activity', newActivity.id, customFieldValuesToSave);
        }
      }
      
      toast.success('Activity created');
      setShowAddModal(false);
      setActivityForm({
        type: 'call',
        subject: '',
        description: '',
        status: 'pending',
        due_date: '',
        duration_minutes: 30,
        priority: 1,
      });
      setCustomFieldValues({});
      fetchActivities();
    } catch (error: any) {
      console.error('Create error:', error);
      const errorDetail = error?.response?.data?.detail;
      let errorMessage = 'Failed to create activity';
      
      if (errorDetail) {
        if (typeof errorDetail === 'string') {
          errorMessage = errorDetail;
        } else if (Array.isArray(errorDetail)) {
          errorMessage = errorDetail.map((e: any) => e.msg || e).join(', ');
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle update activity
  const handleUpdate = async () => {
    if (!selectedActivity) return;
    
    // Validate required fields
    if (!activityForm.subject.trim()) {
      toast.error('Subject is required');
      return;
    }

    if (!activityForm.due_date) {
      toast.error('Due date is required');
      return;
    }

    // Check for HTML/script tags in subject
    if (/<[^>]*>/gi.test(activityForm.subject)) {
      toast.error('HTML tags and script tags are not allowed in subject');
      return;
    }

    // Check for HTML/script tags in description
    if (activityForm.description && /<[^>]*>/gi.test(activityForm.description)) {
      toast.error('HTML tags and script tags are not allowed in description');
      return;
    }

    // Check character limits
    if (activityForm.subject.length > 255) {
      toast.error('Subject cannot exceed 255 characters');
      return;
    }

    if (activityForm.description && activityForm.description.length > 1000) {
      toast.error('Description cannot exceed 1000 characters');
      return;
    }

    // Validate date is not in the past (only for pending activities)
    if (activityForm.status === 'pending') {
      const selectedDate = new Date(activityForm.due_date);
      const now = new Date();
      if (selectedDate < now) {
        toast.error('Due date cannot be in the past for pending activities');
        return;
      }
    }

    // Validate status vs date
    const selectedDate = new Date(activityForm.due_date);
    const now = new Date();
    if (activityForm.status === 'overdue' && selectedDate >= now) {
      toast.error('Cannot set status as overdue for future dates');
      return;
    }

    setIsSubmitting(true);
    try {
      await activitiesService.updateActivity(selectedActivity.id, activityForm);
      
      // Save custom field values if any
      if (customFields.length > 0) {
        const customFieldValuesToSave = customFieldsService.prepareCustomFieldValues(customFields, customFieldValues);
        if (customFieldValuesToSave.length > 0) {
          await customFieldsService.setCustomFieldValues('activity', selectedActivity.id, customFieldValuesToSave);
        }
      }
      
      toast.success('Activity updated');
      setShowEditModal(false);
      setCustomFieldValues({});
      fetchActivities();
    } catch (error: any) {
      console.error('Update error:', error);
      const errorDetail = error?.response?.data?.detail;
      let errorMessage = 'Failed to update activity';
      
      if (errorDetail) {
        if (typeof errorDetail === 'string') {
          errorMessage = errorDetail;
        } else if (Array.isArray(errorDetail)) {
          errorMessage = errorDetail.map((e: any) => e.msg || e).join(', ');
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Filter and sort activities
  const filteredActivities = activities
    .filter(activity => {
      // Status filter (after overdue conversion)
      if (filterStatus !== 'all' && activity.status !== filterStatus) {
        return false;
      }
      
      // Search filter
      if (!searchQuery.trim()) return true;
      
      const query = searchQuery.toLowerCase().trim();
      const subject = activity.subject?.toLowerCase() || '';
      const description = activity.description?.toLowerCase() || '';
      const type = activity.type?.toLowerCase() || '';
      
      return subject.includes(query) || description.includes(query) || type.includes(query);
    });

  // Pagination
  const itemsPerPage = 15;
  const totalPages = Math.ceil(filteredActivities.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedActivities = filteredActivities.slice(startIndex, endIndex);

  // Reset to page 1 when search/filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterType, filterStatus]);

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      // Show date only (no time)
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric'
      });
    } catch (error) {
      console.error('Date formatting error:', error, dateString);
      return 'N/A';
    }
  };

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="px-4 sm:px-6 lg:max-w-7xl xl:max-w-8xl 2xl:max-w-9xl 3xl:max-w-10xl lg:mx-auto lg:px-8">
          <div className="py-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold leading-7 text-gray-900">Activities</h1>
              <p className="mt-1 text-sm text-gray-500">
                Manage your tasks, calls, meetings, and emails
              </p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Activity
            </button>
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
              placeholder="Search activities..."
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
              <>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 min-w-[120px]"
                >
                  <option value="all">All Types</option>
                  <option value="call">Call</option>
                  <option value="meeting">Meeting</option>
                  <option value="email">Email</option>
                  <option value="task">Task</option>
                </select>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 min-w-[130px]"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                  <option value="overdue">Overdue</option>
                </select>
              </>
            )}
          </div>
        </div>

        {/* Activities Table */}
        <div className="mt-6 bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading activities...</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedActivities.map((activity) => (
                    <tr key={activity.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          activity.type === 'call' ? 'bg-blue-100 text-blue-800' :
                          activity.type === 'meeting' ? 'bg-purple-100 text-purple-800' :
                          activity.type === 'email' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {capitalize(activity.type)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 truncate max-w-xs" title={activity.subject}>
                          {activity.subject}
                        </div>
                        <div className="text-sm text-gray-500 truncate max-w-xs" title={activity.description}>
                          {activity.description}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="truncate max-w-[150px]" title={activity.owner_name}>
                          {activity.owner_name || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        <div className="truncate max-w-[150px]" title={activity.company_name}>
                          {activity.company_name || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(activity.due_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          activity.status === 'completed' ? 'bg-green-100 text-green-800' :
                          activity.status === 'overdue' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {capitalize(activity.status || '')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {activity.status !== 'completed' && (
                            <button
                              onClick={() => handleComplete(activity)}
                              className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                              title="Complete"
                            >
                              <CheckCircleIcon className="h-4 w-4" />
                            </button>
                          )}
                          <ActionButtons
                            onView={() => handleView(activity)}
                            onEdit={() => handleEdit(activity)}
                            onDelete={() => handleDelete(activity)}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredActivities.length === 0 && (
                <div className="p-12 text-center">
                  <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No activities</h3>
                  <p className="mt-1 text-sm text-gray-500">Get started by creating a new activity.</p>
                </div>
              )}
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-gray-200">
                {paginatedActivities.length > 0 ? (
                  paginatedActivities.map((activity) => (
                    <div key={activity.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              activity.type === 'call' ? 'bg-blue-100 text-blue-800' :
                              activity.type === 'meeting' ? 'bg-purple-100 text-purple-800' :
                              activity.type === 'email' ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {capitalize(activity.type)}
                            </span>
                            <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              activity.status === 'completed' ? 'bg-green-100 text-green-800' :
                              activity.status === 'overdue' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {capitalize(activity.status || '')}
                            </span>
                          </div>
                          <h3 className="text-sm font-medium text-gray-900 truncate" title={activity.subject}>
                            {activity.subject}
                          </h3>
                          {activity.description && (
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2" title={activity.description}>
                              {activity.description}
                            </p>
                          )}
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
                            {activity.owner_name && (
                              <div className="flex items-center max-w-[140px]" title={activity.owner_name}>
                                <svg className="h-3 w-3 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                <span className="truncate">{activity.owner_name}</span>
                              </div>
                            )}
                            {activity.company_name && (
                              <div className="flex items-center max-w-[140px]" title={activity.company_name}>
                                <svg className="h-3 w-3 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                                <span className="truncate">{activity.company_name}</span>
                              </div>
                            )}
                            <div className="flex items-center">
                              <CalendarIcon className="h-3 w-3 mr-1" />
                              {formatDate(activity.due_date)}
                            </div>
                          </div>
                        </div>
                        <div className="ml-3 flex flex-col gap-1">
                          {activity.status !== 'completed' && (
                            <button
                              onClick={() => handleComplete(activity)}
                              className="p-2 text-gray-400 hover:text-green-600 rounded-lg hover:bg-green-50"
                              title="Complete"
                            >
                              <CheckCircleIcon className="h-5 w-5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleView(activity)}
                            className="p-2 text-gray-400 hover:text-primary-600 rounded-lg hover:bg-gray-100"
                            title="View"
                          >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleEdit(activity)}
                            className="p-2 text-gray-400 hover:text-primary-600 rounded-lg hover:bg-gray-100"
                            title="Edit"
                          >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(activity)}
                            className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-100"
                            title="Delete"
                          >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No activities</h3>
                    <p className="mt-1 text-sm text-gray-500">Get started by creating a new activity.</p>
                  </div>
                )}
              </div>
            </>
          )}
          {filteredActivities.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              itemsPerPage={itemsPerPage}
              totalItems={filteredActivities.length}
            />
          )}
        </div>
      </div>

      {/* Add Activity Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto p-6 border w-full max-w-md shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Add New Activity</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Activity Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={activityForm.type}
                  onChange={(e) => setActivityForm({...activityForm, type: e.target.value})}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="call">Call</option>
                  <option value="meeting">Meeting</option>
                  <option value="email">Email</option>
                  <option value="task">Task</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Subject"
                  value={activityForm.subject}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (!/<[^>]*>/gi.test(value)) {
                      setActivityForm({...activityForm, subject: value});
                    } else {
                      toast.error('HTML tags are not allowed');
                    }
                  }}
                  onPaste={(e) => {
                    const pastedText = e.clipboardData.getData('text');
                    if (/<[^>]*>/gi.test(pastedText)) {
                      e.preventDefault();
                      toast.error('HTML tags are not allowed');
                    }
                  }}
                  maxLength={255}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                <div className="text-xs text-gray-500 mt-1">
                  {activityForm.subject.length}/255 characters
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  placeholder="Description (optional)"
                  value={activityForm.description}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (!/<[^>]*>/gi.test(value)) {
                      setActivityForm({...activityForm, description: value});
                    } else {
                      toast.error('HTML tags are not allowed');
                    }
                  }}
                  onPaste={(e) => {
                    const pastedText = e.clipboardData.getData('text');
                    if (/<[^>]*>/gi.test(pastedText)) {
                      e.preventDefault();
                      toast.error('HTML tags are not allowed');
                    }
                  }}
                  maxLength={1000}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                <div className="text-xs text-gray-500 mt-1">
                  {activityForm.description.length}/1000 characters
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Due Date <span className="text-red-500">*</span></label>
                <input
                  type="datetime-local"
                  value={activityForm.due_date}
                  onChange={(e) => setActivityForm({...activityForm, due_date: e.target.value})}
                  onClick={(e) => e.currentTarget.showPicker?.()}
                  min={new Date().toISOString().slice(0, 16)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 cursor-pointer"
                />
                <p className="text-xs text-gray-500 mt-1">Select future date and time (past dates not allowed)</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  placeholder="Duration (minutes)"
                  value={activityForm.duration_minutes || ''}
                  onChange={(e) => setActivityForm({...activityForm, duration_minutes: parseInt(e.target.value) || 0})}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <select
                  value={activityForm.priority}
                  onChange={(e) => setActivityForm({...activityForm, priority: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value={0}>Low Priority</option>
                  <option value={1}>Medium Priority</option>
                  <option value={2}>High Priority</option>
                </select>
              </div>
              
              {/* Custom Fields */}
              <CustomFieldsForm
                customFields={customFields}
                values={customFieldValues}
                onChange={(fieldKey, value) => setCustomFieldValues({...customFieldValues, [fieldKey]: value})}
              />
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Creating...' : 'Create Activity'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Activity Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto p-6 border w-full max-w-md shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Edit Activity</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Activity Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={activityForm.type}
                  onChange={(e) => setActivityForm({...activityForm, type: e.target.value})}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="call">Call</option>
                  <option value="meeting">Meeting</option>
                  <option value="email">Email</option>
                  <option value="task">Task</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Subject"
                  value={activityForm.subject}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (!/<[^>]*>/gi.test(value)) {
                      setActivityForm({...activityForm, subject: value});
                    } else {
                      toast.error('HTML tags are not allowed');
                    }
                  }}
                  onPaste={(e) => {
                    const pastedText = e.clipboardData.getData('text');
                    if (/<[^>]*>/gi.test(pastedText)) {
                      e.preventDefault();
                      toast.error('HTML tags are not allowed');
                    }
                  }}
                  maxLength={255}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                <div className="text-xs text-gray-500 mt-1">
                  {activityForm.subject.length}/255 characters
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  placeholder="Description (optional)"
                  value={activityForm.description}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (!/<[^>]*>/gi.test(value)) {
                      setActivityForm({...activityForm, description: value});
                    } else {
                      toast.error('HTML tags are not allowed');
                    }
                  }}
                  onPaste={(e) => {
                    const pastedText = e.clipboardData.getData('text');
                    if (/<[^>]*>/gi.test(pastedText)) {
                      e.preventDefault();
                      toast.error('HTML tags are not allowed');
                    }
                  }}
                  maxLength={1000}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                <div className="text-xs text-gray-500 mt-1">
                  {activityForm.description.length}/1000 characters
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Due Date <span className="text-red-500">*</span></label>
                <input
                  type="datetime-local"
                  value={activityForm.due_date}
                  onChange={(e) => setActivityForm({...activityForm, due_date: e.target.value})}
                  onClick={(e) => e.currentTarget.showPicker?.()}
                  min={new Date().toISOString().slice(0, 16)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 cursor-pointer"
                />
                <p className="text-xs text-gray-500 mt-1">Select future date and time (past dates not allowed)</p>
              </div>
              
              {/* Custom Fields */}
              <CustomFieldsForm
                customFields={customFields}
                values={customFieldValues}
                onChange={(fieldKey, value) => setCustomFieldValues({...customFieldValues, [fieldKey]: value})}
              />
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdate}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && selectedActivity && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto p-6 border w-full max-w-md shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Activity Details</h3>
              <button onClick={() => setShowViewModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">Type</label>
                <p className="text-gray-900 capitalize">{selectedActivity.type}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Subject</label>
                <p className="text-gray-900 break-words">{selectedActivity.subject}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Description</label>
                <p className="text-gray-900 break-words whitespace-pre-wrap max-h-48 overflow-y-auto">{selectedActivity.description || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Due Date</label>
                <p className="text-gray-900">{formatDate(selectedActivity.due_date)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Status</label>
                <p className="text-gray-900 capitalize">{selectedActivity.status}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Duration</label>
                <p className="text-gray-900">{selectedActivity.duration_minutes ? `${selectedActivity.duration_minutes} minutes` : 'N/A'}</p>
              </div>
              
              {/* Custom Fields */}
              <CustomFieldsDisplay
                customFields={customFields}
                values={customFieldValues}
              />
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && activityToDelete && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto p-6 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Delete Activity</h3>
              <button 
                onClick={() => {
                  setShowDeleteModal(false);
                  setActivityToDelete(null);
                }} 
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="mb-6">
              <p className="text-sm text-gray-600">
                Are you sure you want to delete the activity <span className="font-semibold">"{activityToDelete.subject}"</span>?
              </p>
              <p className="text-sm text-red-600 mt-2">
                This action cannot be undone.
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setActivityToDelete(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
