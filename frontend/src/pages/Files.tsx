import React, { useState, useEffect } from 'react';
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
  description?: string;
  tags?: string[];
  status?: string;
  contact?: string;
  deal?: string;
  url?: string;
  folder_id?: string;  // For files - which folder they're in
  parent_id?: string;  // For folders - which folder they're in
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
  const [folderPath, setFolderPath] = useState<Array<{id: string, name: string}>>([]);
  const [fileForm, setFileForm] = useState({
    name: '',
    category: '',
    description: '',
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
  }, [filterCategory, filterStatus, currentFolderId]);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      // Fetch both files and folders for current folder
      const [filesData, foldersData] = await Promise.all([
        filesService.getFiles({
          category: filterCategory !== 'all' ? filterCategory : undefined,
        }),
        filesService.getFolders(currentFolderId || undefined)
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

  const handleCloseViewModal = () => {
    setShowViewModal(false);
    setSelectedFile(null);
  };

  const handleCloseCreateFolderModal = () => {
    setShowCreateFolderModal(false);
    // Clear form data
    setFileForm({
      name: '',
      category: '',
      description: '',
      tags: '',
      status: 'active',
    });
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    // Clear form data
    setFileForm({
      name: '',
      category: '',
      description: '',
      tags: '',
      status: 'active',
    });
    setSelectedFile(null);
  };

  const handleEdit = (file: FileItem) => {
    setSelectedFile(file);
    setFileForm({
      name: file.name,
      category: file.category || '',
      description: file.description || '',
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
    setFolderPath(prev => [...prev, { id: folder.id, name: folder.name }]);
    toast.success(`Opened folder: ${folder.name}`);
  };
  
  const handleBackToRoot = () => {
    setCurrentFolderId(null);
    setCurrentFolderName('All Files');
    setFolderPath([]);
  };
  
  const handleNavigateToFolder = (folderId: string | null, folderName: string, index: number) => {
    setCurrentFolderId(folderId);
    setCurrentFolderName(folderName);
    // Remove all folders after this index from the path
    setFolderPath(prev => prev.slice(0, index));
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = fileInput?.files?.[0];
    
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    // Check file size (50MB limit)
    const maxSize = 50 * 1024 * 1024; // 50MB in bytes
    if (file.size > maxSize) {
      toast.error(`File size exceeds the maximum limit of 50MB. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB.`);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', fileForm.category);
      if (currentFolderId) {
        formData.append('folder_id', currentFolderId);
      }
      
      const uploadResult = await filesService.uploadFile(formData);
      
      if (currentFolderId && uploadResult.folder_id !== currentFolderId) {
        console.error('WARNING: Upload folder_id mismatch!', {
          expected: currentFolderId,
          received: uploadResult.folder_id
        });
      }
      
      toast.success('File uploaded successfully');
      setShowUploadModal(false);
      setFileForm({
        name: '',
        category: '',
        description: '',
        tags: '',
        status: 'active',
      });
      fetchFiles();
    } catch (error: any) {
      console.error('Upload error:', error);
      const errorDetail = error?.response?.data?.detail;
      let errorMessage = 'Failed to upload file';
      
      if (errorDetail) {
        if (errorDetail.includes('size') || errorDetail.includes('large')) {
          errorMessage = `Upload failed: File is too large. Maximum file size is 50MB.`;
        } else if (errorDetail.includes('type') || errorDetail.includes('format')) {
          errorMessage = `Upload failed: File type not supported.`;
        } else {
          errorMessage = `Upload failed: ${errorDetail}`;
        }
      } else if (error?.message) {
        errorMessage = `Upload failed: ${error.message}`;
      }
      
      toast.error(errorMessage);
    }
  };

  const handleCreateFolder = async () => {
    if (!fileForm.name.trim()) {
      toast.error('Please enter a folder name');
      return;
    }

    // Check for HTML/script tags in name
    if (/<[^>]*>/gi.test(fileForm.name)) {
      toast.error('HTML tags and script tags are not allowed in name');
      return;
    }

    // Check name length
    if (fileForm.name.length > 255) {
      toast.error('Name cannot exceed 255 characters');
      return;
    }

    // Check for HTML/script tags in description
    if (fileForm.description && /<[^>]*>/gi.test(fileForm.description)) {
      toast.error('HTML tags and script tags are not allowed in description');
      return;
    }

    // Check description word count (100 words limit)
    if (fileForm.description) {
      const wordCount = fileForm.description.trim().split(/\s+/).length;
      if (wordCount > 100) {
        toast.error(`Description cannot exceed 100 words. Current: ${wordCount} words`);
        return;
      }
    }

    try {
      const folderData: any = {
        name: fileForm.name.trim(),
        description: fileForm.description.trim() || undefined,
        status: fileForm.status,
        tags: fileForm.tags ? fileForm.tags.split(',').map(t => t.trim()).filter(t => t) : [],
      };
      
      // If we're inside a folder, set it as parent
      if (currentFolderId) {
        folderData.parent_id = currentFolderId;
      }
      
      await filesService.createFolder(folderData);
      toast.success('Folder created successfully');
      handleCloseCreateFolderModal();
      fetchFiles();
    } catch (error: any) {
      console.error('Create folder error:', error);
      const errorMessage = error?.response?.data?.detail || 'Failed to create folder';
      toast.error(errorMessage);
    }
  };

  const handleUpdate = async () => {
    if (!selectedFile) return;

    // Validate name
    if (!fileForm.name.trim()) {
      toast.error('Please enter a name');
      return;
    }

    // Check for HTML/script tags in name
    if (/<[^>]*>/gi.test(fileForm.name)) {
      toast.error('HTML tags and script tags are not allowed in name');
      return;
    }

    // Check name length
    if (fileForm.name.length > 255) {
      toast.error('Name cannot exceed 255 characters');
      return;
    }

    // Check for HTML/script tags in description
    if (fileForm.description && /<[^>]*>/gi.test(fileForm.description)) {
      toast.error('HTML tags and script tags are not allowed in description');
      return;
    }

    // Check description word count (100 words limit)
    if (fileForm.description) {
      const wordCount = fileForm.description.trim().split(/\s+/).length;
      if (wordCount > 100) {
        toast.error(`Description cannot exceed 100 words. Current: ${wordCount} words`);
        return;
      }
    }

    try {
      const updateData: any = {
        name: fileForm.name.trim(),
        category: fileForm.category.trim() || undefined,
        description: fileForm.description.trim() || undefined,
        tags: fileForm.tags.split(',').map(t => t.trim()).filter(t => t),
        status: fileForm.status,
      };
      
      // Use correct service method based on type
      if (selectedFile.type === 'folder') {
        await filesService.updateFolder(selectedFile.id, updateData);
      } else {
        await filesService.updateFile(selectedFile.id, updateData);
      }
      
      toast.success('Updated successfully');
      handleCloseEditModal();
      fetchFiles();
    } catch (error: any) {
      console.error('Update error:', error);
      const errorMessage = error?.response?.data?.detail || 'Failed to update';
      toast.error(errorMessage);
    }
  };

  const handleDragStart = (e: React.DragEvent, file: FileItem) => {
    e.stopPropagation(); // Prevent triggering folder click
    e.dataTransfer.setData('itemId', file.id);
    e.dataTransfer.setData('itemType', file.type);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetFolderId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    
    const itemId = e.dataTransfer.getData('itemId');
    const itemType = e.dataTransfer.getData('itemType');
    
    if (!itemId) {
      return;
    }

    try {
      if (itemType === 'file') {
        // Move file
        await filesService.updateFile(itemId, { folder_id: targetFolderId || undefined });
        toast.success('File moved successfully');
      } else if (itemType === 'folder') {
        // Move folder
        await filesService.updateFolder(itemId, { parent_id: targetFolderId || undefined });
        toast.success('Folder moved successfully');
      }
      
      await fetchFiles();
    } catch (error) {
      console.error('Move error:', error);
      toast.error(`Failed to move ${itemType}`);
    }
  };

  const filteredFiles = files.filter(file => {
    // Filter by current folder - folders use parent_id, files use folder_id
    if (file.type === 'folder') {
      // For folders, check parent_id
      if (currentFolderId && file.parent_id !== currentFolderId) return false;
      if (!currentFolderId && file.parent_id) return false;
    } else {
      // For files, check folder_id
      if (currentFolderId && file.folder_id !== currentFolderId) return false;
      if (!currentFolderId && file.folder_id) return false;
    }
    
    const matchesSearch = 
      file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (file.tags && file.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())));
    
    const matchesCategory = filterCategory === 'all' || file.category === filterCategory || file.type === 'folder';
    const matchesStatus = filterStatus === 'all' || file.status === filterStatus || file.type === 'folder';
    
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

      {/* Breadcrumb Navigation */}
      {folderPath.length > 0 && (
        <div 
          className="bg-gray-50 border-b border-gray-200"
          onDragOver={handleDragOver}
          onDrop={(e) => {
            // Drop on breadcrumb goes to parent folder
            const parentFolder = folderPath.length > 1 ? folderPath[folderPath.length - 2] : null;
            handleDrop(e, parentFolder?.id || null);
          }}
        >
          <div className="px-4 sm:px-6 lg:max-w-7xl lg:mx-auto lg:px-8 py-3">
            <div className="flex items-center space-x-2 text-sm flex-wrap">
              <button
                onClick={handleBackToRoot}
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                All Files
              </button>
              {folderPath.map((folder, index) => (
                <React.Fragment key={folder.id}>
                  <span className="text-gray-400">/</span>
                  {index === folderPath.length - 1 ? (
                    <span className="text-gray-900 font-medium">{folder.name}</span>
                  ) : (
                    <button
                      onClick={() => handleNavigateToFolder(folder.id, folder.name, index + 1)}
                      className="text-primary-600 hover:text-primary-700 font-medium"
                    >
                      {folder.name}
                    </button>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      )}

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
                draggable={true}
                onDragStart={(e) => handleDragStart(e, file)}
                onDragOver={file.type === 'folder' ? handleDragOver : undefined}
                onDrop={file.type === 'folder' ? (e) => handleDrop(e, file.id) : undefined}
                className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow flex flex-col cursor-move"
                onClick={() => file.type === 'folder' && handleOpenFolder(file)}
                style={{ cursor: file.type === 'folder' ? 'pointer' : 'grab' }}
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
                    <>
                      <p>Size: {formatFileSize(file.size)}</p>
                      <p>Category: {file.category || 'N/A'}</p>
                    </>
                  )}
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
              <button onClick={handleCloseCreateFolderModal} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Folder Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter folder name"
                  value={fileForm.name}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (!/<[^>]*>/gi.test(value)) {
                      setFileForm({...fileForm, name: value});
                    } else {
                      toast.error('HTML tags are not allowed');
                    }
                  }}
                  onPaste={(e) => {
                    const pastedText = e.clipboardData.getData('text');
                    if (/<[^>]*>/gi.test(pastedText)) {
                      e.preventDefault();
                      toast.error('HTML tags are not allowed');
                    }
                  }}
                  maxLength={255}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                  required
                />
                <div className="text-xs text-gray-500 mt-1">
                  {fileForm.name.length}/255 characters
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  placeholder="Enter description (optional, max 100 words)"
                  value={fileForm.description}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (!/<[^>]*>/gi.test(value)) {
                      setFileForm({...fileForm, description: value});
                    } else {
                      toast.error('HTML tags are not allowed');
                    }
                  }}
                  onPaste={(e) => {
                    const pastedText = e.clipboardData.getData('text');
                    if (/<[^>]*>/gi.test(pastedText)) {
                      e.preventDefault();
                      toast.error('HTML tags are not allowed');
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                  rows={3}
                />
                <div className="text-xs text-gray-500 mt-1">
                  {fileForm.description.trim().split(/\s+/).filter(w => w).length}/100 words
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={fileForm.status}
                  onChange={(e) => setFileForm({...fileForm, status: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={handleCloseCreateFolderModal}
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
              <button onClick={handleCloseEditModal} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter name"
                  value={fileForm.name}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (!/<[^>]*>/gi.test(value)) {
                      setFileForm({...fileForm, name: value});
                    } else {
                      toast.error('HTML tags are not allowed');
                    }
                  }}
                  onPaste={(e) => {
                    const pastedText = e.clipboardData.getData('text');
                    if (/<[^>]*>/gi.test(pastedText)) {
                      e.preventDefault();
                      toast.error('HTML tags are not allowed');
                    }
                  }}
                  maxLength={255}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                  required
                />
                <div className="text-xs text-gray-500 mt-1">
                  {fileForm.name.length}/255 characters
                </div>
              </div>
              {selectedFile?.type === 'file' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={fileForm.category}
                    onChange={(e) => setFileForm({...fileForm, category: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                  >
                    <option value="">Select Category</option>
                    <option value="Sales">Sales</option>
                    <option value="Legal">Legal</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Support">Support</option>
                    <option value="Finance">Finance</option>
                    <option value="HR">HR</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  placeholder="Enter description (optional, max 100 words)"
                  value={fileForm.description}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (!/<[^>]*>/gi.test(value)) {
                      setFileForm({...fileForm, description: value});
                    } else {
                      toast.error('HTML tags are not allowed');
                    }
                  }}
                  onPaste={(e) => {
                    const pastedText = e.clipboardData.getData('text');
                    if (/<[^>]*>/gi.test(pastedText)) {
                      e.preventDefault();
                      toast.error('HTML tags are not allowed');
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                  rows={3}
                />
                <div className="text-xs text-gray-500 mt-1">
                  {fileForm.description.trim().split(/\s+/).filter(w => w).length}/100 words
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags
                </label>
                <input
                  type="text"
                  placeholder="Tags (comma separated)"
                  value={fileForm.tags}
                  onChange={(e) => setFileForm({...fileForm, tags: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={fileForm.status}
                  onChange={(e) => setFileForm({...fileForm, status: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={handleCloseEditModal}
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
              <button onClick={handleCloseViewModal} className="text-gray-400 hover:text-gray-600">
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
              {selectedFile.description && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Description</label>
                  <p className="text-gray-900">{selectedFile.description}</p>
                </div>
              )}
              {selectedFile.category && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Category</label>
                  <p className="text-gray-900">{selectedFile.category}</p>
                </div>
              )}
              {selectedFile.status && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <p className="text-gray-900 capitalize">{selectedFile.status}</p>
                </div>
              )}
              {selectedFile.tags && selectedFile.tags.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Tags</label>
                  <p className="text-gray-900">{selectedFile.tags.join(', ')}</p>
                </div>
              )}
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
