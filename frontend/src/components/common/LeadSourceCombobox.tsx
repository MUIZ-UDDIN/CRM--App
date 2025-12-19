import { useState, useEffect, useRef } from 'react';
import { ChevronDownIcon, XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

interface LeadSourceComboboxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}

// Default lead source options
const DEFAULT_SOURCES = [
  'Website',
  'Referral',
  'LinkedIn',
  'Cold Call',
  'Email Campaign',
  'Trade Show',
  'Social Media',
  'Advertisement',
  'Partner',
  'Other'
];

export default function LeadSourceCombobox({ value, onChange, placeholder = "Select or type lead source", required = false }: LeadSourceComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value || '');
  const [customSources, setCustomSources] = useState<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load custom sources from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('customLeadSources');
    if (saved) {
      try {
        setCustomSources(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading custom lead sources:', e);
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

  // Combine default and custom sources
  const allSources = [...DEFAULT_SOURCES, ...customSources];

  // Filter sources based on search term
  const filteredSources = allSources.filter(source =>
    source.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Check if search term matches any existing source exactly
  const exactMatch = allSources.some(source => 
    source.toLowerCase() === searchTerm.toLowerCase()
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    onChange(newValue);
    setIsOpen(true);
  };

  const handleSelectSource = (source: string) => {
    setSearchTerm(source);
    onChange(source);
    setIsOpen(false);
  };

  const handleClear = () => {
    setSearchTerm('');
    onChange('');
    setIsOpen(false);
  };

  const handleAddCustom = () => {
    if (searchTerm.trim() && !exactMatch) {
      const newSource = searchTerm.trim();
      const updatedSources = [...customSources, newSource];
      setCustomSources(updatedSources);
      localStorage.setItem('customLeadSources', JSON.stringify(updatedSources));
      onChange(newSource);
      setIsOpen(false);
    }
  };

  const handleDeleteCustom = (sourceToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedSources = customSources.filter(s => s !== sourceToDelete);
    setCustomSources(updatedSources);
    localStorage.setItem('customLeadSources', JSON.stringify(updatedSources));
    
    // If the deleted source was selected, clear the input
    if (searchTerm.toLowerCase() === sourceToDelete.toLowerCase()) {
      setSearchTerm('');
      onChange('');
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
          {filteredSources.length > 0 ? (
            <>
              {filteredSources.map((source, index) => {
                const isCustom = customSources.includes(source);
                return (
                  <div
                    key={index}
                    className="flex items-center justify-between hover:bg-gray-100 group"
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectSource(source)}
                      className="flex-1 text-left px-3 py-2 text-sm focus:outline-none"
                    >
                      {source}
                    </button>
                    {isCustom && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteCustom(source, e)}
                        className="px-2 py-2 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete custom source"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </>
          ) : searchTerm.trim() ? (
            <div className="px-3 py-2 text-sm text-gray-500">
              No sources found
            </div>
          ) : (
            <div className="px-3 py-2 text-sm text-gray-500">
              Type to search or add source
            </div>
          )}

          {/* Add custom source option */}
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
