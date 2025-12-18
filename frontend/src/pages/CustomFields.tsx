import React, { useState, useEffect } from 'react';
import { PlusIcon, PencilIcon, TrashIcon, Cog6ToothIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { useSearchParams } from 'react-router-dom';
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
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'boolean', label: 'Yes/No' },
  { value: 'select', label: 'Dropdown' },
  { value: 'multi_select', label: 'Multi-Select' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'url', label: 'URL' },
  { value: 'textarea', label: 'Long Text' }
];

const ENTITY_TYPES = [
  { value: 'contact', label: 'Contacts' },
  { value: 'deal', label: 'Deals' },
  { value: 'activity', label: 'Activities' }
];

export default function CustomFields() {
  const { user } = useAuth();
  const { hasPermission, isCompanyAdmin, isSuperAdmin, isSalesManager } = usePermissions();
  const [searchParams] = useSearchParams();
  const companyIdFromUrl = searchParams.get('companyId'); // For Super Admin managing specific company
  const [fields, setFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [fieldToDelete, setFieldToDelete] = useState<CustomField | null>(null);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [filterEntity, setFilterEntity] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Check if user can customize CRM (Company Admin = Admin = Sales Manager)
  const canCustomizeCRM = isSuperAdmin() || isCompanyAdmin() || isSalesManager();

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
  }, [filterEntity, filterStatus]);

  const fetchFields = async () => {
    try {
      setLoading(true);
      const params: any = { active_only: false }; // Always fetch all fields
      if (filterEntity !== 'all') params.entity_type = filterEntity;
      // Pass company_id_filter for Super Admin managing specific company
      if (companyIdFromUrl) params.company_id_filter = companyIdFromUrl;
      
      const response = await apiClient.get('/custom-fields/', { params });
      // Apply status filter on frontend
      let filteredFields = response.data;
      if (filterStatus === 'active') {
        filteredFields = response.data.filter((f: CustomField) => f.is_active);
      } else if (filterStatus === 'inactive') {
        filteredFields = response.data.filter((f: CustomField) => !f.is_active);
      }
      setFields(filteredFields);
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

  const handleDelete = (field: CustomField) => {
    setFieldToDelete(field);
    setShowDeleteModal(true);
  };
  
  const confirmDelete = async () => {
    if (!fieldToDelete) return;
    
    try {
      await apiClient.delete(`/custom-fields/${fieldToDelete.id}`);
      toast.success('Field deleted successfully');
      setShowDeleteModal(false);
      setFieldToDelete(null);
      fetchFields();
    } catch (error) {
      toast.error('Failed to delete field');
      setShowDeleteModal(false);
      setFieldToDelete(null);
    }
  };
  
  const cancelDelete = () => {
    setShowDeleteModal(false);
    setFieldToDelete(null);
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
    <div className="min-h-full">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="px-4 sm:px-6 lg:max-w-7xl xl:max-w-8xl 2xl:max-w-9xl 3xl:max-w-10xl lg:mx-auto lg:px-8">
          <div className="py-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
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
        </div>
      </div>

      {/* Filter */}
      <div className="px-4 sm:px-6 lg:max-w-7xl xl:max-w-8xl 2xl:max-w-9xl 3xl:max-w-10xl lg:mx-auto lg:px-8 py-6">
        <div className="mb-6 flex gap-4">
        <select
          value={filterEntity}
          onChange={(e) => setFilterEntity(e.target.value)}
          className="px-4 py-2 pr-8 border rounded-lg appearance-none bg-white bg-no-repeat bg-right"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundSize: '1.5rem', backgroundPosition: 'right 0.5rem center' }}
        >
          <option value="all">All Entities</option>
          {ENTITY_TYPES.map(type => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 pr-8 border rounded-lg appearance-none bg-white bg-no-repeat bg-right"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundSize: '1.5rem', backgroundPosition: 'right 0.5rem center' }}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        </div>
      </div>

      {/* Fields List */}
      <div className="px-4 sm:px-6 lg:max-w-7xl xl:max-w-8xl 2xl:max-w-9xl 3xl:max-w-10xl lg:mx-auto lg:px-8 pb-6">
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
              className={`bg-white rounded-lg border p-4 ${!field.is_active ? 'border-gray-300 bg-gray-50' : ''}`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">{field.name}</h3>
                    {field.is_required && (
                      <span className="text-red-500 text-sm">*</span>
                    )}
                    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${field.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {field.is_active ? 'Active' : 'Inactive'}
                    </span>
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
                    onClick={() => handleDelete(field)}
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Field Name <span className="text-red-500">*</span>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Field Key <span className="text-red-500">*</span>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Field Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.field_type}
                    onChange={(e) => setFormData({ ...formData, field_type: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    disabled={!!editingField}
                  >
                    {FIELD_TYPES.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Apply To <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.entity_type}
                    onChange={(e) => setFormData({ ...formData, entity_type: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    disabled={!!editingField}
                  >
                    {ENTITY_TYPES.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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

      {/* Delete Confirmation Modal */}
      {showDeleteModal && fieldToDelete && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto p-6 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Delete Custom Field</h3>
              <button 
                onClick={cancelDelete}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="mb-6">
              <p className="text-sm text-gray-600">
                Are you sure you want to delete the custom field <span className="font-semibold">"{fieldToDelete.name}"</span>?
              </p>
              <p className="text-sm text-red-600 mt-2">
                This will permanently delete all values for this field across all {fieldToDelete.entity_type}s. This action cannot be undone.
              </p>
            </div>
            <div className="flex justify-end gap-3">
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
                Delete Field
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
