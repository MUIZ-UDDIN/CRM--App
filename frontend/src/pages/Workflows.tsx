import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import * as workflowsService from '../services/workflowsService';
import Pagination from '../components/Pagination';
import ActionButtons from '../components/common/ActionButtons';
import { 
  BoltIcon, 
  PlusIcon, 
  MagnifyingGlassIcon,
  XMarkIcon,
  PlayIcon,
  PauseIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';

interface Workflow {
  id: string;
  name: string;
  description: string;
  trigger: string;
  status: 'active' | 'inactive';
  is_running?: boolean; // Track if workflow is currently running
  actions_count: number;
  executions_count: number;
  last_run?: string;
  created_at: string;
}

export default function Workflows() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showAddModal, setShowAddModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [workflowToDelete, setWorkflowToDelete] = useState<Workflow | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showFilters, setShowFilters] = useState(true);
  const [loading, setLoading] = useState(false);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [workflowForm, setWorkflowForm] = useState({
    name: '',
    description: '',
    trigger: 'contact_created',
    status: 'inactive',
  });
  const [isCreating, setIsCreating] = useState(false);

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

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async () => {
    setLoading(true);
    try {
      const data = await workflowsService.getWorkflows();
      // Map backend data and initialize is_running to false (workflows start in stopped state)
      const mappedWorkflows = data.map((workflow: any) => ({
        ...workflow,
        is_running: false // All workflows start in stopped state, user must click Play
      }));
      console.log('Fetched workflows:', mappedWorkflows); // Debug log
      setWorkflows(mappedWorkflows);
    } catch (error) {
      console.error('Error fetching workflows:', error);
      toast.error('Failed to load workflows');
      setWorkflows([]);
    } finally {
      setLoading(false);
    }
  };

  const clearForm = () => {
    setWorkflowForm({
      name: '',
      description: '',
      trigger: 'contact_created',
      status: 'inactive',
    });
  };

  const handleOpenAddModal = () => {
    clearForm();
    setSelectedWorkflow(null);
    setShowAddModal(true);
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
    clearForm();
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    clearForm();
    setSelectedWorkflow(null);
  };

  const handleView = (workflow: Workflow) => {
    setSelectedWorkflow(workflow);
    setShowViewModal(true);
  };

  const handleEdit = (workflow: Workflow) => {
    setSelectedWorkflow(workflow);
    setWorkflowForm({
      name: workflow.name,
      description: workflow.description,
      trigger: workflow.trigger,
      status: workflow.status,
    });
    setShowEditModal(true);
  };

  const handleDelete = (workflow: Workflow) => {
    setWorkflowToDelete(workflow);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!workflowToDelete) return;
    try {
      await workflowsService.deleteWorkflow(workflowToDelete.id);
      toast.success('Workflow deleted successfully');
      setShowDeleteModal(false);
      setWorkflowToDelete(null);
      fetchWorkflows();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(error?.response?.data?.detail || 'Failed to delete workflow');
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setWorkflowToDelete(null);
  };

  const handleToggleStatus = async (workflow: Workflow) => {
    // For active workflows, toggle is_running (start/stop)
    if (workflow.status === 'active') {
      const newRunningState = !workflow.is_running;
      try {
        await workflowsService.toggleWorkflow(workflow.id, newRunningState);
        toast.success(`Workflow ${newRunningState ? 'started' : 'stopped'}`);
        
        // Update local state instead of refetching
        setWorkflows(prevWorkflows => 
          prevWorkflows.map(w => 
            w.id === workflow.id 
              ? { ...w, is_running: newRunningState }
              : w
          )
        );
      } catch (error: any) {
        console.error('Toggle error:', error);
        const errorMessage = error?.response?.data?.detail || error?.message || 'Failed to update workflow status';
        toast.error(errorMessage);
      }
    }
  };

  const handleRunWorkflow = async (workflow: Workflow) => {
    if (workflow.actions_count === 0) {
      toast.error('Cannot run workflow without actions. Please add actions first.');
      return;
    }

    try {
      const result = await workflowsService.executeWorkflow(workflow.id);
      toast.success(`Workflow executed successfully! ${result.success_count || 0} actions completed.`);
      fetchWorkflows(); // Refresh to update execution count
    } catch (error: any) {
      console.error('Execute error:', error);
      const errorMessage = error?.response?.data?.detail || error?.message || 'Failed to execute workflow';
      toast.error(errorMessage);
    }
  };

  const handleCreate = async () => {
    if (isCreating) return;
    
    // Validate workflow name
    if (!workflowForm.name.trim()) {
      toast.error('Please enter a workflow name');
      return;
    }

    // Check for duplicate workflow name
    const duplicateWorkflow = workflows.find(
      w => w.name.toLowerCase().trim() === workflowForm.name.toLowerCase().trim()
    );
    if (duplicateWorkflow) {
      toast.error('A workflow with this name already exists. Please use a different name.');
      return;
    }

    // Check for HTML/script tags
    if (/<[^>]*>/gi.test(workflowForm.name)) {
      toast.error('HTML tags and script tags are not allowed in workflow name');
      return;
    }

    // Check name length
    if (workflowForm.name.length > 255) {
      toast.error('Workflow name cannot exceed 255 characters');
      return;
    }

    // Check description length
    if (workflowForm.description.length > 1000) {
      toast.error('Description cannot exceed 1000 characters');
      return;
    }

    setIsCreating(true);
    try {
      await workflowsService.createWorkflow({
        name: workflowForm.name,
        description: workflowForm.description,
        trigger_type: workflowForm.trigger,
        is_active: workflowForm.status === 'active',
      });
      toast.success('Workflow created successfully');
      handleCloseAddModal();
      fetchWorkflows();
    } catch (error: any) {
      console.error('Create error:', error);
      toast.error(error?.response?.data?.detail || 'Failed to create workflow');
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedWorkflow) return;

    // Validate workflow name
    if (!workflowForm.name.trim()) {
      toast.error('Please enter a workflow name');
      return;
    }

    // Check for duplicate workflow name (excluding current workflow)
    const duplicateWorkflow = workflows.find(
      w => w.id !== selectedWorkflow.id && 
      w.name.toLowerCase().trim() === workflowForm.name.toLowerCase().trim()
    );
    if (duplicateWorkflow) {
      toast.error('A workflow with this name already exists. Please use a different name.');
      return;
    }

    // Check for HTML/script tags
    if (/<[^>]*>/gi.test(workflowForm.name)) {
      toast.error('HTML tags and script tags are not allowed in workflow name');
      return;
    }

    // Check name length
    if (workflowForm.name.length > 255) {
      toast.error('Workflow name cannot exceed 255 characters');
      return;
    }

    // Check description length
    if (workflowForm.description.length > 1000) {
      toast.error('Description cannot exceed 1000 characters');
      return;
    }

    try {
      await workflowsService.updateWorkflow(selectedWorkflow.id, {
        name: workflowForm.name,
        description: workflowForm.description,
        trigger_type: workflowForm.trigger,
        is_active: workflowForm.status === 'active',
      });
      toast.success('Workflow updated successfully');
      handleCloseEditModal();
      fetchWorkflows();
    } catch (error: any) {
      console.error('Update error:', error);
      toast.error(error?.response?.data?.detail || 'Failed to update workflow');
    }
  };

  const filteredWorkflows = workflows.filter(workflow => {
    // Search filter
    const matchesSearch = searchQuery.trim() === '' || 
      workflow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      workflow.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      workflow.trigger.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Status filter
    const matchesStatus = filterStatus === 'all' || workflow.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  // Pagination
  const itemsPerPage = 15;
  const totalPages = Math.ceil(filteredWorkflows.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedWorkflows = filteredWorkflows.slice(startIndex, endIndex);

  // Reset to page 1 when search/filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="px-4 sm:px-6 lg:max-w-7xl xl:max-w-8xl 2xl:max-w-9xl 3xl:max-w-10xl lg:mx-auto lg:px-8">
          <div className="py-4 sm:py-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
            <div>
              <h1 className="text-2xl font-bold leading-7 text-gray-900">Workflow Automation</h1>
              <p className="mt-1 text-sm text-gray-500">
                Automate your sales processes with custom workflows
              </p>
            </div>
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Create Workflow
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 sm:px-6 lg:max-w-7xl lg:mx-auto lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search workflows..."
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
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 min-w-[140px]"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            )}
          </div>
        </div>

        {/* Workflows List */}
        {loading ? (
          <div className="p-12 text-center bg-white rounded-lg shadow">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading workflows...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {paginatedWorkflows.map((workflow) => (
              <div key={workflow.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  {/* Workflow Info */}
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <h3 className="text-lg font-semibold text-gray-900 break-words">{workflow.name}</h3>
                        <p className="text-sm text-gray-600 mt-1 break-words overflow-wrap-anywhere line-clamp-2">{workflow.description}</p>
                      </div>
                      <span className={`ml-3 inline-flex px-3 py-1 text-xs font-semibold rounded-full flex-shrink-0 ${
                        workflow.status === 'active' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {workflow.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-3 sm:mt-4">
                      <div>
                        <p className="text-xs text-gray-500">Trigger</p>
                        <p className="text-sm font-medium text-gray-900">{workflow.trigger}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Actions</p>
                        <p className="text-sm font-medium text-gray-900">{workflow.actions_count}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Executions</p>
                        <p className="text-sm font-medium text-gray-900">{workflow.executions_count}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Last Run</p>
                        <p className="text-sm font-medium text-gray-900">{formatDate(workflow.last_run)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Run/Execute Button */}
                    {workflow.actions_count > 0 && (
                      <button
                        onClick={() => handleRunWorkflow(workflow)}
                        className="p-2 rounded-lg transition-colors text-blue-600 hover:bg-blue-50"
                        title="Run Workflow"
                      >
                        <BoltIcon className="h-5 w-5" />
                      </button>
                    )}
                    
                    {/* Play/Stop Buttons - Only show when status is Active */}
                    {workflow.status === 'active' && workflow.actions_count > 0 && (
                      <>
                        {workflow.is_running ? (
                          <button
                            onClick={() => handleToggleStatus(workflow)}
                            className="p-2 rounded-lg transition-colors text-red-600 hover:bg-red-50"
                            title="Stop Workflow"
                          >
                            <PauseIcon className="h-5 w-5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleToggleStatus(workflow)}
                            className="p-2 rounded-lg transition-colors text-green-600 hover:bg-green-50"
                            title="Start Workflow"
                          >
                            <PlayIcon className="h-5 w-5" />
                          </button>
                        )}
                      </>
                    )}
                    <ActionButtons
                      onView={() => handleView(workflow)}
                      onEdit={() => handleEdit(workflow)}
                      onDelete={() => handleDelete(workflow)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredWorkflows.length === 0 && !loading && (
          <div className="p-12 text-center bg-white rounded-lg shadow">
            <BoltIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No workflows</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating your first workflow.</p>
          </div>
        )}

        {/* Pagination */}
        {filteredWorkflows.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredWorkflows.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      {/* Add Workflow Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Create Workflow</h3>
              <button onClick={handleCloseAddModal} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Workflow Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter workflow name"
                  value={workflowForm.name}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (!/<[^>]*>/gi.test(value)) {
                      setWorkflowForm({...workflowForm, name: value});
                    } else {
                      toast.error('HTML tags are not allowed in workflow name');
                    }
                  }}
                  onPaste={(e) => {
                    const pastedText = e.clipboardData.getData('text');
                    if (/<[^>]*>/gi.test(pastedText)) {
                      e.preventDefault();
                      toast.error('HTML tags are not allowed in workflow name');
                    }
                  }}
                  maxLength={255}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                  required
                />
                <div className="text-xs text-gray-500 mt-1">
                  {workflowForm.name.length}/255 characters
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  placeholder="Enter description (optional)"
                  value={workflowForm.description}
                  onChange={(e) => setWorkflowForm({...workflowForm, description: e.target.value})}
                  rows={3}
                  maxLength={1000}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                <div className="text-xs text-gray-500 mt-1">
                  {workflowForm.description.length}/1000 characters
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Trigger <span className="text-red-500">*</span>
                </label>
                <select
                  value={workflowForm.trigger}
                  onChange={(e) => setWorkflowForm({...workflowForm, trigger: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                  required
                >
                  <option value="contact_created">Contact Created</option>
                  <option value="deal_created">Deal Created</option>
                  <option value="deal_stage_changed">Deal Stage Changed</option>
                  <option value="deal_won">Deal Won</option>
                  <option value="deal_lost">Deal Lost</option>
                  <option value="activity_completed">Activity Completed</option>
                  <option value="email_opened">Email Opened</option>
                  <option value="document_signed">Document Signed</option>
                  <option value="scheduled">Scheduled (Time-based)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={workflowForm.status}
                  onChange={(e) => setWorkflowForm({...workflowForm, status: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="inactive">Inactive</option>
                  <option value="active">Active</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Set to Active to start executing this workflow automatically
                </p>
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
                  disabled={isCreating}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreating ? 'Creating...' : 'Create Workflow'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Workflow Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Edit Workflow</h3>
              <button onClick={handleCloseEditModal} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Workflow Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter workflow name"
                  value={workflowForm.name}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (!/<[^>]*>/gi.test(value)) {
                      setWorkflowForm({...workflowForm, name: value});
                    } else {
                      toast.error('HTML tags are not allowed in workflow name');
                    }
                  }}
                  onPaste={(e) => {
                    const pastedText = e.clipboardData.getData('text');
                    if (/<[^>]*>/gi.test(pastedText)) {
                      e.preventDefault();
                      toast.error('HTML tags are not allowed in workflow name');
                    }
                  }}
                  maxLength={255}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                  required
                />
                <div className="text-xs text-gray-500 mt-1">
                  {workflowForm.name.length}/255 characters
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  placeholder="Enter description (optional)"
                  value={workflowForm.description}
                  onChange={(e) => setWorkflowForm({...workflowForm, description: e.target.value})}
                  rows={3}
                  maxLength={1000}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                <div className="text-xs text-gray-500 mt-1">
                  {workflowForm.description.length}/1000 characters
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Trigger <span className="text-red-500">*</span>
                </label>
                <select
                  value={workflowForm.trigger}
                  onChange={(e) => setWorkflowForm({...workflowForm, trigger: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                  required
                >
                  <option value="contact_created">Contact Created</option>
                  <option value="deal_created">Deal Created</option>
                  <option value="deal_stage_changed">Deal Stage Changed</option>
                  <option value="deal_won">Deal Won</option>
                  <option value="deal_lost">Deal Lost</option>
                  <option value="activity_completed">Activity Completed</option>
                  <option value="email_opened">Email Opened</option>
                  <option value="document_signed">Document Signed</option>
                  <option value="scheduled">Scheduled (Time-based)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={workflowForm.status}
                  onChange={(e) => setWorkflowForm({...workflowForm, status: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="inactive">Inactive</option>
                  <option value="active">Active</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Set to Active to start executing this workflow automatically
                </p>
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
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Workflow Modal */}
      {showViewModal && selectedWorkflow && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto border w-full max-w-2xl shadow-lg rounded-md bg-white max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 bg-white border-b sticky top-0 z-10">
              <h3 className="text-lg font-medium text-gray-900">Workflow Details</h3>
              <button onClick={() => setShowViewModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Name</label>
                <p className="text-gray-900 break-words overflow-wrap-anywhere">{selectedWorkflow.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Description</label>
                <p className="text-gray-900 whitespace-pre-wrap break-words overflow-wrap-anywhere max-w-full">{selectedWorkflow.description || 'No description'}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Trigger</label>
                  <p className="text-gray-900">{selectedWorkflow.trigger}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                    selectedWorkflow.status === 'active' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedWorkflow.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Actions Count</label>
                  <p className="text-gray-900">{selectedWorkflow.actions_count}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Total Executions</label>
                  <p className="text-gray-900">{selectedWorkflow.executions_count}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Last Run</label>
                  <p className="text-gray-900">{formatDate(selectedWorkflow.last_run)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Created</label>
                  <p className="text-gray-900">{formatDate(selectedWorkflow.created_at)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && workflowToDelete && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-red-900">Delete Workflow</h3>
              <button onClick={cancelDelete} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">
                  Are you sure you want to delete the workflow <strong>"{workflowToDelete.name}"</strong>?
                </p>
                <p className="text-sm text-red-600 mt-2">
                  This action cannot be undone.
                </p>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={cancelDelete}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                >
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
