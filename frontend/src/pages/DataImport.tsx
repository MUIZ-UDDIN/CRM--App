import { useState } from 'react';
import { 
  ArrowUpTrayIcon,
  DocumentArrowUpIcon,
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import apiClient from '../services/apiClient';
import toast from 'react-hot-toast';
import { handleApiError } from '../utils/errorHandler';

type EntityType = 'deals' | 'companies' | 'leads';

interface ImportResult {
  job_id: string;
  entity_type: string;
  file_name: string;
  status: string;
  total_rows?: number;
  processed_rows?: number;
  error_rows?: number;
  errors?: string[];
}

export default function DataImport() {
  const { user } = useAuth();
  const { isCompanyAdmin, isSuperAdmin, isSalesManager } = usePermissions();
  const [selectedType, setSelectedType] = useState<EntityType>('deals');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  
  // Check if user can import data
  const canImportData = isSuperAdmin() || isCompanyAdmin() || isSalesManager();

  const entityTypes = [
    { value: 'deals', label: 'Deals', description: 'Import sales deals' },
    { value: 'companies', label: 'Companies', description: 'Import company records' },
    { value: 'leads', label: 'Leads', description: 'Import sales leads' }
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // Validate file type
      const validTypes = ['.csv', '.xlsx', '.xls'];
      const fileExtension = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();
      
      if (!validTypes.includes(fileExtension)) {
        toast.error('Please upload a CSV or Excel file');
        return;
      }
      
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('entity_type', selectedType);

    try {
      const response = await apiClient.post('/import/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setResult(response.data);
      toast.success(`Import started! Processing ${response.data.total_rows || 0} rows`);
    } catch (error: any) {
      handleApiError(error, { toastMessage: 'Failed to import data' });
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = (type: EntityType) => {
    const templates: Record<EntityType, string> = {
      deals: 'title,value,stage,contact_id,expected_close_date,description,priority\nNew Deal,5000,Prospecting,,2024-12-31,Sample deal description,high\nFollow-up Deal,10000,Negotiation,,2024-12-25,Another sample deal,medium\n',
      companies: 'name,domain,industry,size,phone,email,address,city,state,country,website\nAcme Corporation,acme.com,Technology,50,555-0100,contact@acme.com,123 Main St,New York,NY,USA,https://acme.com\nTech Solutions Inc,techsolutions.com,Software,100,555-0200,info@techsolutions.com,456 Tech Ave,San Francisco,CA,USA,https://techsolutions.com\n',
      leads: 'first_name,last_name,email,phone,company,title,source,status,notes\nJohn,Doe,john.doe@example.com,555-0300,Example Corp,Sales Director,Website,new,Interested in enterprise plan\nJane,Smith,jane.smith@example.com,555-0400,Tech Startup,CEO,Referral,qualified,Ready for demo\n'
    };

    const blob = new Blob([templates[type]], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}_template.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast.success('Template downloaded');
  };

  // Permission check
  if (!canImportData) {
    return (
      <div className="min-h-full">
        <div className="bg-white shadow">
          <div className="px-4 sm:px-6 lg:max-w-7xl xl:max-w-8xl 2xl:max-w-9xl 3xl:max-w-10xl lg:mx-auto lg:px-8">
            <div className="py-6">
              <h1 className="text-2xl font-bold text-gray-900">Data Import</h1>
              <p className="text-gray-600">Import contacts, deals, and companies from CSV or Excel files</p>
            </div>
          </div>
        </div>
        <div className="px-4 sm:px-6 lg:max-w-7xl xl:max-w-8xl 2xl:max-w-9xl 3xl:max-w-10xl lg:mx-auto lg:px-8 py-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <div className="font-semibold text-yellow-900 mb-2">Data Import Restricted</div>
            <p className="text-yellow-800 mb-3">You don't have permission to import company data.</p>
            <div className="text-sm text-yellow-700 space-y-1">
              <p><strong>Access Levels:</strong></p>
              <ul className="list-disc list-inside ml-2 space-y-1">
                <li><strong>Super Admin:</strong> Can import data for any company</li>
                <li><strong>Company Admin:</strong> Can import data for their company</li>
                <li><strong>Sales Manager:</strong> Can import team-only data (optional)</li>
                <li><strong>Sales Rep/Regular User:</strong> No import access</li>
              </ul>
              <p className="mt-3">💡 Contact your Company Admin to request a data import or to get import permissions.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="px-4 sm:px-6 lg:max-w-7xl xl:max-w-8xl 2xl:max-w-9xl 3xl:max-w-10xl lg:mx-auto lg:px-8">
          <div className="py-6">
            <h1 className="text-2xl font-bold text-gray-900">Data Import</h1>
            <p className="text-gray-600">Import deals, companies, and leads from CSV or Excel files</p>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:max-w-7xl xl:max-w-8xl 2xl:max-w-9xl 3xl:max-w-10xl lg:mx-auto lg:px-8 py-6">

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex gap-3">
          <InformationCircleIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-2">How to import data:</p>
            <ol className="list-decimal list-inside space-y-1 mb-3">
              <li>Download the template for your data type</li>
              <li>Fill in your data following the template format</li>
              <li>Upload the completed file (CSV or Excel)</li>
              <li>Review and confirm the import</li>
            </ol>
            <p className="text-xs bg-blue-100 rounded px-2 py-1 inline-block">
              <strong>Note:</strong> For contact imports, use the Import button on the Contacts page.
            </p>
          </div>
        </div>
      </div>

      {/* Entity Type Selection */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Data Type</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {entityTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => setSelectedType(type.value as EntityType)}
              className={`p-4 border-2 rounded-lg text-left transition-all ${
                selectedType === type.value
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900">{type.label}</h3>
                {selectedType === type.value && (
                  <CheckCircleIcon className="w-5 h-5 text-blue-600" />
                )}
              </div>
              <p className="text-sm text-gray-600">{type.description}</p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  downloadTemplate(type.value as EntityType);
                }}
                className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Download Template
              </button>
            </button>
          ))}
        </div>
      </div>

      {/* File Upload */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload File</h2>
        
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <input
            type="file"
            id="file-upload"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
          />
          
          {file ? (
            <div className="space-y-4">
              <DocumentArrowUpIcon className="w-16 h-16 text-green-500 mx-auto" />
              <div>
                <p className="font-medium text-gray-900">{file.name}</p>
                <p className="text-sm text-gray-600">{(file.size / 1024).toFixed(2)} KB</p>
              </div>
              <div className="flex gap-3 justify-center">
                <label
                  htmlFor="file-upload"
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  Change File
                </label>
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <ArrowUpTrayIcon className="w-5 h-5" />
                      Import Data
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <ArrowUpTrayIcon className="w-16 h-16 text-gray-400 mx-auto" />
              <div>
                <label
                  htmlFor="file-upload"
                  className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
                >
                  Choose File
                </label>
                <p className="text-sm text-gray-600 mt-2">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500">CSV, XLSX, or XLS (Max 10MB)</p>
            </div>
          )}
        </div>
      </div>

      {/* Import Result */}
      {result && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            {result.status === 'completed' ? (
              <CheckCircleIcon className="w-8 h-8 text-green-500" />
            ) : result.status === 'failed' ? (
              <XCircleIcon className="w-8 h-8 text-red-500" />
            ) : (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            )}
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Import {result.status}</h2>
              <p className="text-sm text-gray-600">{result.file_name}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">Total Rows</p>
              <p className="text-2xl font-bold text-gray-900">{result.total_rows || 0}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">Processed</p>
              <p className="text-2xl font-bold text-green-600">{result.processed_rows || 0}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">Errors</p>
              <p className="text-2xl font-bold text-red-600">{result.error_rows || 0}</p>
            </div>
          </div>

          {result.errors && result.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-medium text-red-900 mb-2">Errors:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-red-800">
                {result.errors.slice(0, 10).map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
                {result.errors.length > 10 && (
                  <li className="text-red-600">...and {result.errors.length - 10} more errors</li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}
