import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import * as filesService from '../services/filesService';
import ActionButtons from '../components/common/ActionButtons';
import { 
  FolderIcon, 
  DocumentIcon,
  PlusIcon, 
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  ArrowUpTrayIcon,
  ArrowDownTrayIcon,
  FolderPlusIcon,
} from '@heroicons/react/24/outline';

interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  size?: number;
  category?: string;
  tags?: string[];
  status?: string;
  contact?: string;
  deal?: string;
  url?: string;
  folder_id?: string;
  created_at: string;
  updated_at?: string;
}

export default function Files() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [currentFolderName, setCurrentFolderName] = useState<string>('All Files');
  const [fileForm, setFileForm] = useState({
    name: '',
    category: '',
    tags: '',
    status: 'active',
  });

  // Check for action query parameter
  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'upload') {
      setShowUploadModal(true);
      searchParams.delete('action');
      setSearchParams(searchParams);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchFiles();
  }, [filterCategory, filterStatus]);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      // Fetch both files and folders
      const [filesData, foldersData] = await Promise.all([
        filesService.getFiles({
          category: filterCategory !== 'all' ? filterCategory : undefined,
        }),
        filesService.getFolders()
      ]);
      
      // Combine files and folders, marking their type
      const allItems = [
        ...foldersData.map((folder: any) => ({
          ...folder,
          type: 'folder' as const,
          size: undefined,
        })),
        ...filesData.map((file: any) => ({
          ...file,
          type: 'file' as const,
        }))
      ];
      
      setFiles(allItems);
    } catch (error) {
      console.error('Error fetching files:', error);
      toast.error('Failed to load files');
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleView = (file: FileItem) => {
    setSelectedFile(file);
    setShowViewModal(true);
  };

  const handleEdit = (file: FileItem) => {
    setSelectedFile(file);
    setFileForm({
      name: file.name,
      category: file.category || '',
      tags: file.tags?.join(', ') || '',
      status: file.status || 'active',
    });
    setShowEditModal(true);
  };

  const handleDelete = async (file: FileItem) => {
    if (!confirm(`Delete "${file.name}"?`)) return;
    try {
      if (file.type === 'folder') {
        await filesService.deleteFolder(file.id);
      } else {
        await filesService.deleteFile(file.id);
      }
      toast.success(`${file.type === 'folder' ? 'Folder' : 'File'} deleted successfully`);
      fetchFiles();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(error?.response?.data?.detail || 'Failed to delete');
    }
  };

  const handleDownload = async (file: FileItem) => {
    if (file.type === 'folder') {
      toast.error('Cannot download folders');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      
      const response = await fetch(`${API_BASE_URL}/api/files/${file.id}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success(`Downloaded ${file.name}`);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download file');
    }
  };
  
  const handleOpenFolder = (folder: FileItem) => {
    if (folder.type !== 'folder') return;
    setCurrentFolderId(folder.id);
    setCurrentFolderName(folder.name);
    toast.success(`Opened folder: ${folder.name}`);
  };
  
  const handleBackToRoot = () => {
    setCurrentFolderId(null);
    setCurrentFolderName('All Files');
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = fileInput?.files?.[0];
    
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', fileForm.category);
      
      await filesService.uploadFile(formData);
      toast.success('File uploaded successfully');
      setShowUploadModal(false);
      setFileForm({
        name: '',
        category: '',
        tags: '',
        status: 'active',
      });
      fetchFiles();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error?.response?.data?.detail || 'Failed to upload file');
    }
  };

  const handleCreateFolder = async () => {
    if (!fileForm.name.trim()) {
      toast.error('Please enter a folder name');
      return;
    }

    try {
      await filesService.createFolder({
        name: fileForm.name,
        description: fileForm.category,
      });
      toast.success('Folder created successfully');
      setShowCreateFolderModal(false);
      setFileForm({
        name: '',
        category: '',
        tags: '',
        status: 'active',
      });
      fetchFiles();
    } catch (error: any) {
      console.error('Create folder error:', error);
      toast.error(error?.response?.data?.detail || 'Failed to create folder');
    }
  };

  const handleUpdate = async () => {
    if (!selectedFile) return;
    try {
      toast.success('Updated successfully');
      setShowEditModal(false);
      fetchFiles();
    } catch (error) {
      toast.error('Failed to update');
    }
  };

  const filteredFiles = files.filter(file => {
    // Filter by current folder
    if (currentFolderId && file.folder_id !== currentFolderId) return false;
    if (!currentFolderId && file.folder_id) return false;
    
    const matchesSearch = 
      file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (file.tags && file.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())));
    
    const matchesCategory = filterCategory === 'all' || file.category === filterCategory;
    const matchesStatus = filterStatus === 'all' || file.status === filterStatus;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="px-4 sm:px-6 lg:max-w-7xl lg:mx-auto lg:px-8">
          <div className="py-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold leading-7 text-gray-900">File Management</h1>
              <p className="mt-1 text-sm text-gray-500">
                Organize and manage your documents and files
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setShowCreateFolderModal(true)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50"
              >
                <FolderPlusIcon className="h-4 w-4 mr-2" />
                New Folder
              </button>
              <button
                onClick={() => setShowUploadModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700"
              >
                <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
                Upload File
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 sm:px-6 lg:max-w-7xl lg:mx-auto lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search files and folders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg transition-colors ${
                showFilters 
                  ? 'bg-primary-100 text-primary-600' 
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              }`}
              title="Toggle Filters"
            >
              <FunnelIcon className="h-5 w-5" />
            </button>
            {showFilters && (
              <>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 min-w-[160px]"
                >
                  <option value="all">All Categories</option>
                  <option value="Sales">Sales</option>
                  <option value="Legal">Legal</option>
                  <option value="Marketing">Marketing</option>
                </select>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 min-w-[120px]"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                </select>
              </>
            )}
          </div>
        </div>

        {/* Files Grid */}
        {loading ? (
          <div className="p-12 text-center bg-white rounded-lg shadow">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading files...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredFiles.map((file) => (
              <div 
                key={file.id} 
                className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow flex flex-col"
                onClick={() => file.type === 'folder' && handleOpenFolder(file)}
                style={{ cursor: file.type === 'folder' ? 'pointer' : 'default' }}
              >
                {/* File/Folder Icon */}
                <div className="flex justify-center mb-3">
                  {file.type === 'folder' ? (
                    <FolderIcon className="h-16 w-16 text-yellow-500" />
                  ) : (
                    <DocumentIcon className="h-16 w-16 text-blue-500" />
                  )}
                </div>

                {/* File Info */}
                <h3 className="font-medium text-gray-900 text-sm mb-2 text-center truncate" title={file.name}>
                  {file.name}
                </h3>
                
                <div className="space-y-1 text-xs text-gray-600 flex-grow">
                  {file.type === 'file' && (
                    <p>Size: {formatFileSize(file.size)}</p>
                  )}
                  <p>Category: {file.category || 'N/A'}</p>
                  <p>Status: <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                    file.status === 'active' ? 'bg-green-100 text-green-800' :
                    file.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>{file.status}</span></p>
                  {file.contact && <p>Contact: {file.contact}</p>}
                  {file.deal && <p className="truncate" title={file.deal}>Deal: {file.deal}</p>}
                  <p className="text-gray-500 mt-2">{formatDate(file.created_at)}</p>
                </div>

                {file.tags && file.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {file.tags.slice(0, 2).map((tag, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                        {tag}
                      </span>
                    ))}
                    {file.tags.length > 2 && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                        +{file.tags.length - 2}
                      </span>
                    )}
                  </div>
                )}

                {/* Action Buttons - Different position for folders vs files */}
                <div className={`mt-3 pt-3 border-t border-gray-200 flex ${file.type === 'folder' ? 'justify-center' : 'justify-end'}`} onClick={(e) => e.stopPropagation()}>
                  {file.type === 'file' && (
                    <button
                      onClick={() => handleDownload(file)}
                      className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors mr-1"
                      title="Download"
                    >
                      <ArrowDownTrayIcon className="h-4 w-4" />
                    </button>
                  )}
                  <ActionButtons
                    onView={() => handleView(file)}
                    onEdit={() => handleEdit(file)}
                    onDelete={() => handleDelete(file)}
                    showView={file.type === 'file'}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredFiles.length === 0 && !loading && (
          <div className="p-12 text-center bg-white rounded-lg shadow">
            <FolderIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No files</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by uploading a file or creating a folder.</p>
          </div>
        )}
      </div>

      {/* Upload File Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Upload File</h3>
              <button onClick={() => setShowUploadModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <input
                type="file"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
              <select
                value={fileForm.category}
                onChange={(e) => setFileForm({...fileForm, category: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="">Select Category</option>
                <option value="Sales">Sales</option>
                <option value="Legal">Legal</option>
                <option value="Marketing">Marketing</option>
              </select>
              <input
                type="text"
                placeholder="Tags (comma separated)"
                value={fileForm.tags}
                onChange={(e) => setFileForm({...fileForm, tags: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
                >
                  Upload
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Folder Modal */}
      {showCreateFolderModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Create Folder</h3>
              <button onClick={() => setShowCreateFolderModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Folder Name"
                value={fileForm.name}
                onChange={(e) => setFileForm({...fileForm, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <select
                value={fileForm.category}
                onChange={(e) => setFileForm({...fileForm, category: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="">Select Category</option>
                <option value="Sales">Sales</option>
                <option value="Legal">Legal</option>
                <option value="Marketing">Marketing</option>
              </select>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowCreateFolderModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateFolder}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Edit {selectedFile?.type === 'folder' ? 'Folder' : 'File'}</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Name"
                value={fileForm.name}
                onChange={(e) => setFileForm({...fileForm, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <select
                value={fileForm.category}
                onChange={(e) => setFileForm({...fileForm, category: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="">Select Category</option>
                <option value="Sales">Sales</option>
                <option value="Legal">Legal</option>
                <option value="Marketing">Marketing</option>
              </select>
              <input
                type="text"
                placeholder="Tags (comma separated)"
                value={fileForm.tags}
                onChange={(e) => setFileForm({...fileForm, tags: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdate}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && selectedFile && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">File Details</h3>
              <button onClick={() => setShowViewModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">Name</label>
                <p className="text-gray-900">{selectedFile.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Type</label>
                <p className="text-gray-900 capitalize">{selectedFile.type}</p>
              </div>
              {selectedFile.size && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Size</label>
                  <p className="text-gray-900">{formatFileSize(selectedFile.size)}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-500">Category</label>
                <p className="text-gray-900">{selectedFile.category || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Status</label>
                <p className="text-gray-900 capitalize">{selectedFile.status}</p>
              </div>
              {selectedFile.contact && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Contact</label>
                  <p className="text-gray-900">{selectedFile.contact}</p>
                </div>
              )}
              {selectedFile.deal && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Related Deal</label>
                  <p className="text-gray-900">{selectedFile.deal}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-500">Created</label>
                <p className="text-gray-900">{formatDate(selectedFile.created_at)}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
