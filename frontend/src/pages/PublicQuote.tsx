import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { 
  DocumentTextIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  ClockIcon,
  ArrowDownTrayIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/api';

interface QuoteData {
  quote_number: string;
  title: string;
  amount: number;
  status: string;
  valid_until: string | null;
  description: string | null;
  terms: string | null;
  created_at: string;
  sent_at: string | null;
  company_name: string | null;
  company_logo: string | null;
  client_name: string | null;
  client_email: string | null;
  is_expired: boolean;
  can_respond: boolean;
}

export default function PublicQuote() {
  const { token } = useParams<{ token: string }>();
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [responding, setResponding] = useState(false);
  const [responseNote, setResponseNote] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [pendingAction, setPendingAction] = useState<'accept' | 'reject' | null>(null);
  const [responseSuccess, setResponseSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchQuote();
  }, [token]);

  const fetchQuote = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/public/quote/${token}`);
      setQuote(response.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Quote not found or link has expired');
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = async (action: 'accept' | 'reject') => {
    if (!showNoteInput) {
      setPendingAction(action);
      setShowNoteInput(true);
      return;
    }

    try {
      setResponding(true);
      const response = await axios.post(`${API_BASE_URL}/public/quote/${token}/respond`, {
        action,
        note: responseNote || null
      });
      
      setResponseSuccess(response.data.message);
      // Refresh quote data
      await fetchQuote();
      setShowNoteInput(false);
      setResponseNote('');
      setPendingAction(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to submit response');
    } finally {
      setResponding(false);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/public/quote/${token}/pdf`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${quote?.quote_number || 'quote'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to download PDF');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; icon: any }> = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-800', icon: DocumentTextIcon },
      sent: { bg: 'bg-blue-100', text: 'text-blue-800', icon: ClockIcon },
      accepted: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircleIcon },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircleIcon },
      expired: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: ExclamationTriangleIcon },
    };
    
    const config = statusConfig[status] || statusConfig.draft;
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
        <Icon className="h-4 w-4" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error && !quote) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Quote Not Found</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!quote) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {quote.company_name || 'Quote'}
              </h1>
              <p className="text-gray-500">Quote #{quote.quote_number}</p>
            </div>
            {getStatusBadge(quote.status)}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Success Message */}
        {responseSuccess && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
            <CheckCircleIcon className="h-6 w-6 text-green-600 flex-shrink-0" />
            <p className="text-green-800">{responseSuccess}</p>
          </div>
        )}

        {/* Error Message */}
        {error && quote && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <XCircleIcon className="h-6 w-6 text-red-600 flex-shrink-0" />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Expired Warning */}
        {quote.is_expired && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
            <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600 flex-shrink-0" />
            <p className="text-yellow-800">This quote has expired and can no longer be accepted.</p>
          </div>
        )}

        {/* Quote Card */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Quote Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-8 text-white">
            <h2 className="text-2xl font-bold mb-2">{quote.title}</h2>
            <div className="text-4xl font-bold">{formatCurrency(quote.amount)}</div>
          </div>

          {/* Quote Details */}
          <div className="p-6 space-y-6">
            {/* Client Info */}
            {quote.client_name && (
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <span className="text-gray-500">Prepared for</span>
                <span className="font-medium text-gray-900">{quote.client_name}</span>
              </div>
            )}

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">Created</p>
                <p className="font-medium text-gray-900">{formatDate(quote.created_at)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">Valid Until</p>
                <p className={`font-medium ${quote.is_expired ? 'text-red-600' : 'text-gray-900'}`}>
                  {formatDate(quote.valid_until)}
                </p>
              </div>
            </div>

            {/* Description */}
            {quote.description && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
                <p className="text-gray-600 whitespace-pre-wrap">{quote.description}</p>
              </div>
            )}

            {/* Terms */}
            {quote.terms && (
              <div className="border-t border-gray-100 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Terms & Conditions</h3>
                <p className="text-gray-600 text-sm whitespace-pre-wrap">{quote.terms}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-100">
            {/* Note Input */}
            {showNoteInput && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Add a note (optional)
                </label>
                <textarea
                  value={responseNote}
                  onChange={(e) => setResponseNote(e.target.value)}
                  placeholder="Any comments or feedback..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                />
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleResponse(pendingAction!)}
                    disabled={responding}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium text-white ${
                      pendingAction === 'accept' 
                        ? 'bg-green-600 hover:bg-green-700' 
                        : 'bg-red-600 hover:bg-red-700'
                    } disabled:opacity-50`}
                  >
                    {responding ? 'Submitting...' : `Confirm ${pendingAction === 'accept' ? 'Accept' : 'Reject'}`}
                  </button>
                  <button
                    onClick={() => {
                      setShowNoteInput(false);
                      setResponseNote('');
                      setPendingAction(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {!showNoteInput && (
              <div className="flex flex-col sm:flex-row gap-3">
                {quote.can_respond && (
                  <>
                    <button
                      onClick={() => handleResponse('accept')}
                      disabled={responding}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      <CheckCircleIcon className="h-5 w-5" />
                      Accept Quote
                    </button>
                    <button
                      onClick={() => handleResponse('reject')}
                      disabled={responding}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      <XCircleIcon className="h-5 w-5" />
                      Reject Quote
                    </button>
                  </>
                )}
                <button
                  onClick={handleDownloadPdf}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <ArrowDownTrayIcon className="h-5 w-5" />
                  Download PDF
                </button>
              </div>
            )}

            {/* Already Responded Message */}
            {!quote.can_respond && !quote.is_expired && quote.status !== 'sent' && (
              <p className="text-center text-gray-500">
                This quote has been {quote.status}. Thank you for your response.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Powered by Sunstone CRM</p>
          {quote.company_name && (
            <p className="mt-1">Quote sent by {quote.company_name}</p>
          )}
        </div>
      </div>
    </div>
  );
}
