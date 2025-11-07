import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { MagnifyingGlassIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { 
  HomeIcon,
  CurrencyDollarIcon, 
  UserGroupIcon, 
  CalendarIcon, 
  DocumentIcon,
  ChartBarIcon,
  EnvelopeIcon,
  ChatBubbleLeftIcon,
  PhoneIcon,
  FolderIcon,
  CogIcon,
  BellIcon,
  ClockIcon
} from '@heroicons/react/24/solid';
import * as searchService from '../services/searchService';
import type { NavigationSearchResponse, NavigationResult } from '../services/searchService';
import toast from 'react-hot-toast';

export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState<NavigationSearchResponse | null>(null);
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
      const data = await searchService.navigationSearch(query);
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

  const handleResultClick = (result: NavigationResult) => {
    navigate(result.path);
  };

  const getIcon = (iconName: string) => {
    const iconClass = "h-6 w-6";
    switch (iconName) {
      case 'home':
        return <HomeIcon className={iconClass} />;
      case 'currency':
        return <CurrencyDollarIcon className={iconClass} />;
      case 'users':
        return <UserGroupIcon className={iconClass} />;
      case 'calendar':
        return <CalendarIcon className={iconClass} />;
      case 'document':
        return <DocumentIcon className={iconClass} />;
      case 'chart':
      case 'chart-bar':
        return <ChartBarIcon className={iconClass} />;
      case 'envelope':
        return <EnvelopeIcon className={iconClass} />;
      case 'chat':
        return <ChatBubbleLeftIcon className={iconClass} />;
      case 'phone':
        return <PhoneIcon className={iconClass} />;
      case 'folder':
        return <FolderIcon className={iconClass} />;
      case 'cog':
        return <CogIcon className={iconClass} />;
      case 'bell':
        return <BellIcon className={iconClass} />;
      case 'clock':
        return <ClockIcon className={iconClass} />;
      case 'user':
        return <UserGroupIcon className={iconClass} />;
      default:
        return <DocumentIcon className={iconClass} />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Main':
        return 'bg-blue-100 text-blue-700';
      case 'Sales':
        return 'bg-green-100 text-green-700';
      case 'Communications':
        return 'bg-purple-100 text-purple-700';
      case 'SMS':
        return 'bg-yellow-100 text-yellow-700';
      case 'More':
        return 'bg-gray-100 text-gray-700';
      case 'User':
        return 'bg-indigo-100 text-indigo-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
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
              placeholder="Search for pages: Contacts, Deals, SMS, Settings..."
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
        {!loading && results && results.results.length === 0 && (
          <div className="text-center py-12">
            <MagnifyingGlassIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No pages found</h3>
            <p className="mt-2 text-sm text-gray-500">
              Try searching for: Contacts, Deals, SMS, Settings, Activities, etc.
            </p>
          </div>
        )}

        {/* Results */}
        {!loading && results && results.results.length > 0 && (
          <div>
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">
                Pages & Sections
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Found {results.results.length} pages matching "{results.query}"
              </p>
            </div>

            <div className="space-y-3">
              {results.results.map((result, index) => (
                <div
                  key={index}
                  onClick={() => handleResultClick(result)}
                  className="bg-white p-5 rounded-lg border border-gray-200 hover:border-primary-500 hover:shadow-lg transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1 min-w-0">
                      <div className="flex-shrink-0 w-12 h-12 bg-primary-50 rounded-lg flex items-center justify-center text-primary-600 group-hover:bg-primary-100 transition-colors">
                        {getIcon(result.icon)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                          {result.name}
                        </h3>
                        <p className="text-sm text-gray-600 mt-0.5">
                          {result.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 flex-shrink-0">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getCategoryColor(result.category)}`}>
                        {result.category}
                      </span>
                      <ArrowRightIcon className="h-5 w-5 text-gray-400 group-hover:text-primary-600 group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Initial State */}
        {!loading && !results && (
          <div className="text-center py-12">
            <MagnifyingGlassIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">Quick Navigation</h3>
            <p className="mt-2 text-sm text-gray-500">
              Search for pages and sections to quickly navigate
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">Contacts</span>
              <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">Deals</span>
              <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">SMS</span>
              <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">Settings</span>
              <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">Activities</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
