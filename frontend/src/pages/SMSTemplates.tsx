import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DocumentDuplicateIcon, PlusIcon, TrashIcon, SparklesIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface SMSTemplate {
  id: string;
  name: string;
  category: string | null;
  body: string;
  is_static: boolean;
  use_ai_enhancement: boolean;
  usage_count: number;
  created_at: string;
}

export default function SMSTemplates() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<SMSTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SMSTemplate | null>(null);
  const { token } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    body: '',
    is_static: true,
    variables: '',
    use_ai_enhancement: false,
    ai_tone: 'professional'
  });

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/sms/templates`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch(`${API_BASE_URL}/api/sms/templates`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast.success('Template created successfully');
        setShowModal(false);
        resetForm();
        fetchTemplates();
      } else {
        toast.error('Failed to create template');
      }
    } catch (error) {
      console.error('Error creating template:', error);
      toast.error('Failed to create template');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/sms/templates/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast.success('Template deleted');
        fetchTemplates();
      } else {
        toast.error('Failed to delete template');
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    }
  };

  const duplicateTemplate = (template: SMSTemplate) => {
    setFormData({
      name: `${template.name} (Copy)`,
      category: template.category || '',
      body: template.body,
      is_static: template.is_static,
      variables: '',
      use_ai_enhancement: template.use_ai_enhancement,
      ai_tone: 'professional'
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      body: '',
      is_static: true,
      variables: '',
      use_ai_enhancement: false,
      ai_tone: 'professional'
    });
    setEditingTemplate(null);
  };

  const categories = [
    'greeting',
    'follow_up',
    'appointment',
    'reminder',
    'promotion',
    'notification',
    'thank_you',
    'other'
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="px-4 sm:px-6 lg:max-w-7xl lg:mx-auto lg:px-8">
          <div className="py-4 sm:py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <button
                onClick={() => navigate('/sms')}
                className="p-2 hover:bg-gray-100 rounded-lg flex-shrink-0"
              >
                <ArrowLeftIcon className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
              </button>
              <DocumentDuplicateIcon className="w-6 h-6 sm:w-8 sm:h-8 text-primary-600 flex-shrink-0" />
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-gray-900 truncate">SMS Templates</h1>
                <p className="text-xs sm:text-sm text-gray-600 truncate">Create and manage reusable SMS templates</p>
              </div>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center px-3 sm:px-4 py-2 border border-transparent rounded-lg shadow-sm text-xs sm:text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 flex-shrink-0"
            >
              <PlusIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
              <span className="whitespace-nowrap">New Template</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6 lg:max-w-7xl lg:mx-auto lg:px-8 py-6">
        {templates.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
            <DocumentDuplicateIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No templates</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new template.</p>
            <div className="mt-6">
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                New Template
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <div
                key={template.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900">{template.name}</h3>
                    {template.category && (
                      <span className="inline-block mt-1 px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        {template.category}
                      </span>
                    )}
                  </div>
                  {template.use_ai_enhancement && (
                    <SparklesIcon className="w-5 h-5 text-purple-500" title="AI Enhanced" />
                  )}
                </div>

                <p className="text-sm text-gray-600 mb-4 line-clamp-3">{template.body}</p>

                <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                  <span>{template.is_static ? 'Static' : 'Dynamic'}</span>
                  <span>Used {template.usage_count} times</span>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => duplicateTemplate(template)}
                    className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                    title="Duplicate"
                  >
                    <DocumentDuplicateIcon className="w-4 h-4 mr-1" />
                    Copy
                  </button>
                  <button
                    onClick={() => handleDelete(template.id)}
                    className="inline-flex items-center justify-center px-3 py-2 border border-red-300 rounded-lg text-sm font-medium text-red-700 hover:bg-red-50"
                    title="Delete"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900">
                {editingTemplate ? 'Edit Template' : 'Create New Template'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="e.g., Welcome Message"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">Select category...</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1).replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message Body *
                </label>
                <textarea
                  value={formData.body}
                  onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                  rows={5}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Hi {contact_name}! Thanks for reaching out..."
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  Use {'{'}variable_name{'}'} for dynamic content (e.g., {'{'}contact_name{'}'}, {'{'}company{'}'})
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={!formData.is_static}
                      onChange={(e) => setFormData({ ...formData, is_static: !e.target.checked })}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Dynamic Template</span>
                  </label>
                  <p className="mt-1 text-xs text-gray-500 ml-6">
                    Contains variables that will be replaced
                  </p>
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.use_ai_enhancement}
                      onChange={(e) => setFormData({ ...formData, use_ai_enhancement: e.target.checked })}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="ml-2 text-sm text-gray-700 flex items-center">
                      <SparklesIcon className="w-4 h-4 mr-1 text-purple-500" />
                      AI Enhancement
                    </span>
                  </label>
                  <p className="mt-1 text-xs text-gray-500 ml-6">
                    Use AI to personalize messages
                  </p>
                </div>
              </div>

              {formData.use_ai_enhancement && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    AI Tone
                  </label>
                  <select
                    value={formData.ai_tone}
                    onChange={(e) => setFormData({ ...formData, ai_tone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="professional">Professional</option>
                    <option value="friendly">Friendly</option>
                    <option value="casual">Casual</option>
                  </select>
                </div>
              )}

              {!formData.is_static && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Variables (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={formData.variables}
                    onChange={(e) => setFormData({ ...formData, variables: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="contact_name, company, deal_value"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    List the variables used in your template
                  </p>
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
                >
                  {editingTemplate ? 'Update Template' : 'Create Template'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
