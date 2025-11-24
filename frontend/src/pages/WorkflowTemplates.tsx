import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  PlusIcon, 
  RocketLaunchIcon,
  SparklesIcon,
  TagIcon
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
  
  // Check if user can manage automations
  const canManageAutomations = isSuperAdmin() || isCompanyAdmin() || isSalesManager();

  useEffect(() => {
    fetchTemplates();
  }, [filterCategory]);

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

  const useTemplate = async (templateId: string, templateName: string) => {
    const workflowName = prompt(`Create workflow from "${templateName}".\n\nEnter workflow name:`);
    if (!workflowName) return;

    try {
      const response = await apiClient.post(`/workflow-templates/${templateId}/use`, null, {
        params: { workflow_name: workflowName }
      });
      toast.success('Workflow created successfully!');
    } catch (error) {
      handleApiError(error, { toastMessage: 'Failed to create workflow' });
    }
  };

  const getCategoryColor = (category: string) => {
    const cat = CATEGORIES.find(c => c.value === category);
    return cat?.color || 'gray';
  };

  const getCategoryIcon = (category: string) => {
    const cat = CATEGORIES.find(c => c.value === category);
    return cat?.icon || '⚙️';
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
                onClick={() => navigate('/workflows')}
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
                      {template.category}
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
                onClick={() => useTemplate(template.id, template.name)}
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
    </div>
  );
}
