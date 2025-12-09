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
  ClockIcon,
  DocumentTextIcon
} from '@heroicons/react/24/solid';
import * as searchService from '../services/searchService';
import type { GlobalSearchResponse, GlobalSearchResult, NavigationResult } from '../services/searchService';
import toast from 'react-hot-toast';

export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState<GlobalSearchResponse | null>(null);
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

  const handleResultClick = (path: string) => {
    navigate(path);
  };

  const getIcon = (iconName: string, size: string = "h-6 w-6") => {
    switch (iconName) {
      case 'home':
        return <HomeIcon className={size} />;
      case 'currency':
        return <CurrencyDollarIcon className={size} />;
      case 'users':
        return <UserGroupIcon className={size} />;
      case 'calendar':
        return <CalendarIcon className={size} />;
      case 'document':
        return <DocumentTextIcon className={size} />;
      case 'chart':
      case 'chart-bar':
        return <ChartBarIcon className={size} />;
      case 'envelope':
        return <EnvelopeIcon className={size} />;
      case 'chat':
        return <ChatBubbleLeftIcon className={size} />;
      case 'phone':
        return <PhoneIcon className={size} />;
      case 'folder':
        return <FolderIcon className={size} />;
      case 'cog':
        return <CogIcon className={size} />;
      case 'bell':
        return <BellIcon className={size} />;
      case 'clock':
        return <ClockIcon className={size} />;
      case 'user':
        return <UserGroupIcon className={size} />;
      default:
        return <DocumentIcon className={size} />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'contact':
        return 'bg-blue-100 text-blue-700';
      case 'deal':
        return 'bg-green-100 text-green-700';
      case 'quote':
        return 'bg-purple-100 text-purple-700';
      case 'file':
        return 'bg-yellow-100 text-yellow-700';
      case 'activity':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-gray-100 text-gray-700';
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

  const renderResultCard = (result: GlobalSearchResult) => (
    <div
      key={result.id}
      onClick={() => handleResultClick(result.path)}
      className="bg-white p-4 rounded-lg border border-gray-200 hover:border-primary-500 hover:shadow-md transition-all cursor-pointer group"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <div className="flex-shrink-0 w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center text-primary-600 group-hover:bg-primary-100 transition-colors">
            {getIcon(result.icon, "h-5 w-5")}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-gray-900 group-hover:text-primary-600 transition-colors truncate">
              {result.title}
            </h4>
            {result.subtitle && (
              <p className="text-xs text-gray-500 truncate">{result.subtitle}</p>
            )}
            {result.description && (
              <p className="text-xs text-gray-400 truncate">{result.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getTypeColor(result.type)}`}>
            {result.type}
          </span>
          <ArrowRightIcon className="h-4 w-4 text-gray-400 group-hover:text-primary-600 group-hover:translate-x-1 transition-all" />
        </div>
      </div>
    </div>
  );

  const renderPageCard = (result: NavigationResult, index: number) => (
    <div
      key={index}
      onClick={() => handleResultClick(result.path)}
      className="bg-white p-4 rounded-lg border border-gray-200 hover:border-primary-500 hover:shadow-md transition-all cursor-pointer group"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <div className="flex-shrink-0 w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center text-primary-600 group-hover:bg-primary-100 transition-colors">
            {getIcon(result.icon, "h-5 w-5")}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
              {result.name}
            </h4>
            <p className="text-xs text-gray-500">{result.description}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(result.category)}`}>
            {result.category}
          </span>
          <ArrowRightIcon className="h-4 w-4 text-gray-400 group-hover:text-primary-600 group-hover:translate-x-1 transition-all" />
        </div>
      </div>
    </div>
  );

  const hasResults = results && results.total_count > 0;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
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
              placeholder="Search contacts, deals, quotes, files, activities..."
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
        {!loading && results && results.total_count === 0 && (
          <div className="text-center py-12">
            <MagnifyingGlassIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No results found</h3>
            <p className="mt-2 text-sm text-gray-500">
              Try searching for contacts, deals, quotes, files, or activities
            </p>
          </div>
        )}

        {/* Results */}
        {!loading && hasResults && (
          <div>
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">
                Search Results
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Found {results.total_count} results for "{results.query}"
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Contacts */}
              {results.contacts.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <UserGroupIcon className="h-5 w-5 text-blue-600" />
                    Contacts ({results.contacts.length})
                  </h2>
                  <div className="space-y-2">
                    {results.contacts.map(renderResultCard)}
                  </div>
                </div>
              )}

              {/* Deals */}
              {results.deals.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <CurrencyDollarIcon className="h-5 w-5 text-green-600" />
                    Deals ({results.deals.length})
                  </h2>
                  <div className="space-y-2">
                    {results.deals.map(renderResultCard)}
                  </div>
                </div>
              )}

              {/* Quotes */}
              {results.quotes.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <DocumentTextIcon className="h-5 w-5 text-purple-600" />
                    Quotes ({results.quotes.length})
                  </h2>
                  <div className="space-y-2">
                    {results.quotes.map(renderResultCard)}
                  </div>
                </div>
              )}

              {/* Files */}
              {results.files.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <FolderIcon className="h-5 w-5 text-yellow-600" />
                    Files ({results.files.length})
                  </h2>
                  <div className="space-y-2">
                    {results.files.map(renderResultCard)}
                  </div>
                </div>
              )}

              {/* Activities */}
              {results.activities.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5 text-orange-600" />
                    Activities ({results.activities.length})
                  </h2>
                  <div className="space-y-2">
                    {results.activities.map(renderResultCard)}
                  </div>
                </div>
              )}

              {/* Pages */}
              {results.pages.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <HomeIcon className="h-5 w-5 text-indigo-600" />
                    Pages ({results.pages.length})
                  </h2>
                  <div className="space-y-2">
                    {results.pages.map((page, index) => renderPageCard(page, index))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Initial State */}
        {!loading && !results && (
          <div className="text-center py-12">
            <MagnifyingGlassIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">Global Search</h3>
            <p className="mt-2 text-sm text-gray-500">
              Search across all your data - contacts, deals, quotes, files, and activities
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">Contacts</span>
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">Deals</span>
              <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">Quotes</span>
              <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm">Files</span>
              <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">Activities</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
