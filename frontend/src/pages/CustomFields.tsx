import React, { useState, useEffect } from 'react';
import { PlusIcon, PencilIcon, TrashIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import apiClient from '../services/apiClient';
import toast from 'react-hot-toast';
import { handleApiError } from '../utils/errorHandler';

interface CustomField {
  id: string;
  name: string;
  field_key: string;
  field_type: string;
  entity_type: string;
  description: string | null;
  is_required: boolean;
  is_active: boolean;
  default_value: string | null;
  options: string[] | null;
  show_in_list: boolean;
  show_in_detail: boolean;
  display_order: number;
  company_id: string;
  created_at: string;
}

const FIELD_TYPES = [
  { value: 'text', label: 'Text', icon: '📝' },
  { value: 'number', label: 'Number', icon: '🔢' },
  { value: 'date', label: 'Date', icon: '📅' },
  { value: 'boolean', label: 'Yes/No', icon: '✓' },
  { value: 'select', label: 'Dropdown', icon: '📋' },
  { value: 'multi_select', label: 'Multi-Select', icon: '☑️' },
  { value: 'email', label: 'Email', icon: '📧' },
  { value: 'phone', label: 'Phone', icon: '📞' },
  { value: 'url', label: 'URL', icon: '🔗' },
  { value: 'textarea', label: 'Long Text', icon: '📄' }
];

const ENTITY_TYPES = [
  { value: 'contact', label: 'Contacts', icon: '👤' },
  { value: 'deal', label: 'Deals', icon: '💼' },
  { value: 'company', label: 'Companies', icon: '🏢' },
  { value: 'activity', label: 'Activities', icon: '📌' }
];

export default function CustomFields() {
  const { user } = useAuth();
  const { hasPermission, isCompanyAdmin, isSuperAdmin } = usePermissions();
  const [fields, setFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [filterEntity, setFilterEntity] = useState<string>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Check if user can customize CRM
  const canCustomizeCRM = isSuperAdmin() || isCompanyAdmin();

  const [formData, setFormData] = useState({
    name: '',
    field_key: '',
    field_type: 'text',
    entity_type: 'contact',
    description: '',
    is_required: false,
    default_value: '',
    options: [] as string[],
    show_in_list: false,
    show_in_detail: true
  });

  const [optionInput, setOptionInput] = useState('');

  useEffect(() => {
    fetchFields();
  }, [filterEntity]);

  const fetchFields = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filterEntity !== 'all') params.entity_type = filterEntity;
      
      const response = await apiClient.get('/custom-fields/', { params });
      setFields(response.data);
    } catch (error) {
      handleApiError(error, { toastMessage: 'Failed to load custom fields' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent multiple submissions
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    
    // Generate field_key from name if not provided
    const submitData = { ...formData };
    if (!submitData.field_key) {
      submitData.field_key = 'custom_' + submitData.name.toLowerCase().replace(/\s+/g, '_');
    }

    try {
      if (editingField) {
        await apiClient.patch(`/custom-fields/${editingField.id}`, submitData);
        toast.success('Field updated successfully');
      } else {
        await apiClient.post('/custom-fields/', submitData);
        toast.success('Field created successfully');
      }
      
      setShowCreateModal(false);
      setEditingField(null);
      resetForm();
      fetchFields();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to save field');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (field: CustomField) => {
    setEditingField(field);
    setFormData({
      name: field.name,
      field_key: field.field_key,
      field_type: field.field_type,
      entity_type: field.entity_type,
      description: field.description || '',
      is_required: field.is_required,
      default_value: field.default_value || '',
      options: field.options || [],
      show_in_list: field.show_in_list,
      show_in_detail: field.show_in_detail
    });
    setShowCreateModal(true);
  };

  const handleDelete = async (fieldId: string) => {
    if (!confirm('Are you sure? This will delete all values for this field.')) return;
    
    try {
      await apiClient.delete(`/custom-fields/${fieldId}`);
      toast.success('Field deleted successfully');
      fetchFields();
    } catch (error) {
      toast.error('Failed to delete field');
    }
  };

  const toggleActive = async (field: CustomField) => {
    try {
      await apiClient.patch(`/custom-fields/${field.id}`, {
        is_active: !field.is_active
      });
      toast.success(field.is_active ? 'Field deactivated' : 'Field activated');
      fetchFields();
    } catch (error) {
      toast.error('Failed to update field');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      field_key: '',
      field_type: 'text',
      entity_type: 'contact',
      description: '',
      is_required: false,
      default_value: '',
      options: [],
      show_in_list: false,
      show_in_detail: true
    });
    setOptionInput('');
  };

  const addOption = () => {
    if (optionInput.trim()) {
      setFormData({
        ...formData,
        options: [...formData.options, optionInput.trim()]
      });
      setOptionInput('');
    }
  };

  const removeOption = (index: number) => {
    setFormData({
      ...formData,
      options: formData.options.filter((_, i) => i !== index)
    });
  };

  const needsOptions = formData.field_type === 'select' || formData.field_type === 'multi_select';

  // Check if user has permission (Company Admin or Super Admin)
  // Permission check - use the canCustomizeCRM variable defined earlier
  if (!canCustomizeCRM) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="font-semibold text-yellow-900 mb-2">CRM Customization Restricted</div>
          <p className="text-yellow-800">Only Company Admins can manage custom fields.</p>
          <p className="text-yellow-700 text-sm mt-2">💡 Contact your administrator to request custom fields or pipeline changes.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Custom Fields</h1>
          <p className="text-gray-600">Customize your CRM with additional fields</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setEditingField(null);
            setShowCreateModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <PlusIcon className="h-5 w-5" />
          New Field
        </button>
      </div>

      {/* Filter */}
      <div className="mb-6">
        <select
          value={filterEntity}
          onChange={(e) => setFilterEntity(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="all">All Entities</option>
          {ENTITY_TYPES.map(type => (
            <option key={type.value} value={type.value}>
              {type.icon} {type.label}
            </option>
          ))}
        </select>
      </div>

      {/* Fields List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : fields.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <Cog6ToothIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No custom fields yet</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 text-blue-600 hover:text-blue-700"
          >
            Create your first field
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {fields.map((field) => (
            <div
              key={field.id}
              className={`bg-white rounded-lg border p-4 ${!field.is_active ? 'opacity-50' : ''}`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">
                      {FIELD_TYPES.find(t => t.value === field.field_type)?.icon}
                    </span>
                    <h3 className="font-semibold text-gray-900">{field.name}</h3>
                    {field.is_required && (
                      <span className="text-red-500 text-sm">*</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">{field.field_key}</p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEdit(field)}
                    className="p-1 text-gray-400 hover:text-blue-600"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(field.id)}
                    className="p-1 text-gray-400 hover:text-red-600"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Type:</span>
                  <span className="font-medium">
                    {FIELD_TYPES.find(t => t.value === field.field_type)?.label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Entity:</span>
                  <span className="font-medium">
                    {ENTITY_TYPES.find(t => t.value === field.entity_type)?.label}
                  </span>
                </div>
                {field.description && (
                  <p className="text-gray-600 text-xs mt-2">{field.description}</p>
                )}
                <div className="flex gap-2 mt-3">
                  {field.show_in_list && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                      List View
                    </span>
                  )}
                  {field.show_in_detail && (
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                      Detail View
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t">
                <button
                  onClick={() => toggleActive(field)}
                  className={`text-sm ${field.is_active ? 'text-gray-600 hover:text-gray-800' : 'text-green-600 hover:text-green-800'}`}
                >
                  {field.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingField ? 'Edit Field' : 'Create Custom Field'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Field Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Budget"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Field Key *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.field_key}
                    onChange={(e) => setFormData({ ...formData, field_key: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="custom_budget"
                    disabled={!!editingField}
                  />
                  <p className="text-xs text-gray-500 mt-1">Auto-generated if left empty</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Field Type *
                  </label>
                  <select
                    value={formData.field_type}
                    onChange={(e) => setFormData({ ...formData, field_type: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    disabled={!!editingField}
                  >
                    {FIELD_TYPES.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.icon} {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Apply To *
                  </label>
                  <select
                    value={formData.entity_type}
                    onChange={(e) => setFormData({ ...formData, entity_type: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    disabled={!!editingField}
                  >
                    {ENTITY_TYPES.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.icon} {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Help text for this field"
                />
              </div>

              {needsOptions && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Options *
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={optionInput}
                      onChange={(e) => setOptionInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addOption())}
                      className="flex-1 px-3 py-2 border rounded-lg"
                      placeholder="Add option and press Enter"
                    />
                    <button
                      type="button"
                      onClick={addOption}
                      className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.options.map((option, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                      >
                        {option}
                        <button
                          type="button"
                          onClick={() => removeOption(index)}
                          className="hover:text-blue-900"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Default Value
                  </label>
                  <input
                    type="text"
                    value={formData.default_value}
                    onChange={(e) => setFormData({ ...formData, default_value: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_required}
                    onChange={(e) => setFormData({ ...formData, is_required: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">Required field</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.show_in_list}
                    onChange={(e) => setFormData({ ...formData, show_in_list: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">Show in list views</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.show_in_detail}
                    onChange={(e) => setFormData({ ...formData, show_in_detail: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">Show in detail views</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingField(null);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Saving...' : (editingField ? 'Update Field' : 'Create Field')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
