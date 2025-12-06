import apiClient from './apiClient';

export interface CustomField {
  id: string;
  name: string;
  field_key: string;
  field_type: 'text' | 'number' | 'date' | 'boolean' | 'select' | 'multi_select' | 'email' | 'phone' | 'url' | 'textarea';
  entity_type: 'contact' | 'deal' | 'company' | 'activity';
  description?: string;
  is_required: boolean;
  is_active: boolean;
  default_value?: string;
  options?: string[];
  show_in_list: boolean;
  show_in_detail: boolean;
  display_order: number;
}

export interface CustomFieldValue {
  custom_field_id: string;
  field_key: string;
  field_name: string;
  field_type: string;
  value: any;
}

export interface CustomFieldValueSet {
  custom_field_id: string;
  value: any;
}

/**
 * Get all custom fields for a specific entity type
 */
export const getCustomFieldsForEntity = async (entityType: string, companyId?: string): Promise<CustomField[]> => {
  const params: any = { entity_type: entityType };
  if (companyId) {
    params.company_id_filter = companyId;
  }
  const response = await apiClient.get('/custom-fields', { params });
  return response.data.filter((field: CustomField) => field.is_active);
};

/**
 * Get custom field values for a specific entity
 */
export const getCustomFieldValues = async (entityType: string, entityId: string): Promise<Record<string, any>> => {
  try {
    const response = await apiClient.get(`/custom-fields/values/${entityType}/${entityId}`);
    // Backend returns a dictionary like: { field_key: { field_id, field_name, field_type, value }, ... }
    // We need to extract just the values
    const valuesMap: Record<string, any> = {};
    
    if (response.data && typeof response.data === 'object') {
      Object.keys(response.data).forEach((fieldKey) => {
        valuesMap[fieldKey] = response.data[fieldKey].value;
      });
    }
    
    return valuesMap;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return {}; // No values yet
    }
    throw error;
  }
};

/**
 * Set custom field values for a specific entity
 */
export const setCustomFieldValues = async (
  entityType: string,
  entityId: string,
  values: CustomFieldValueSet[]
): Promise<void> => {
  await apiClient.post(`/custom-fields/values/${entityType}/${entityId}`, values);
};

/**
 * Helper to prepare custom field values for saving
 */
export const prepareCustomFieldValues = (
  customFields: CustomField[],
  formData: Record<string, any>
): CustomFieldValueSet[] => {
  return customFields
    .filter(field => formData[field.field_key] !== undefined && formData[field.field_key] !== null && formData[field.field_key] !== '')
    .map(field => ({
      custom_field_id: field.id,
      value: formData[field.field_key]
    }));
};
