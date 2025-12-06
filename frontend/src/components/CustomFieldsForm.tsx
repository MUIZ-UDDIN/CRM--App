import React from 'react';
import { CustomField } from '../services/customFieldsService';

interface CustomFieldsFormProps {
  customFields: CustomField[];
  values: Record<string, any>;
  onChange: (fieldKey: string, value: any) => void;
  errors?: Record<string, string>;
}

export default function CustomFieldsForm({ customFields, values, onChange, errors = {} }: CustomFieldsFormProps) {
  if (customFields.length === 0) {
    return null;
  }

  const renderField = (field: CustomField) => {
    const value = values[field.field_key] || '';
    const error = errors[field.field_key];

    const baseInputClasses = `w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 ${
      error ? 'border-red-500' : 'border-gray-300'
    }`;

    switch (field.field_type) {
      case 'text':
      case 'email':
      case 'phone':
      case 'url':
        return (
          <input
            type={field.field_type === 'email' ? 'email' : field.field_type === 'url' ? 'url' : 'text'}
            value={value}
            onChange={(e) => onChange(field.field_key, e.target.value)}
            placeholder={field.description || `Enter ${field.name.toLowerCase()}`}
            className={baseInputClasses}
            required={field.is_required}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(field.field_key, e.target.value ? Number(e.target.value) : '')}
            placeholder={field.description || `Enter ${field.name.toLowerCase()}`}
            className={baseInputClasses}
            required={field.is_required}
          />
        );

      case 'date':
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => onChange(field.field_key, e.target.value)}
            className={baseInputClasses}
            required={field.is_required}
          />
        );

      case 'boolean':
        return (
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={!!value}
              onChange={(e) => onChange(field.field_key, e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label className="ml-2 text-sm text-gray-600">
              {field.description || 'Enable this option'}
            </label>
          </div>
        );

      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => onChange(field.field_key, e.target.value)}
            className={baseInputClasses}
            required={field.is_required}
          >
            <option value="">Select {field.name.toLowerCase()}</option>
            {field.options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case 'multi_select':
        return (
          <select
            multiple
            value={Array.isArray(value) ? value : []}
            onChange={(e) => {
              const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
              onChange(field.field_key, selectedOptions);
            }}
            className={`${baseInputClasses} h-32`}
            required={field.is_required}
          >
            {field.options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => onChange(field.field_key, e.target.value)}
            placeholder={field.description || `Enter ${field.name.toLowerCase()}`}
            rows={4}
            className={baseInputClasses}
            required={field.is_required}
          />
        );

      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(field.field_key, e.target.value)}
            placeholder={field.description || `Enter ${field.name.toLowerCase()}`}
            className={baseInputClasses}
            required={field.is_required}
          />
        );
    }
  };

  return (
    <div className="space-y-4">
      <div className="border-t border-gray-200 pt-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Custom Fields</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {customFields
            .sort((a, b) => a.display_order - b.display_order)
            .map((field) => (
              <div key={field.id} className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  {field.name}
                  {field.is_required && <span className="text-red-500 ml-1">*</span>}
                </label>
                {renderField(field)}
                {errors[field.field_key] && (
                  <p className="text-xs text-red-500">{errors[field.field_key]}</p>
                )}
                {field.description && !errors[field.field_key] && (
                  <p className="text-xs text-gray-500">{field.description}</p>
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
