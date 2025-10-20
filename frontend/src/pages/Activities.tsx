import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import * as activitiesService from '../services/activitiesService';
import ActionButtons from '../components/common/ActionButtons';
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
      setActivities(data);
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
    setSelectedActivity(activity);
    setActivityForm({
      type: activity.type,
      subject: activity.subject,
      description: activity.description || '',
      status: activity.status || 'pending',
      due_date: activity.due_date || '',
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
    } catch (error) {
      toast.error('Failed to create activity');
    }
  };
  
  // Handle update activity
  const handleUpdate = async () => {
    if (!selectedActivity) return;
    
    try {
      await activitiesService.updateActivity(selectedActivity.id, activityForm);
      toast.success('Activity updated');
      setShowEditModal(false);
      fetchActivities();
    } catch (error) {
      toast.error('Failed to update activity');
    }
  };
  
  // Filter activities
  const filteredActivities = activities.filter(activity => {
    const matchesSearch = 
      activity.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (activity.description && activity.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesSearch;
  });

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="px-4 sm:px-6 lg:max-w-7xl lg:mx-auto lg:px-8">
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
      <div className="px-4 sm:px-6 lg:max-w-7xl lg:mx-auto lg:px-8 py-6">
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
            <div className="overflow-x-auto">
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
                  {filteredActivities.map((activity) => (
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
          )}
        </div>
      </div>

      {/* Add Activity Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Add New Activity</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <select
                value={activityForm.type}
                onChange={(e) => setActivityForm({...activityForm, type: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="call">Call</option>
                <option value="meeting">Meeting</option>
                <option value="email">Email</option>
                <option value="task">Task</option>
              </select>
              <input
                type="text"
                placeholder="Subject"
                value={activityForm.subject}
                onChange={(e) => setActivityForm({...activityForm, subject: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <textarea
                placeholder="Description"
                value={activityForm.description}
                onChange={(e) => setActivityForm({...activityForm, description: e.target.value})}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <input
                type="datetime-local"
                value={activityForm.due_date}
                onChange={(e) => setActivityForm({...activityForm, due_date: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <input
                type="number"
                placeholder="Duration (minutes)"
                value={activityForm.duration_minutes}
                onChange={(e) => setActivityForm({...activityForm, duration_minutes: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <select
                value={activityForm.priority}
                onChange={(e) => setActivityForm({...activityForm, priority: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value={0}>Low Priority</option>
                <option value={1}>Medium Priority</option>
                <option value={2}>High Priority</option>
              </select>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
                >
                  Create Activity
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Activity Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Edit Activity</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <select
                value={activityForm.type}
                onChange={(e) => setActivityForm({...activityForm, type: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="call">Call</option>
                <option value="meeting">Meeting</option>
                <option value="email">Email</option>
                <option value="task">Task</option>
              </select>
              <input
                type="text"
                placeholder="Subject"
                value={activityForm.subject}
                onChange={(e) => setActivityForm({...activityForm, subject: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <textarea
                placeholder="Description"
                value={activityForm.description}
                onChange={(e) => setActivityForm({...activityForm, description: e.target.value})}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <input
                type="datetime-local"
                value={activityForm.due_date}
                onChange={(e) => setActivityForm({...activityForm, due_date: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
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
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Activity Modal */}
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
