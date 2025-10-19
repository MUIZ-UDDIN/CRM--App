import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { ArrowUpTrayIcon, DocumentTextIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

interface UploadResult {
  message: string;
  created_count: number;
  errors: string[];
}

interface ContactUploadProps {
  onUploadComplete?: () => void;
}

const ContactUpload: React.FC<ContactUploadProps> = ({ onUploadComplete }) => {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const { user, token } = useAuth();

  // Check if user is Super Admin
  const canUpload = user?.role === 'Super Admin';

  const onDrop = async (acceptedFiles: File[]) => {
    if (!canUpload) {
      toast.error('Only Super Admin can upload contacts');
      return;
    }

    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    
    // Validate file type
    if (!file.name.match(/\.(csv|xlsx|xls)$/i)) {
      toast.error('Please select a CSV or Excel file');
      return;
    }

    setUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const endpoint = file.name.endsWith('.csv') 
        ? '/api/contacts/upload-csv' 
        : '/api/contacts/upload-excel';

      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
        toast.success(`Successfully imported ${data.created_count} contacts`);
        if (onUploadComplete) {
          onUploadComplete();
        }
      } else {
        toast.error(data.detail || 'Upload failed');
      }
    } catch (err) {
      toast.error('Network error occurred');
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    multiple: false,
    disabled: !canUpload || uploading
  });

  if (!canUpload) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center">
          <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 mr-2" />
          <p className="text-sm text-yellow-800">
            Only Super Admin users can upload contacts.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
          }
          ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        <div className="space-y-4">
          <div className="mx-auto w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
            <DocumentTextIcon className="w-6 h-6 text-gray-600" />
          </div>
          
          <div>
            <p className="text-base text-gray-900 font-medium">
              {isDragActive
                ? 'Drop the file here'
                : 'Drag and drop your CSV or Excel file here'
              }
            </p>
            <p className="text-sm text-gray-500 mt-1">
              or <span className="text-blue-600 font-medium">click to browse</span>
            </p>
          </div>
          
          <p className="text-xs text-gray-400">
            Supports CSV, XLSX, and XLS files (max 10MB)
          </p>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Supported Columns:</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center">
            <code className="bg-gray-200 px-2 py-1 rounded text-xs font-mono mr-2">email</code>
            <span className="text-red-500">*</span>
          </div>
          <div className="flex items-center">
            <code className="bg-gray-200 px-2 py-1 rounded text-xs font-mono mr-2">first_name</code>
          </div>
          <div className="flex items-center">
            <code className="bg-gray-200 px-2 py-1 rounded text-xs font-mono mr-2">last_name</code>
          </div>
          <div className="flex items-center">
            <code className="bg-gray-200 px-2 py-1 rounded text-xs font-mono mr-2">phone</code>
          </div>
          <div className="flex items-center">
            <code className="bg-gray-200 px-2 py-1 rounded text-xs font-mono mr-2">company</code>
          </div>
          <div className="flex items-center">
            <code className="bg-gray-200 px-2 py-1 rounded text-xs font-mono mr-2">title</code>
          </div>
          <div className="flex items-center">
            <code className="bg-gray-200 px-2 py-1 rounded text-xs font-mono mr-2">type</code>
          </div>
          <div className="flex items-center">
            <code className="bg-gray-200 px-2 py-1 rounded text-xs font-mono mr-2">owner_id</code>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-3">* Required field</p>
        <p className="text-xs text-gray-600 mt-2">
          <strong>Type:</strong> Lead, Prospect, Customer, Partner, Marketing Qualified Lead<br/>
          <strong>Owner ID:</strong> Optional UUID of the contact owner (defaults to current user)
        </p>
      </div>

      {/* Upload Status */}
      {uploading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
            <span className="text-sm text-blue-800">Uploading and processing contacts...</span>
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <CheckCircleIcon className="w-5 h-5 text-green-500 mr-2" />
            <span className="text-sm font-medium text-green-800">{result.message}</span>
          </div>
          <div className="text-sm text-green-700">
            <p>✅ Contacts created: <strong>{result.created_count}</strong></p>
            {result.errors.length > 0 && (
              <details className="mt-3">
                <summary className="cursor-pointer font-medium">
                  ⚠️ View errors ({result.errors.length})
                </summary>
                <div className="mt-2 bg-white rounded border p-3 max-h-32 overflow-y-auto">
                  {result.errors.slice(0, 10).map((error, index) => (
                    <p key={index} className="text-xs text-red-600 mb-1">• {error}</p>
                  ))}
                  {result.errors.length > 10 && (
                    <p className="text-xs text-gray-500 italic">
                      ... and {result.errors.length - 10} more errors
                    </p>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactUpload;
