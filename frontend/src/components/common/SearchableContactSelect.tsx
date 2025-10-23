import { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface ContactOption {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface SearchableContactSelectProps {
  contacts: ContactOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export default function SearchableContactSelect({
  contacts,
  value,
  onChange,
  placeholder = 'Search contacts...',
  required = false,
  className = ''
}: SearchableContactSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Get selected contact display name
  const selectedContact = contacts.find(c => c.id === value);
  const displayValue = selectedContact 
    ? `${selectedContact.first_name} ${selectedContact.last_name} (${selectedContact.email})`
    : '';

  const filteredContacts = contacts.filter(contact => {
    const searchLower = searchTerm.toLowerCase();
    return (
      contact.first_name.toLowerCase().includes(searchLower) ||
      contact.last_name.toLowerCase().includes(searchLower) ||
      contact.email.toLowerCase().includes(searchLower)
    );
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (contactId: string) => {
    onChange(contactId);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  const handleClear = () => {
    onChange('');
    setSearchTerm('');
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={isOpen ? searchTerm : displayValue}
            onChange={handleInputChange}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            required={required}
            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <ChevronDownIcon className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {!required && value && (
            <button
              type="button"
              onClick={handleClear}
              className="w-full px-3 py-2 text-left hover:bg-gray-50 text-sm border-b text-gray-500 italic"
            >
              Clear selection
            </button>
          )}
          {filteredContacts.length > 0 ? (
            filteredContacts.map((contact) => (
              <button
                key={contact.id}
                type="button"
                onClick={() => handleSelect(contact.id)}
                className={`w-full px-3 py-2 text-left hover:bg-gray-100 text-sm border-b last:border-b-0 ${
                  contact.id === value ? 'bg-primary-50' : ''
                }`}
              >
                <div className="font-medium">{contact.first_name} {contact.last_name}</div>
                <div className="text-xs text-gray-500">{contact.email}</div>
              </button>
            ))
          ) : (
            <div className="px-3 py-4 text-sm text-gray-500 text-center">
              {searchTerm ? 'No contacts found' : 'No contacts available'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
