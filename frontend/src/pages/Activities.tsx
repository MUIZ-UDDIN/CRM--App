import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import * as activitiesService from '../services/activitiesService';
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
  contact_id?: string;
  deal_id?: string;
  priority?: number;
}

export default function Activities() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
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
  
  // Prevent background scroll when modals are open
  useEffect(() => {
    if (showAddModal || showEditModal || showViewModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showAddModal, showEditModal, showViewModal]);
  
  // Check for action query parameter
  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'add') {
      setShowAddModal(true);
      searchParams.delete('action');
      setSearchParams(searchParams);
    }
  }, [searchParams]);

  // Fetch activities
  useEffect(() => {
    fetchActivities();
  }, [filterType, filterStatus]);
  
  const fetchActivities = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filterType !== 'all') params.type = filterType;
      if (filterStatus !== 'all') params.status = filterStatus;
      
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
      
      setActivities(updatedData);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load activities');
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle view activity
  const handleView = (activity: Activity) => {
    setSelectedActivity(activity);
    setShowViewModal(true);
  };
  
  // Handle edit activity
  const handleEdit = (activity: Activity) => {
    // Prevent editing completed activities
    if (activity.status === 'completed') {
      toast.error('Cannot edit completed activities');
      return;
    }
    
    setSelectedActivity(activity);
    // Convert ISO date to date format (YYYY-MM-DD)
    let formattedDate = '';
    if (activity.due_date) {
      const date = new Date(activity.due_date);
      formattedDate = date.toISOString().slice(0, 10);
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
    setShowEditModal(true);
  };
  
  // Handle delete activity
  const handleDelete = async (activity: Activity) => {
    if (!confirm(`Delete activity "${activity.subject}"?`)) return;
    
    try {
      await activitiesService.deleteActivity(activity.id);
      toast.success('Activity deleted');
      fetchActivities();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(error?.response?.data?.detail || error?.message || 'Failed to delete activity');
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
      await activitiesService.createActivity(activityForm);
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
      toast.success('Activity updated');
      setShowEditModal(false);
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
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
                          {activity.type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{activity.subject}</div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">{activity.description}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(activity.due_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {activity.duration_minutes ? `${activity.duration_minutes} min` : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          activity.status === 'completed' ? 'bg-green-100 text-green-800' :
                          activity.status === 'overdue' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {activity.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {activity.priority === 2 ? 'High' : activity.priority === 1 ? 'Medium' : 'Low'}
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
                              {activity.type}
                            </span>
                            <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              activity.status === 'completed' ? 'bg-green-100 text-green-800' :
                              activity.status === 'overdue' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {activity.status}
                            </span>
                          </div>
                          <h3 className="text-sm font-medium text-gray-900">
                            {activity.subject}
                          </h3>
                          {activity.description && (
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{activity.description}</p>
                          )}
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
                            <div className="flex items-center">
                              <CalendarIcon className="h-3 w-3 mr-1" />
                              {formatDate(activity.due_date)}
                            </div>
                            {activity.duration_minutes && (
                              <div className="flex items-center">
                                <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {activity.duration_minutes} min
                              </div>
                            )}
                            <div className="flex items-center">
                              <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
                              </svg>
                              {activity.priority === 2 ? 'High' : activity.priority === 1 ? 'Medium' : 'Low'}
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
          <div className="relative mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Add New Activity</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date <span className="text-red-500">*</span></label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
          <div className="relative mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Edit Activity</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date <span className="text-red-500">*</span></label>
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
          <div className="relative mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
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
                <p className="text-gray-900">{selectedActivity.subject}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Description</label>
                <p className="text-gray-900">{selectedActivity.description || 'N/A'}</p>
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
