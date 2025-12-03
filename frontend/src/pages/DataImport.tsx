import { useState, useEffect } from 'react';
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

type EntityType = 'contacts' | 'deals' | 'activities';

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
  const [files, setFiles] = useState<{[key: string]: File | null}>({
    contacts: null,
    deals: null,
    activities: null
  });
  const [uploading, setUploading] = useState<{[key: string]: boolean}>({
    contacts: false,
    deals: false,
    activities: false
  });
  const [results, setResults] = useState<{[key: string]: ImportResult | null}>({
    contacts: null,
    deals: null,
    activities: null
  });
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  
  // Check if user can import data
  const canImportData = isSuperAdmin() || isCompanyAdmin() || isSalesManager();
  
  // Fetch companies for Super Admin
  useEffect(() => {
    if (isSuperAdmin()) {
      fetchCompanies();
    }
  }, []);
  
  const fetchCompanies = async () => {
    setLoadingCompanies(true);
    try {
      const response = await apiClient.get('/companies/');
      setCompanies(response.data);
      if (response.data.length > 0) {
        setSelectedCompany(response.data[0].id);
      }
    } catch (error: any) {
      handleApiError(error, { toastMessage: 'Failed to load companies' });
    } finally {
      setLoadingCompanies(false);
    }
  };

  const entityTypes = [
    { value: 'contacts', label: 'Contacts & Leads', description: 'Import contacts and leads' },
    { value: 'deals', label: 'Deals', description: 'Import sales deals and opportunities' },
    { value: 'activities', label: 'Activities', description: 'Import tasks, calls, and meetings' }
  ];

  const handleFileChange = (type: EntityType, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // Validate file type
      const validTypes = ['.csv', '.xlsx', '.xls'];
      const fileExtension = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();
      
      if (!validTypes.includes(fileExtension)) {
        toast.error('Please upload a CSV or Excel file');
        return;
      }
      
      setFiles(prev => ({ ...prev, [type]: selectedFile }));
      setResults(prev => ({ ...prev, [type]: null }));
    }
  };

  const handleUpload = async (type: EntityType) => {
    const file = files[type];
    if (!file) {
      toast.error('Please select a file');
      return;
    }
    
    // Super Admin must select a company
    if (isSuperAdmin() && !selectedCompany) {
      toast.error('Please select a company to import data for');
      return;
    }

    setUploading(prev => ({ ...prev, [type]: true }));
    const formData = new FormData();
    formData.append('file', file);
    formData.append('entity_type', type);
    
    // Add company_id for Super Admin
    if (isSuperAdmin() && selectedCompany) {
      formData.append('company_id', selectedCompany);
    }

    try {
      const response = await apiClient.post('/import/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setResults(prev => ({ ...prev, [type]: response.data }));
      toast.success(`Import started! Processing ${response.data.total_rows || 0} rows`);
    } catch (error: any) {
      handleApiError(error, { toastMessage: 'Failed to import data' });
    } finally {
      setUploading(prev => ({ ...prev, [type]: false }));
    }
  };

  const downloadTemplate = (type: EntityType) => {
    const templates: Record<EntityType, string> = {
      contacts: 'first_name,last_name,email,phone,company,title,type\nJohn,Doe,john.doe@example.com,+1234567890,Acme Corp,Sales Manager,Lead\nJane,Smith,jane.smith@example.com,+1987654321,Tech Solutions,Marketing Director,Prospect\nMichael,Johnson,michael.j@example.com,+1555123456,Global Industries,CEO,Customer\nSarah,Williams,sarah.w@example.com,+1444987654,Innovation Labs,Product Manager,Marketing Qualified Lead\n',
      deals: 'title,value,company,contact,stage,expected_close_date,status\nNew Enterprise Deal,50000,Acme Corp,john.doe@example.com,Lead,2024-12-31,open\nConsulting Project,25000,Tech Solutions,jane.smith@example.com,Proposal,2024-12-25,open\nProduct Integration,75000,Global Industries,michael.j@example.com,Negotiation,2025-01-15,open\nClosed Deal,100000,Innovation Labs,sarah.w@example.com,Closed Won,2024-12-20,won\n',
      activities: 'type,subject,description,status,due_date,duration_minutes,priority\ncall,Follow-up Call,Call to discuss proposal details,pending,2024-12-15,30,1\nmeeting,Product Demo,Schedule product demonstration,pending,2024-12-20,60,1\ntask,Send Proposal,Prepare and send proposal document,pending,2024-12-18,45,2\nemail,Contract Review,Review and send contract for signature,pending,2024-12-22,15,1\n'
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
            <p className="text-gray-600">Import contacts, deals, and activities from CSV or Excel files</p>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:max-w-7xl xl:max-w-8xl 2xl:max-w-9xl 3xl:max-w-10xl lg:mx-auto lg:px-8 py-6">

      {/* Company Selection - Super Admin Only */}
      {isSuperAdmin() && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Company</h2>
          <p className="text-sm text-gray-600 mb-4">
            As Super Admin, you can import data for any company. Select the target company below.
          </p>
          {loadingCompanies ? (
            <div className="flex items-center gap-2 text-gray-600">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              Loading companies...
            </div>
          ) : (
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a company</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name} {company.subscription_status && `(${company.subscription_status})`}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex gap-3">
          <InformationCircleIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-2">How to import data:</p>
            <ol className="list-decimal list-inside space-y-1 mb-3">
              {isSuperAdmin() && <li>Select the target company</li>}
              <li>Download the template for your data type</li>
              <li>Fill in your data following the template format</li>
              <li>Upload the completed file (CSV or Excel)</li>
              <li>Review and confirm the import</li>
            </ol>
            <p className="text-xs bg-blue-100 rounded px-2 py-1 inline-block">
              <strong>Note:</strong> Download the template for your data type to see the required fields and format.
            </p>
          </div>
        </div>
      </div>

      {/* Import Cards - One for Each Entity Type */}
      <div className="space-y-6">
        {entityTypes.map((type) => (
          <div key={type.value} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{type.label}</h2>
                <p className="text-sm text-gray-600">{type.description}</p>
              </div>
              <button
                onClick={() => downloadTemplate(type.value as EntityType)}
                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
              >
                Download Template
              </button>
            </div>

            {/* File Upload Section */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
              <input
                type="file"
                id={`file-upload-${type.value}`}
                accept=".csv,.xlsx,.xls"
                onChange={(e) => handleFileChange(type.value as EntityType, e)}
                className="hidden"
              />
              
              {files[type.value] ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <DocumentArrowUpIcon className="w-12 h-12 text-green-500 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{files[type.value]!.name}</p>
                      <p className="text-sm text-gray-600">{(files[type.value]!.size / 1024).toFixed(2)} KB</p>
                    </div>
                    <div className="flex gap-2">
                      <label
                        htmlFor={`file-upload-${type.value}`}
                        className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer"
                      >
                        Change
                      </label>
                      <button
                        onClick={() => handleUpload(type.value as EntityType)}
                        disabled={uploading[type.value]}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {uploading[type.value] ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Importing...
                          </>
                        ) : (
                          <>
                            <ArrowUpTrayIcon className="w-5 h-5" />
                            Import
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <ArrowUpTrayIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <label
                    htmlFor={`file-upload-${type.value}`}
                    className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
                  >
                    Choose File
                  </label>
                  <p className="text-xs text-gray-500 mt-2">CSV, XLSX, or XLS (Max 10MB)</p>
                </div>
              )}
            </div>

            {/* Import Result for this type */}
            {results[type.value] && (
              <div className="mt-4 border-t pt-4">
                <div className="flex items-center gap-3 mb-3">
                  {results[type.value]!.status === 'completed' ? (
                    <CheckCircleIcon className="w-6 h-6 text-green-500" />
                  ) : results[type.value]!.status === 'failed' ? (
                    <XCircleIcon className="w-6 h-6 text-red-500" />
                  ) : (
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  )}
                  <div>
                    <p className="font-medium text-gray-900">Import {results[type.value]!.status}</p>
                    <p className="text-sm text-gray-600">{results[type.value]!.file_name}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-gray-50 rounded p-3">
                    <p className="text-xs text-gray-600">Total Rows</p>
                    <p className="text-xl font-bold text-gray-900">{results[type.value]!.total_rows || 0}</p>
                  </div>
                  <div className="bg-green-50 rounded p-3">
                    <p className="text-xs text-gray-600">Processed</p>
                    <p className="text-xl font-bold text-green-600">{results[type.value]!.processed_rows || 0}</p>
                  </div>
                  <div className="bg-red-50 rounded p-3">
                    <p className="text-xs text-gray-600">Errors</p>
                    <p className="text-xl font-bold text-red-600">{results[type.value]!.error_rows || 0}</p>
                  </div>
                </div>

                {results[type.value]!.errors && results[type.value]!.errors!.length > 0 && (
                  <div className="mt-3 bg-red-50 border border-red-200 rounded p-3">
                    <p className="text-sm font-medium text-red-900 mb-2">Errors:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs text-red-800">
                      {results[type.value]!.errors!.slice(0, 5).map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                      {results[type.value]!.errors!.length > 5 && (
                        <li className="text-red-600">...and {results[type.value]!.errors!.length - 5} more errors</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      
      </div>
    </div>
  );
}
