import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { 
  CurrencyDollarIcon, 
  UserGroupIcon, 
  CalendarIcon, 
  DocumentIcon,
  DocumentTextIcon 
} from '@heroicons/react/24/solid';
import * as searchService from '../services/searchService';
import type { SearchResponse, SearchResult } from '../services/searchService';
import toast from 'react-hot-toast';

export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const query = searchParams.get('q');
    if (query) {
      setSearchQuery(query);
      performSearch(query);
    }
  }, [searchParams]);

  const performSearch = async (query: string) => {
    if (!query.trim()) return;

    setLoading(true);
    try {
      const data = await searchService.globalSearch(query);
      setResults(data);
    } catch (error: any) {
      console.error('Search error:', error);
      toast.error('Failed to perform search');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    navigate(result.link);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'deal':
        return <CurrencyDollarIcon className="h-5 w-5 text-green-600" />;
      case 'contact':
        return <UserGroupIcon className="h-5 w-5 text-blue-600" />;
      case 'activity':
        return <CalendarIcon className="h-5 w-5 text-purple-600" />;
      case 'file':
        return <DocumentIcon className="h-5 w-5 text-orange-600" />;
      case 'quote':
        return <DocumentTextIcon className="h-5 w-5 text-indigo-600" />;
      default:
        return <DocumentIcon className="h-5 w-5 text-gray-600" />;
    }
  };

  const renderResultSection = (title: string, items: SearchResult[], type: string) => {
    if (items.length === 0) return null;

    return (
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          {getIcon(type)}
          <span className="ml-2">{title}</span>
          <span className="ml-2 text-sm font-normal text-gray-500">({items.length})</span>
        </h2>
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              onClick={() => handleResultClick(item)}
              className="bg-white p-4 rounded-lg border border-gray-200 hover:border-primary-500 hover:shadow-md transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-medium text-gray-900 truncate">
                    {item.title}
                  </h3>
                  {item.description && (
                    <p className="text-sm text-gray-600 mt-1 truncate">
                      {item.description}
                    </p>
                  )}
                </div>
                {item.value && (
                  <div className="ml-4 flex-shrink-0">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                      {item.value}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Search Bar */}
        <div className="mb-8">
          <form onSubmit={handleSearch} className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search deals, contacts, activities, files, quotes..."
              className="block w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg text-base placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </form>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            <p className="mt-4 text-gray-600">Searching...</p>
          </div>
        )}

        {/* No Results */}
        {!loading && results && results.total_results === 0 && (
          <div className="text-center py-12">
            <MagnifyingGlassIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No results found</h3>
            <p className="mt-2 text-sm text-gray-500">
              Try searching with different keywords
            </p>
          </div>
        )}

        {/* Results */}
        {!loading && results && results.total_results > 0 && (
          <div>
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">
                Search Results
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Found {results.total_results} results for "{results.query}"
              </p>
            </div>

            {renderResultSection('Deals', results.deals, 'deal')}
            {renderResultSection('Contacts', results.contacts, 'contact')}
            {renderResultSection('Activities', results.activities, 'activity')}
            {renderResultSection('Files', results.files, 'file')}
            {renderResultSection('Quotes', results.quotes, 'quote')}
          </div>
        )}

        {/* Initial State */}
        {!loading && !results && (
          <div className="text-center py-12">
            <MagnifyingGlassIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">Start searching</h3>
            <p className="mt-2 text-sm text-gray-500">
              Search across deals, contacts, activities, files, and quotes
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
