import { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon, MagnifyingGlassIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface SearchableCategorySelectProps {
  categories: string[];
  value: string;
  onChange: (value: string) => void;
  onAddCategory: (category: string) => void;
  onDeleteCategory: (category: string) => void;
  placeholder?: string;
  className?: string;
}

export default function SearchableCategorySelect({
  categories,
  value,
  onChange,
  onAddCategory,
  onDeleteCategory,
  placeholder = 'Search or select category...',
  className = ''
}: SearchableCategorySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const displayValue = value || '';

  const filteredCategories = categories.filter(category =>
    category.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  const handleSelect = (category: string) => {
    onChange(category);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  const handleAddNewCategory = () => {
    const trimmedName = newCategoryName.trim();
    
    if (!trimmedName) {
      toast.error('Please enter a category name');
      return;
    }

    // Check for HTML/script tags
    if (/<[^>]*>/gi.test(trimmedName)) {
      toast.error('HTML tags and script tags are not allowed in category name');
      return;
    }

    // Check character limit (50 characters)
    if (trimmedName.length > 50) {
      toast.error('Category name cannot exceed 50 characters');
      return;
    }

    if (categories.includes(trimmedName)) {
      toast.error('Category already exists');
      return;
    }
    
    onAddCategory(trimmedName);
    onChange(trimmedName);
    setNewCategoryName('');
    setShowAddModal(false);
    setIsOpen(false);
  };

  const handleDelete = (e: React.MouseEvent, category: string) => {
    e.stopPropagation();
    if (categories.length <= 1) {
      toast.error('Cannot delete the last category');
      return;
    }
    onDeleteCategory(category);
    if (value === category) {
      onChange('');
    }
  };

  return (
    <>
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
            {/* Add New Category Button */}
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="w-full px-3 py-2 text-left hover:bg-primary-50 text-sm border-b text-primary-600 font-medium flex items-center gap-2"
            >
              <PlusIcon className="h-4 w-4" />
              Add New Category
            </button>
            
            {filteredCategories.length > 0 ? (
              filteredCategories.map((category) => (
                <div
                  key={category}
                  className={`flex items-center justify-between px-3 py-2 hover:bg-gray-100 text-sm border-b last:border-b-0 cursor-pointer ${
                    category === value ? 'bg-primary-50' : ''
                  }`}
                  onClick={() => handleSelect(category)}
                >
                  <span className="font-medium">{category}</span>
                  <button
                    type="button"
                    onClick={(e) => handleDelete(e, category)}
                    className="text-red-600 hover:text-red-700 p-1"
                    title="Delete category"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              ))
            ) : (
              <div className="px-3 py-4 text-sm text-gray-500 text-center">
                {searchTerm ? 'No categories found' : 'No categories available'}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Category Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Add New Category</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => {
                  const value = e.target.value;
                  if (!/<[^>]*>/gi.test(value)) {
                    setNewCategoryName(value);
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddNewCategory();
                  } else if (e.key === 'Escape') {
                    setShowAddModal(false);
                    setNewCategoryName('');
                  }
                }}
                placeholder="Enter category name"
                maxLength={50}
                autoFocus
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <div className="text-xs text-gray-500 mt-1">
                {newCategoryName.length}/50 characters
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setNewCategoryName('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddNewCategory}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
              >
                Add Category
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
