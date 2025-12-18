import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  PlusIcon, 
  RocketLaunchIcon,
  SparklesIcon,
  TagIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import apiClient from '../services/apiClient';
import toast from 'react-hot-toast';
import { handleApiError } from '../utils/errorHandler';

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  trigger_type: string;
  is_global: boolean;
  usage_count: number;
  tags: string[];
}

const CATEGORIES = [
  { value: 'sales', label: 'Sales', icon: '💼', color: 'blue' },
  { value: 'marketing', label: 'Marketing', icon: '📢', color: 'purple' },
  { value: 'support', label: 'Support', icon: '🎧', color: 'green' },
  { value: 'onboarding', label: 'Onboarding', icon: '🚀', color: 'indigo' },
  { value: 'follow_up', label: 'Follow Up', icon: '📧', color: 'yellow' },
  { value: 'general', label: 'General', icon: '⚙️', color: 'gray' }
];

export default function WorkflowTemplates() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isCompanyAdmin, isSuperAdmin, isSalesManager } = usePermissions();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [workflowName, setWorkflowName] = useState('');
  const [existingWorkflows, setExistingWorkflows] = useState<string[]>([]);
  const [nameError, setNameError] = useState('');
  
  // Create Template Modal State
  const [showCreateTemplateModal, setShowCreateTemplateModal] = useState(false);
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    category: 'general',
    trigger_type: 'contact_created',
    tags: [] as string[],
    is_global: true
  });
  const [templateNameError, setTemplateNameError] = useState('');
  const [tagInput, setTagInput] = useState('');
  
  // Check if user can manage automations
  const canManageAutomations = isSuperAdmin() || isCompanyAdmin() || isSalesManager();

  useEffect(() => {
    fetchTemplates();
    fetchExistingWorkflows();
  }, [filterCategory]);

  const fetchExistingWorkflows = async () => {
    try {
      const response = await apiClient.get('/workflows');
      const workflowNames = response.data.map((w: any) => w.name.toLowerCase().trim());
      setExistingWorkflows(workflowNames);
    } catch (error) {
      console.error('Failed to fetch workflows:', error);
    }
  };

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filterCategory !== 'all') params.category = filterCategory;
      if (searchTerm) params.search = searchTerm;
      
      const response = await apiClient.get('/workflow-templates/', { params });
      setTemplates(response.data);
    } catch (error) {
      handleApiError(error, { toastMessage: 'Failed to load templates' });
    } finally {
      setLoading(false);
    }
  };

  const openTemplateModal = (template: Template) => {
    setSelectedTemplate(template);
    setWorkflowName('');
    setNameError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedTemplate(null);
    setWorkflowName('');
    setNameError('');
  };

  const validateWorkflowName = (name: string): boolean => {
    const trimmedName = name.trim();
    
    if (!trimmedName) {
      setNameError('Workflow name is required');
      return false;
    }
    
    if (trimmedName.length < 3) {
      setNameError('Workflow name must be at least 3 characters');
      return false;
    }
    
    // Check for duplicate name (case-insensitive)
    if (existingWorkflows.includes(trimmedName.toLowerCase())) {
      setNameError('A workflow with this name already exists. Please choose a different name.');
      return false;
    }
    
    setNameError('');
    return true;
  };

  const handleWorkflowNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setWorkflowName(value);
    
    // Clear error when user starts typing
    if (nameError) {
      setNameError('');
    }
  };

  const createWorkflowFromTemplate = async () => {
    if (!selectedTemplate || !validateWorkflowName(workflowName)) {
      return;
    }

    try {
      const response = await apiClient.post(`/workflow-templates/${selectedTemplate.id}/use`, null, {
        params: { workflow_name: workflowName.trim() }
      });
      toast.success('Workflow created successfully!');
      closeModal();
      // Refresh existing workflows list
      fetchExistingWorkflows();
    } catch (error) {
      handleApiError(error, { toastMessage: 'Failed to create workflow' });
    }
  };

  // Create Template Functions
  const openCreateTemplateModal = () => {
    setTemplateForm({
      name: '',
      description: '',
      category: 'general',
      trigger_type: 'contact_created',
      tags: [],
      is_global: true
    });
    setTemplateNameError('');
    setTagInput('');
    setShowCreateTemplateModal(true);
  };

  const closeCreateTemplateModal = () => {
    setShowCreateTemplateModal(false);
    setTemplateForm({
      name: '',
      description: '',
      category: 'general',
      trigger_type: 'contact_created',
      tags: [],
      is_global: true
    });
    setTemplateNameError('');
    setTagInput('');
  };

  const validateTemplateName = (name: string): boolean => {
    const trimmedName = name.trim();
    
    if (!trimmedName) {
      setTemplateNameError('Template name is required');
      return false;
    }
    
    if (trimmedName.length < 3) {
      setTemplateNameError('Template name must be at least 3 characters');
      return false;
    }

    if (trimmedName.length > 50) {
      setTemplateNameError('Template name cannot exceed 50 characters');
      return false;
    }

    // Check for HTML/script tags
    if (/<[^>]*>/gi.test(trimmedName)) {
      setTemplateNameError('HTML tags are not allowed in template name');
      return false;
    }
    
    // Check for duplicate name
    const duplicateTemplate = templates.find(
      t => t.name.toLowerCase().trim() === trimmedName.toLowerCase()
    );
    if (duplicateTemplate) {
      setTemplateNameError('A template with this name already exists');
      return false;
    }
    
    setTemplateNameError('');
    return true;
  };

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag && !templateForm.tags.includes(tag)) {
      setTemplateForm({ ...templateForm, tags: [...templateForm.tags, tag] });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTemplateForm({
      ...templateForm,
      tags: templateForm.tags.filter(tag => tag !== tagToRemove)
    });
  };

  const handleCreateTemplate = async () => {
    if (isCreatingTemplate) return;
    
    if (!validateTemplateName(templateForm.name)) {
      return;
    }

    // Validate description length
    if (templateForm.description.length > 100) {
      toast.error('Description cannot exceed 100 characters');
      return;
    }

    setIsCreatingTemplate(true);
    try {
      await apiClient.post('/workflow-templates/', {
        name: templateForm.name.trim(),
        description: templateForm.description.trim() || null,
        category: templateForm.category,
        trigger_type: templateForm.trigger_type,
        trigger_config: {},
        actions: [], // Empty actions - user will add them later
        conditions: null,
        tags: templateForm.tags.length > 0 ? templateForm.tags : null,
        is_global: templateForm.is_global
      });
      toast.success('Template created successfully!');
      closeCreateTemplateModal();
      fetchTemplates();
    } catch (error) {
      handleApiError(error, { toastMessage: 'Failed to create template' });
    } finally {
      setIsCreatingTemplate(false);
    }
  };

  const getCategoryColor = (category: string) => {
    const cat = CATEGORIES.find(c => c.value.toLowerCase() === category.toLowerCase());
    return cat?.color || 'gray';
  };

  const getCategoryIcon = (category: string) => {
    const cat = CATEGORIES.find(c => c.value.toLowerCase() === category.toLowerCase());
    return cat?.icon || '⚙️';
  };

  const getCategoryLabel = (category: string) => {
    const cat = CATEGORIES.find(c => c.value.toLowerCase() === category.toLowerCase());
    return cat?.label || category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, ' ');
  };

  // Permission check
  if (!canManageAutomations) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="font-semibold text-yellow-900 mb-2">Automation Management Restricted</div>
          <p className="text-yellow-800">You don't have permission to manage workflow templates.</p>
          <p className="text-yellow-700 text-sm mt-2">💡 Contact your administrator to request access to automation features.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="px-4 sm:px-6 lg:max-w-7xl xl:max-w-8xl 2xl:max-w-9xl 3xl:max-w-10xl lg:mx-auto lg:px-8">
          <div className="py-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Workflow Templates</h1>
              <p className="text-gray-600">Pre-built automation templates to get started quickly</p>
            </div>
            {user?.role === 'super_admin' && (
              <button
                onClick={openCreateTemplateModal}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <PlusIcon className="h-5 w-5" />
                Create Template
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 sm:px-6 lg:max-w-7xl xl:max-w-8xl 2xl:max-w-9xl 3xl:max-w-10xl lg:mx-auto lg:px-8 py-6">
        <div className="flex gap-4 mb-6">
        <input
          type="text"
          placeholder="Search templates..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && fetchTemplates()}
          className="flex-1 px-4 py-2 border rounded-lg"
        />
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="all">All Categories</option>
          {CATEGORIES.map(cat => (
            <option key={cat.value} value={cat.value}>
              {cat.icon} {cat.label}
            </option>
          ))}
        </select>
        <button
          onClick={fetchTemplates}
          className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
        >
          Search
        </button>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="px-4 sm:px-6 lg:max-w-7xl xl:max-w-8xl 2xl:max-w-9xl 3xl:max-w-10xl lg:mx-auto lg:px-8 pb-6">
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <SparklesIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No templates found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-white rounded-lg border p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{getCategoryIcon(template.category)}</span>
                  <div>
                    <h3 className="font-semibold text-gray-900">{template.name}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full bg-${getCategoryColor(template.category)}-100 text-${getCategoryColor(template.category)}-700`}>
                      {getCategoryLabel(template.category)}
                    </span>
                  </div>
                </div>
                {template.is_global && (
                  <SparklesIcon className="h-5 w-5 text-yellow-500" title="Global Template" />
                )}
              </div>

              <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                {template.description || 'No description available'}
              </p>

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <RocketLaunchIcon className="h-4 w-4" />
                  <span>Used {template.usage_count} times</span>
                </div>
              </div>

              {template.tags && template.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-4">
                  {template.tags.slice(0, 3).map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                    >
                      <TagIcon className="h-3 w-3" />
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <button
                onClick={() => openTemplateModal(template)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                <RocketLaunchIcon className="h-4 w-4" />
                Use Template
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Info Box */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">About Workflow Templates</h3>
        <p className="text-sm text-blue-800">
          Templates are pre-configured workflows that you can use as a starting point. 
          Click "Use Template" to create a new workflow based on the template configuration. 
          You can then customize it to fit your specific needs.
        </p>
      </div>
      </div>

      {/* Create Template Modal */}
      {showCreateTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  Create Workflow Template
                </h3>
                <button
                  onClick={closeCreateTemplateModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Template Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Template Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={templateForm.name}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (!/<[^>]*>/gi.test(value)) {
                        setTemplateForm({ ...templateForm, name: value });
                        if (templateNameError) setTemplateNameError('');
                      } else {
                        toast.error('HTML tags are not allowed');
                      }
                    }}
                    placeholder="Enter template name"
                    maxLength={50}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      templateNameError ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  <div className="flex justify-between mt-1">
                    {templateNameError ? (
                      <p className="text-sm text-red-600">{templateNameError}</p>
                    ) : (
                      <span></span>
                    )}
                    <span className="text-xs text-gray-500">{templateForm.name.length}/50</span>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={templateForm.description}
                    onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                    placeholder="Enter template description (optional)"
                    rows={2}
                    maxLength={100}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <div className="text-xs text-gray-500 text-right mt-1">
                    {templateForm.description.length}/100
                  </div>
                </div>

                {/* Category and Trigger Type */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={templateForm.category}
                      onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat.value} value={cat.value}>
                          {cat.icon} {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Trigger Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={templateForm.trigger_type}
                      onChange={(e) => setTemplateForm({ ...templateForm, trigger_type: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tags
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                      placeholder="Add a tag"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                    >
                      Add
                    </button>
                  </div>
                  {templateForm.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {templateForm.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="text-blue-500 hover:text-blue-700"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Global Template Toggle (for Super Admin) */}
                {user?.role === 'super_admin' && (
                  <div className="flex items-center gap-3 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <input
                      type="checkbox"
                      id="isGlobal"
                      checked={templateForm.is_global}
                      onChange={(e) => setTemplateForm({ ...templateForm, is_global: e.target.checked })}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="isGlobal" className="text-sm">
                      <span className="font-medium text-yellow-900">Global Template</span>
                      <p className="text-yellow-700 text-xs mt-0.5">
                        Global templates are available to all companies
                      </p>
                    </label>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t">
                  <button
                    onClick={closeCreateTemplateModal}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateTemplate}
                    disabled={isCreatingTemplate || !templateForm.name.trim()}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isCreatingTemplate ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Creating...
                      </>
                    ) : (
                      <>
                        <PlusIcon className="h-4 w-4" />
                        Create Template
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Workflow Modal */}
      {showModal && selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Create Workflow from Template
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Template: <span className="font-medium">{selectedTemplate.name}</span>
              </p>

              <div className="mb-4">
                <label htmlFor="workflowName" className="block text-sm font-medium text-gray-700 mb-2">
                  Workflow Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="workflowName"
                  type="text"
                  value={workflowName}
                  onChange={handleWorkflowNameChange}
                  onKeyPress={(e) => e.key === 'Enter' && createWorkflowFromTemplate()}
                  placeholder="Enter a unique workflow name"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    nameError ? 'border-red-500' : 'border-gray-300'
                  }`}
                  autoFocus
                />
                {nameError && (
                  <p className="mt-2 text-sm text-red-600 flex items-start gap-1">
                    <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {nameError}
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={createWorkflowFromTemplate}
                  disabled={!workflowName.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <RocketLaunchIcon className="h-4 w-4" />
                  Create Workflow
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
