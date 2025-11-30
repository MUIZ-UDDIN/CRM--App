import { useState, useEffect, useRef } from 'react';
import { ChevronDownIcon, XMarkIcon, PlusIcon } from '@heroicons/react/24/outline';

interface StatusComboboxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}

// Default status options
const DEFAULT_STATUSES = ['new', 'customer'];

export default function StatusCombobox({ value, onChange, placeholder = "Select or type status", required = false }: StatusComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value || '');
  const [customStatuses, setCustomStatuses] = useState<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load custom statuses from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('customContactStatuses');
    if (saved) {
      try {
        setCustomStatuses(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading custom statuses:', e);
      }
    }
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

  // Combine default and custom statuses
  const allStatuses = [...DEFAULT_STATUSES, ...customStatuses];

  // Filter statuses based on search term
  const filteredStatuses = allStatuses.filter(status =>
    status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Check if search term matches any existing status exactly
  const exactMatch = allStatuses.some(status => 
    status.toLowerCase() === searchTerm.toLowerCase()
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    onChange(newValue);
    setIsOpen(true);
  };

  const handleSelectStatus = (status: string) => {
    setSearchTerm(status);
    onChange(status);
    setIsOpen(false);
  };

  const handleClear = () => {
    setSearchTerm('');
    onChange('');
    setIsOpen(false);
  };

  const handleAddCustom = () => {
    if (searchTerm.trim() && !exactMatch) {
      const newStatus = searchTerm.trim().toLowerCase();
      const updatedStatuses = [...customStatuses, newStatus];
      setCustomStatuses(updatedStatuses);
      localStorage.setItem('customContactStatuses', JSON.stringify(updatedStatuses));
      onChange(newStatus);
      setIsOpen(false);
    }
  };

  // Capitalize first letter for display
  const capitalize = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <input
          type="text"
          value={capitalize(searchTerm)}
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
          {filteredStatuses.length > 0 ? (
            <>
              {filteredStatuses.map((status, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleSelectStatus(status)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                >
                  {capitalize(status)}
                </button>
              ))}
            </>
          ) : searchTerm.trim() ? (
            <div className="px-3 py-2 text-sm text-gray-500">
              No statuses found
            </div>
          ) : (
            <div className="px-3 py-2 text-sm text-gray-500">
              Type to search or add status
            </div>
          )}

          {/* Add custom status option */}
          {searchTerm.trim() && !exactMatch && (
            <button
              type="button"
              onClick={handleAddCustom}
              className="w-full text-left px-3 py-2 text-sm border-t border-gray-200 bg-primary-50 hover:bg-primary-100 text-primary-700 font-medium flex items-center gap-2"
            >
              <PlusIcon className="h-4 w-4" />
              Add "{capitalize(searchTerm)}"
            </button>
          )}
        </div>
      )}
    </div>
  );
}
