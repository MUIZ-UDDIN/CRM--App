import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import * as quotesService from '../services/quotesService';
import SearchableSelect from '../components/common/SearchableSelect';
import ActionButtons from '../components/common/ActionButtons';
import Pagination from '../components/Pagination';
import { 
  DocumentTextIcon, 
  PlusIcon, 
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';

interface Quote {
  id: string;
  quote_number: string;
  title: string;
  amount: number;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  client_id?: string;
  deal_id?: string;
  valid_until: string;
  created_at: string;
}

export default function Quotes() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showAddModal, setShowAddModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(false);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [contactOptions, setContactOptions] = useState<{label: string, value: string}[]>([]);
  const [quoteForm, setQuoteForm] = useState({
    title: '',
    amount: '',
    client_id: '',
    deal_id: '',
    valid_until: '',
    status: 'draft',
  });
  const [isCreating, setIsCreating] = useState(false);

  // Prevent background scroll when modals are open
  useEffect(() => {
    if (showAddModal || showEditModal || showViewModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showAddModal, showEditModal, showViewModal]);

  const resetQuoteForm = () => {
    setQuoteForm({
      title: '',
      amount: '',
      client_id: '',
      deal_id: '',
      valid_until: '',
      status: 'draft',
    });
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
    resetQuoteForm();
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    resetQuoteForm();
  };

  // Check for action query parameter
  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'add') {
      resetQuoteForm();
      setShowAddModal(true);
      searchParams.delete('action');
      setSearchParams(searchParams);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchQuotes();
    fetchContacts();
  }, [filterStatus]);

  // Listen for real-time WebSocket updates
  useEffect(() => {
    const handleEntityChange = (event: any) => {
      const { entity_type, action } = event.detail;
      
      // Refresh quotes when any quote is created, updated, or deleted
      if (entity_type === 'quote') {
        fetchQuotes();
      }
    };

    window.addEventListener('entity_change', handleEntityChange);
    return () => window.removeEventListener('entity_change', handleEntityChange);
  }, []);

  const fetchContacts = async () => {
    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_BASE_URL}/api/contacts/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setContacts(data);
        // Create searchable options
        const options = data.map((c: any) => ({
          label: `${c.first_name} ${c.last_name} (${c.email})`,
          value: c.id
        }));
        setContactOptions(options);
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  };

  // Check if quote is expired
  const isQuoteExpired = (validUntil: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const validDate = new Date(validUntil);
    validDate.setHours(0, 0, 0, 0);
    return validDate < today;
  };

  const fetchQuotes = async () => {
    setLoading(true);
    try {
      const data = await quotesService.getQuotes({ status: filterStatus !== 'all' ? filterStatus : undefined });
      // Use status from backend - backend manages expired status automatically
      setQuotes(data);
    } catch (error) {
      console.error('Error fetching quotes:', error);
      toast.error('Failed to load quotes');
      setQuotes([]);
    } finally {
      setLoading(false);
    }
  };

  const getClientName = (clientId?: string) => {
    if (!clientId) return 'No Client';
    const contact = contacts.find(c => c.id === clientId);
    return contact ? `${contact.first_name} ${contact.last_name}` : 'Unknown Client';
  };

  const handleView = (quote: Quote) => {
    setSelectedQuote(quote);
    setShowViewModal(true);
  };

  const handleEdit = (quote: Quote) => {
    resetQuoteForm(); // Reset form first
    setSelectedQuote(quote);
    setQuoteForm({
      title: quote.title,
      amount: quote.amount.toString(),
      client_id: quote.client_id || '',
      deal_id: quote.deal_id || '',
      valid_until: quote.valid_until,
      status: quote.status,
    });
    setShowEditModal(true);
  };

  const handleDelete = async (quote: Quote) => {
    if (!confirm(`Delete quote "${quote.quote_number}"?`)) return;
    try {
      await quotesService.deleteQuote(quote.id);
      toast.success('Quote deleted');
      fetchQuotes();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(error?.response?.data?.detail || error?.message || 'Failed to delete quote');
    }
  };

  const handleDownload = async (quote: Quote) => {
    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      
      const response = await fetch(`${API_BASE_URL}/api/quotes/${quote.id}/download`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.status === 404) {
        toast.error('Download feature is not yet available. Please contact support.');
        return;
      }
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${quote.quote_number}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Quote downloaded successfully');
      } else {
        toast.error('Failed to download quote. Please try again.');
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Download feature is not yet available. Please contact support.');
    }
  };

  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Check if input contains HTML tags or scripts
  const containsHTMLOrScript = (input: string): boolean => {
    const htmlPattern = /<[^>]*>/g;
    const scriptPattern = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
    return htmlPattern.test(input) || scriptPattern.test(input);
  };

  // Get days until expiry or expired message
  const getExpiryMessage = (validUntil: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const validDate = new Date(validUntil);
    validDate.setHours(0, 0, 0, 0);
    
    const diffTime = validDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { text: `Expired ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''} ago`, color: 'text-red-600 bg-red-50' };
    } else if (diffDays === 0) {
      return { text: 'Expires today', color: 'text-orange-600 bg-orange-50' };
    } else if (diffDays === 1) {
      return { text: 'Expires tomorrow', color: 'text-yellow-600 bg-yellow-50' };
    } else if (diffDays <= 7) {
      return { text: `${diffDays} days left`, color: 'text-yellow-600 bg-yellow-50' };
    } else {
      return { text: `Valid until ${validDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`, color: 'text-green-600 bg-green-50' };
    }
  };

  const handleCreate = async () => {
    if (isCreating) return;
    
    // Validate mandatory fields
    if (!quoteForm.title.trim()) {
      toast.error('Quote Title is required');
      return;
    }

    // Check character limit
    if (quoteForm.title.length > 255) {
      toast.error('Quote Title cannot exceed 255 characters');
      return;
    }

    // Check for HTML/script tags
    if (containsHTMLOrScript(quoteForm.title)) {
      toast.error('Quote Title cannot contain HTML or script tags');
      return;
    }

    if (!quoteForm.amount || quoteForm.amount.trim() === '') {
      toast.error('Amount is required');
      return;
    }

    const amount = parseFloat(quoteForm.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }

    if (!quoteForm.valid_until || quoteForm.valid_until.trim() === '') {
      toast.error('Valid Until date is required');
      return;
    }

    // Validate that valid_until is a future date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const validUntilDate = new Date(quoteForm.valid_until);
    validUntilDate.setHours(0, 0, 0, 0);

    if (validUntilDate < today) {
      toast.error('Valid Until date must be today or a future date');
      return;
    }

    setIsCreating(true);
    try {
      const payload: any = {
        title: quoteForm.title,
        amount: amount,
        status: quoteForm.status as any,
        valid_until: quoteForm.valid_until,
      };
      
      // Only add client_id if it has a value
      if (quoteForm.client_id && quoteForm.client_id.trim()) {
        payload.client_id = quoteForm.client_id;
      }
      
      // Only add deal_id if it has a value
      if (quoteForm.deal_id && quoteForm.deal_id.trim()) {
        payload.deal_id = quoteForm.deal_id;
      }
      
      await quotesService.createQuote(payload);
      toast.success('Quote created');
      setShowAddModal(false);
      setQuoteForm({
        title: '',
        amount: '',
        client_id: '',
        deal_id: '',
        valid_until: '',
        status: 'draft',
      });
      fetchQuotes();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.detail || error?.message || 'Failed to create quote';
      toast.error(errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedQuote) return;

    // Validate mandatory fields
    if (!quoteForm.title.trim()) {
      toast.error('Quote Title is required');
      return;
    }

    // Check character limit
    if (quoteForm.title.length > 255) {
      toast.error('Quote Title cannot exceed 255 characters');
      return;
    }

    // Check for HTML/script tags
    if (containsHTMLOrScript(quoteForm.title)) {
      toast.error('Quote Title cannot contain HTML or script tags');
      return;
    }

    if (!quoteForm.amount || quoteForm.amount.trim() === '') {
      toast.error('Amount is required');
      return;
    }

    const amount = parseFloat(quoteForm.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }

    if (!quoteForm.valid_until || quoteForm.valid_until.trim() === '') {
      toast.error('Valid Until date is required');
      return;
    }

    // Validate that valid_until is a future date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const validUntilDate = new Date(quoteForm.valid_until);
    validUntilDate.setHours(0, 0, 0, 0);

    if (validUntilDate < today) {
      toast.error('Valid Until date must be today or a future date');
      return;
    }

    try {
      const payload: any = {
        title: quoteForm.title,
        amount: amount,
        status: quoteForm.status as any,
        valid_until: quoteForm.valid_until,
      };
      
      // Only add client_id if it has a value
      if (quoteForm.client_id && quoteForm.client_id.trim()) {
        payload.client_id = quoteForm.client_id;
      }
      
      // Only add deal_id if it has a value
      if (quoteForm.deal_id && quoteForm.deal_id.trim()) {
        payload.deal_id = quoteForm.deal_id;
      }
      
      // Only add valid_until if it has a value
      if (quoteForm.valid_until && quoteForm.valid_until.trim()) {
        payload.valid_until = quoteForm.valid_until;
      }
      
      await quotesService.updateQuote(selectedQuote.id, payload);
      toast.success('Quote updated');
      setShowEditModal(false);
      fetchQuotes();
    } catch (error) {
      toast.error('Failed to update quote');
    }
  };

  const handleStatusChange = async (quote: Quote, newStatus: string) => {
    try {
      await quotesService.updateQuote(quote.id, { status: newStatus as any });
      toast.success(`Quote ${newStatus}`);
      fetchQuotes();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const filteredQuotes = quotes.filter(quote => {
    const matchesSearch = 
      quote.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quote.quote_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getClientName(quote.client_id).toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || quote.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  // Pagination
  const itemsPerPage = 15;
  const totalPages = Math.ceil(filteredQuotes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedQuotes = filteredQuotes.slice(startIndex, endIndex);

  // Reset to page 1 when search/filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="px-4 sm:px-6 lg:max-w-7xl xl:max-w-8xl 2xl:max-w-9xl 3xl:max-w-10xl lg:mx-auto lg:px-8">
          <div className="py-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold leading-7 text-gray-900">All Quotes</h1>
              <p className="mt-1 text-sm text-gray-500">
                Manage your quotes and proposals
              </p>
            </div>
            <button
              onClick={() => {
                resetQuoteForm();
                setShowAddModal(true);
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Create Quote
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 sm:px-6 lg:max-w-7xl xl:max-w-8xl 2xl:max-w-9xl 3xl:max-w-10xl lg:mx-auto lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search quotes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg transition-colors ${
                showFilters 
                  ? 'bg-primary-100 text-primary-600' 
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              }`}
              title="Toggle Filters"
            >
              <FunnelIcon className="h-5 w-5" />
            </button>
            {showFilters && (
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 min-w-[140px]"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
              </select>
            )}
          </div>
        </div>

        {/* Quotes List */}
        <div className="space-y-4">
          {loading ? (
            <div className="p-12 text-center bg-white rounded-lg shadow">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading quotes...</p>
            </div>
          ) : filteredQuotes.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-lg shadow">
              <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No quotes</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating a new quote.</p>
            </div>
          ) : (
            paginatedQuotes.map((quote) => (
              <div key={quote.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  {/* Quote Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">{quote.title}</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full capitalize ${
                            quote.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                            quote.status === 'accepted' ? 'bg-green-100 text-green-800' :
                            quote.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            quote.status === 'expired' ? 'bg-orange-100 text-orange-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {quote.status}
                          </span>
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
                      <div>
                        <p className="text-xs text-gray-500">Quote #</p>
                        <p className="text-sm font-medium text-gray-900">{quote.quote_number}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Amount</p>
                        <p className="text-sm font-medium text-gray-900">{formatCurrency(quote.amount)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Client</p>
                        <p className="text-sm font-medium text-gray-900 truncate">{getClientName(quote.client_id)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Valid Until</p>
                        <p className="text-sm font-medium text-gray-900">{formatDate(quote.valid_until)}</p>
                        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full mt-1 ${getExpiryMessage(quote.valid_until).color}`}>
                          {getExpiryMessage(quote.valid_until).text}
                        </span>
                      </div>
                    </div>

                    {quote.deal_id && (
                      <div className="mt-3">
                        <p className="text-xs text-gray-500">Related Deal</p>
                        <p className="text-sm text-primary-600">Deal ID: {quote.deal_id}</p>
                      </div>
                    )}

                    <div className="mt-3">
                      <p className="text-xs text-gray-500">Created</p>
                      <p className="text-sm text-gray-600">{formatDate(quote.created_at)}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex lg:flex-col items-center gap-2 flex-shrink-0">
                    {quote.status === 'draft' && (
                      <div className="flex gap-2 mb-2">
                        <button
                          onClick={() => handleStatusChange(quote, 'sent')}
                          className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
                        >
                          Send
                        </button>
                      </div>
                    )}
                    {quote.status === 'sent' && (
                      <div className="flex gap-2 mb-2">
                        <button
                          onClick={() => handleStatusChange(quote, 'accepted')}
                          className="px-3 py-1 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleStatusChange(quote, 'rejected')}
                          className="px-3 py-1 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDownload(quote)}
                        className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                        title="Download"
                      >
                        <ArrowDownTrayIcon className="h-4 w-4" />
                      </button>
                      <ActionButtons
                        onView={() => handleView(quote)}
                        onEdit={() => handleEdit(quote)}
                        onDelete={() => handleDelete(quote)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Pagination */}
          {filteredQuotes.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredQuotes.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          )}
        </div>
      </div>

      {/* Add Quote Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Create Quote</h3>
              <button onClick={handleCloseAddModal} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quote Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter quote title"
                  value={quoteForm.title}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (containsHTMLOrScript(value)) {
                      toast.error('HTML or script tags are not allowed');
                      return;
                    }
                    setQuoteForm({...quoteForm, title: value});
                  }}
                  maxLength={255}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  {quoteForm.title.length}/255 characters
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  placeholder="Enter amount"
                  value={quoteForm.amount}
                  onChange={(e) => setQuoteForm({...quoteForm, amount: e.target.value})}
                  onKeyDown={(e) => {
                    if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+') {
                      e.preventDefault();
                    }
                  }}
                  min="0.01"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client
                </label>
                <select
                  value={quoteForm.client_id}
                  onChange={(e) => setQuoteForm({...quoteForm, client_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="">Select Client (Optional)</option>
                  {contacts.map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.first_name} {contact.last_name} ({contact.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valid Until <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={quoteForm.valid_until}
                  onChange={(e) => setQuoteForm({...quoteForm, valid_until: e.target.value})}
                  min={getTodayDate()}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 cursor-pointer"
                  onClick={(e) => e.currentTarget.showPicker && e.currentTarget.showPicker()}
                  required
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={handleCloseAddModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={isCreating}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreating ? 'Creating...' : 'Create Quote'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Quote Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Edit Quote</h3>
              <button onClick={handleCloseEditModal} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quote Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter quote title"
                  value={quoteForm.title}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (containsHTMLOrScript(value)) {
                      toast.error('HTML or script tags are not allowed');
                      return;
                    }
                    setQuoteForm({...quoteForm, title: value});
                  }}
                  maxLength={255}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  {quoteForm.title.length}/255 characters
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  placeholder="Enter amount"
                  value={quoteForm.amount}
                  onChange={(e) => setQuoteForm({...quoteForm, amount: e.target.value})}
                  onKeyDown={(e) => {
                    if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+') {
                      e.preventDefault();
                    }
                  }}
                  min="0.01"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client
                </label>
                <select
                  value={quoteForm.client_id}
                  onChange={(e) => setQuoteForm({...quoteForm, client_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="">Select Client (Optional)</option>
                  {contacts.map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.first_name} {contact.last_name} ({contact.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valid Until <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={quoteForm.valid_until}
                  onChange={(e) => setQuoteForm({...quoteForm, valid_until: e.target.value})}
                  min={getTodayDate()}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 cursor-pointer"
                  onClick={(e) => e.currentTarget.showPicker && e.currentTarget.showPicker()}
                  required
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={handleCloseEditModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdate}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Quote Modal */}
      {showViewModal && selectedQuote && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Quote Details</h3>
              <button onClick={() => setShowViewModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">Quote Number</label>
                <p className="text-gray-900">{selectedQuote.quote_number}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Title</label>
                <p className="text-gray-900">{selectedQuote.title}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Amount</label>
                <p className="text-gray-900">{formatCurrency(selectedQuote.amount)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Client</label>
                <p className="text-gray-900">{getClientName(selectedQuote.client_id)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Status</label>
                <p className="text-gray-900 capitalize">{selectedQuote.status}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Valid Until</label>
                <p className="text-gray-900">{formatDate(selectedQuote.valid_until)}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
