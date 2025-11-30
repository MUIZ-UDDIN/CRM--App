import { useState, useEffect, useRef } from 'react';
import { ChevronDownIcon, XMarkIcon, PlusIcon } from '@heroicons/react/24/outline';

interface Company {
  id: string;
  name: string;
}

interface CompanyComboboxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}

export default function CompanyCombobox({ value, onChange, placeholder = "Select or type company name", required = false }: CompanyComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value || '');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch companies from API
  useEffect(() => {
    fetchCompanies();
  }, []);

  // Update search term when value changes externally
  useEffect(() => {
    setSearchTerm(value || '');
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/api/companies', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setCompanies(data);
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter companies based on search term
  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Check if search term matches any existing company exactly
  const exactMatch = companies.some(company => 
    company.name.toLowerCase() === searchTerm.toLowerCase()
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    onChange(newValue);
    setIsOpen(true);
  };

  const handleSelectCompany = (companyName: string) => {
    setSearchTerm(companyName);
    onChange(companyName);
    setIsOpen(false);
  };

  const handleClear = () => {
    setSearchTerm('');
    onChange('');
    setIsOpen(false);
  };

  const handleAddCustom = () => {
    if (searchTerm.trim()) {
      onChange(searchTerm.trim());
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          required={required}
          className="w-full px-3 py-2 pr-20 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {searchTerm && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <ChevronDownIcon className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {loading ? (
            <div className="px-3 py-2 text-sm text-gray-500">Loading companies...</div>
          ) : filteredCompanies.length > 0 ? (
            <>
              {filteredCompanies.map((company) => (
                <button
                  key={company.id}
                  type="button"
                  onClick={() => handleSelectCompany(company.name)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                >
                  {company.name}
                </button>
              ))}
            </>
          ) : searchTerm.trim() ? (
            <div className="px-3 py-2 text-sm text-gray-500">
              No companies found
            </div>
          ) : (
            <div className="px-3 py-2 text-sm text-gray-500">
              Type to search companies
            </div>
          )}

          {/* Add custom company option */}
          {searchTerm.trim() && !exactMatch && (
            <button
              type="button"
              onClick={handleAddCustom}
              className="w-full text-left px-3 py-2 text-sm border-t border-gray-200 bg-primary-50 hover:bg-primary-100 text-primary-700 font-medium flex items-center gap-2"
            >
              <PlusIcon className="h-4 w-4" />
              Add "{searchTerm}"
            </button>
          )}
        </div>
      )}
    </div>
  );
}
