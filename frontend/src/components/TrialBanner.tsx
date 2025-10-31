import { useState, useEffect } from 'react';
import { XMarkIcon, ClockIcon, CreditCardIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import axios from 'axios';

const API_URL = 'https://sunstonecrm.com/api';

interface CompanyInfo {
  subscription_status: string;
  trial_ends_at: string | null;
  days_remaining: number;
}

export default function TrialBanner() {
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCompanyInfo();
  }, []);

  const fetchCompanyInfo = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await axios.get(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const user = response.data;
      
      // Fetch company details
      if (user.company_id) {
        const companyResponse = await axios.get(`${API_URL}/companies/${user.company_id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const company = companyResponse.data;
        
        // Calculate days remaining
        if (company.trial_ends_at) {
          const trialEnd = new Date(company.trial_ends_at);
          const now = new Date();
          const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          setCompanyInfo({
            subscription_status: company.subscription_status,
            trial_ends_at: company.trial_ends_at,
            days_remaining: Math.max(0, daysRemaining)
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch company info:', error);
    } finally {
      setLoading(false);
    }
  };

  // Don't show banner if dismissed, loading, or no company info
  if (loading || dismissed || !companyInfo) return null;

  // Don't show if subscription is active (paid)
  if (companyInfo.subscription_status === 'active') return null;

  // Show different banners based on status
  const isTrialExpired = companyInfo.subscription_status === 'expired' || companyInfo.days_remaining <= 0;
  const isTrialEndingSoon = companyInfo.days_remaining <= 3 && companyInfo.days_remaining > 0;

  // Trial Expired - Critical
  if (isTrialExpired) {
    return (
      <div className="bg-red-600 text-white px-4 py-3 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <ClockIcon className="w-6 h-6 flex-shrink-0" />
            <div>
              <p className="font-semibold">Your trial has expired</p>
              <p className="text-sm text-red-100">
                Upgrade now to continue using Sunstone CRM
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/billing"
              className="bg-white text-red-600 px-6 py-2 rounded-lg font-semibold hover:bg-red-50 transition-colors flex items-center gap-2"
            >
              <CreditCardIcon className="w-5 h-5" />
              Upgrade Now
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Trial Ending Soon - Warning
  if (isTrialEndingSoon) {
    return (
      <div className="bg-orange-500 text-white px-4 py-3 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <ClockIcon className="w-6 h-6 flex-shrink-0 animate-pulse" />
            <div>
              <p className="font-semibold">
                {companyInfo.days_remaining} {companyInfo.days_remaining === 1 ? 'day' : 'days'} left in your trial
              </p>
              <p className="text-sm text-orange-100">
                Upgrade now to avoid interruption
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/billing"
              className="bg-white text-orange-600 px-6 py-2 rounded-lg font-semibold hover:bg-orange-50 transition-colors flex items-center gap-2"
            >
              <CreditCardIcon className="w-5 h-5" />
              Upgrade
            </Link>
            <button
              onClick={() => setDismissed(true)}
              className="p-2 hover:bg-orange-600 rounded-lg transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Trial Active - Info
  return (
    <div className="bg-blue-600 text-white px-4 py-3 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <ClockIcon className="w-6 h-6 flex-shrink-0" />
          <div>
            <p className="font-semibold">
              {companyInfo.days_remaining} {companyInfo.days_remaining === 1 ? 'day' : 'days'} left in your free trial
            </p>
            <p className="text-sm text-blue-100">
              Enjoying Sunstone CRM? Upgrade to continue after your trial ends
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/billing"
            className="bg-white text-blue-600 px-6 py-2 rounded-lg font-semibold hover:bg-blue-50 transition-colors flex items-center gap-2"
          >
            <CreditCardIcon className="w-5 h-5" />
            View Plans
          </Link>
          <button
            onClick={() => setDismissed(true)}
            className="p-2 hover:bg-blue-700 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
