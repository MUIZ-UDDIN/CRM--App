import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/api';

interface SubscriptionStatus {
  isTrialExpired: boolean;
  isTrialActive: boolean;
  isSubscriptionActive: boolean;
  daysRemaining: number;
  subscriptionStatus: string;
  companyName: string;
  canAccessPremiumFeatures: boolean;
}

interface UseSubscriptionReturn extends SubscriptionStatus {
  loading: boolean;
  isReadOnly: boolean;
  isCompanyAdmin: boolean;
  isSuperAdmin: boolean;
  checkFeatureAccess: (featureName?: string) => boolean;
  redirectToBilling: () => void;
  showUpgradePrompt: (featureName?: string) => void;
  refetch: () => Promise<void>;
}

export function useSubscription(): UseSubscriptionReturn {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<SubscriptionStatus>({
    isTrialExpired: false,
    isTrialActive: false,
    isSubscriptionActive: false,
    daysRemaining: 0,
    subscriptionStatus: 'trial',
    companyName: '',
    canAccessPremiumFeatures: true,
  });

  const isCompanyAdmin = user?.role === 'company_admin' || 
                         user?.role === 'admin' || 
                         user?.role === 'Admin';
  
  const isSuperAdmin = user?.role === 'super_admin' || 
                       user?.email === 'admin@sunstonecrm.com';

  const fetchSubscriptionStatus = useCallback(async () => {
    if (!user?.company_id || isSuperAdmin) {
      setLoading(false);
      // Super admin always has access
      if (isSuperAdmin) {
        setStatus(prev => ({ ...prev, canAccessPremiumFeatures: true, isSubscriptionActive: true }));
      }
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await axios.get(`${API_URL}/companies/${user.company_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const company = response.data;
      
      // Check if company data is valid
      if (!company || !company.id) {
        setLoading(false);
        return;
      }
      
      // Calculate days remaining
      let daysRemaining = 14; // Default to 14 days for new companies without trial_ends_at
      let hasTrialEndDate = false;
      
      if (company.trial_ends_at) {
        hasTrialEndDate = true;
        const trialEnd = new Date(company.trial_ends_at);
        const now = new Date();
        // Use floor instead of ceil to ensure we don't give extra time
        // If trial_ends_at is in the past, daysRemaining will be negative
        const timeDiff = trialEnd.getTime() - now.getTime();
        daysRemaining = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      }

      const subscriptionStatus = company.subscription_status || 'trial';
      
      // Trial is expired if:
      // 1. subscription_status is explicitly 'expired', OR
      // 2. trial_ends_at exists AND the date has passed (daysRemaining < 0)
      // daysRemaining === 0 means trial ends today, so still allow access
      // New companies without trial_ends_at are NOT considered expired
      const isTrialExpired = subscriptionStatus === 'expired' || 
                             (hasTrialEndDate && daysRemaining < 0);
      const isSubscriptionActive = subscriptionStatus === 'active';
      // Trial is active if status is 'trial' and either no end date set OR days remaining >= 0
      const isTrialActive = subscriptionStatus === 'trial' && 
                            (!hasTrialEndDate || daysRemaining >= 0);

      // Sunstone company (platform owner) always has access
      const companyNameLower = company.name?.toLowerCase() || '';
      const isSunstoneCompany = companyNameLower.includes('sunstone') || 
                                subscriptionStatus === 'platform_owner';

      setStatus({
        isTrialExpired: isSunstoneCompany ? false : isTrialExpired,
        isTrialActive: isSunstoneCompany ? false : isTrialActive,
        isSubscriptionActive: isSunstoneCompany ? true : isSubscriptionActive,
        daysRemaining: Math.max(0, daysRemaining),
        subscriptionStatus,
        companyName: company.name,
        canAccessPremiumFeatures: isSunstoneCompany || isSubscriptionActive || isTrialActive,
      });
    } catch (error) {
      console.error('Failed to fetch subscription status:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.company_id, isSuperAdmin]);

  useEffect(() => {
    fetchSubscriptionStatus();
  }, [fetchSubscriptionStatus]);

  const redirectToBilling = useCallback(() => {
    if (isCompanyAdmin) {
      navigate('/billing');
    }
  }, [isCompanyAdmin, navigate]);

  const showUpgradePrompt = useCallback((featureName?: string) => {
    if (isCompanyAdmin) {
      const message = featureName 
        ? `"${featureName}" requires an active subscription. Upgrade now to access this feature.`
        : 'This feature requires an active subscription. Upgrade now to continue.';
      
      toast.error(message, { 
        duration: 5000,
        id: 'trial-expired-prompt'
      });
      
      // Auto-redirect to billing after showing toast
      setTimeout(() => {
        navigate('/billing');
      }, 2000);
    } else {
      // Regular user
      toast.error('Your company\'s trial has ended. Please contact your administrator to upgrade.', {
        duration: 5000,
        id: 'trial-expired-user'
      });
    }
  }, [isCompanyAdmin, navigate]);

  const checkFeatureAccess = useCallback((featureName?: string): boolean => {
    // Super admin always has access
    if (isSuperAdmin) return true;
    
    // If subscription is active or trial is active, allow access
    if (status.canAccessPremiumFeatures) return true;
    
    // Trial expired - show prompt and return false
    showUpgradePrompt(featureName);
    return false;
  }, [isSuperAdmin, status.canAccessPremiumFeatures, showUpgradePrompt]);

  // Read-only mode is active when trial is expired and user is not super admin
  const isReadOnly = !isSuperAdmin && status.isTrialExpired;

  return {
    ...status,
    loading,
    isReadOnly,
    isCompanyAdmin,
    isSuperAdmin,
    checkFeatureAccess,
    redirectToBilling,
    showUpgradePrompt,
    refetch: fetchSubscriptionStatus,
  };
}

export default useSubscription;
