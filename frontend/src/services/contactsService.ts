/**
 * Contacts API Service
 */

import apiClient from './apiClient';

export interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  company?: string;
  title?: string;
  type?: string;
  status?: string;
  source?: string;
  lead_score?: number;
  owner_id?: string;
  tags?: string[];
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

// Get all contacts
export const getContacts = async (params?: any) => {
  const response = await apiClient.get('/contacts', { params });
  return response.data;
};

// Get single contact
export const getContact = async (id: string) => {
  const response = await apiClient.get(`/contacts/${id}`);
  return response.data;
};

// Create contact
export const createContact = async (data: Partial<Contact>) => {
  const response = await apiClient.post('/contacts', data);
  return response.data;
};

// Update contact
export const updateContact = async (id: string, data: Partial<Contact>) => {
  const response = await apiClient.patch(`/contacts/${id}`, data);
  return response.data;
};

// Delete contact
export const deleteContact = async (id: string) => {
  const response = await apiClient.delete(`/contacts/${id}`);
  return response.data;
};

// Bulk import
export const bulkImportContacts = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await apiClient.post('/contacts/bulk-import', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export default {
  getContacts,
  getContact,
  createContact,
  updateContact,
  deleteContact,
  bulkImportContacts,
};

// Add upload functions
export const uploadCSV = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await apiClient.post('/contacts/upload-csv', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const uploadExcel = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await apiClient.post('/contacts/upload-excel', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};
