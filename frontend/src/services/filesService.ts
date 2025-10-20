/**
 * Files API Service
 */

import axios from 'axios';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface File {
  id: string;
  name: string;
  original_name: string;
  file_type?: string;
  mime_type?: string;
  size?: number;
  storage_path?: string;
  url?: string;
  category?: string;
  folder_id?: string;
  tags?: string[];
  owner_id: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Folder {
  id: string;
  name: string;
  parent_id?: string;
  owner_id: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

// Get all files
export const getFiles = async (params?: any) => {
  const response = await apiClient.get('/files', { params });
  return response.data;
};

// Get all folders
export const getFolders = async () => {
  const response = await apiClient.get('/files/folders');
  return response.data;
};

// Get single file
export const getFile = async (id: string) => {
  const response = await apiClient.get(`/files/${id}`);
  return response.data;
};

// Upload file
export const uploadFile = async (formData: FormData) => {
  const response = await apiClient.post('/files/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

// Create folder
export const createFolder = async (data: { name: string; parent_id?: string; description?: string }) => {
  const response = await apiClient.post('/files/folders', data);
  return response.data;
};

// Update file
export const updateFile = async (id: string, data: Partial<File>) => {
  const response = await apiClient.patch(`/files/${id}`, data);
  return response.data;
};

// Delete file
export const deleteFile = async (id: string) => {
  const response = await apiClient.delete(`/files/${id}`);
  return response.data;
};

// Delete folder
export const deleteFolder = async (id: string) => {
  const response = await apiClient.delete(`/files/folders/${id}`);
  return response.data;
};

export default {
  getFiles,
  getFolders,
  getFile,
  uploadFile,
  createFolder,
  updateFile,
  deleteFile,
  deleteFolder,
};
