import React from 'react';
import { CustomField } from '../services/customFieldsService';

interface CustomFieldsDisplayProps {
  customFields: CustomField[];
  values: Record<string, any>;
}

export default function CustomFieldsDisplay({ customFields, values }: CustomFieldsDisplayProps) {
  console.log('CustomFieldsDisplay - All fields:', customFields);
  console.log('CustomFieldsDisplay - Values:', values);
  
  // Filter to only show fields that should be displayed in detail view
  const fieldsToShow = customFields.filter(field => field.show_in_detail);
  console.log('CustomFieldsDisplay - Fields to show:', fieldsToShow);

  if (fieldsToShow.length === 0) {
    console.log('CustomFieldsDisplay - No fields to show');
    return null;
  }

  const formatValue = (field: CustomField, value: any): string => {
    if (value === null || value === undefined || value === '') {
      return '-';
    }

    switch (field.field_type) {
      case 'boolean':
        return value ? 'Yes' : 'No';
      
      case 'date':
        try {
          return new Date(value).toLocaleDateString();
        } catch {
          return value;
        }
      
      case 'multi_select':
        return Array.isArray(value) ? value.join(', ') : value;
      
      case 'number':
        return value.toLocaleString();
      
      default:
        return String(value);
    }
  };

  return (
    <div className="border-t border-gray-200 pt-4 mt-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Custom Information</h3>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
        {fieldsToShow
          .sort((a, b) => a.display_order - b.display_order)
          .map((field) => (
            <div key={field.id}>
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                {field.name}
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {formatValue(field, values[field.field_key])}
              </dd>
            </div>
          ))}
      </dl>
    </div>
  );
}
