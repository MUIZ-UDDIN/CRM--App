import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { LockClosedIcon, CreditCardIcon } from '@heroicons/react/24/outline';
import useSubscription from '../hooks/useSubscription';
import { useAuth } from '../contexts/AuthContext';

interface FeatureGuardProps {
  children: ReactNode;
  featureName?: string;
  /** If true, shows a disabled overlay instead of blocking completely */
  showOverlay?: boolean;
  /** If true, allows read-only access (viewing) but blocks actions */
  allowReadOnly?: boolean;
}

/**
 * FeatureGuard component that restricts access to premium features when trial is expired.
 * 
 * Usage:
 * <FeatureGuard featureName="Create Deal">
 *   <button onClick={createDeal}>Create Deal</button>
 * </FeatureGuard>
 * 
 * Or wrap entire sections:
 * <FeatureGuard featureName="Deal Management" showOverlay>
 *   <DealForm />
 * </FeatureGuard>
 */
export default function FeatureGuard({ 
  children, 
  featureName,
  showOverlay = false,
  allowReadOnly = false
}: FeatureGuardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isTrialExpired, canAccessPremiumFeatures, loading } = useSubscription();

  const isCompanyAdmin = user?.role === 'company_admin' || 
                         user?.role === 'admin' || 
                         user?.role === 'Admin';
  
  const isSuperAdmin = user?.role === 'super_admin' || 
                       user?.email === 'admin@sunstonecrm.com';

  // Super admin always has access
  if (isSuperAdmin) {
    return <>{children}</>;
  }

  // Still loading subscription status
  if (loading) {
    return <>{children}</>;
  }

  // Has access - render children normally
  if (canAccessPremiumFeatures) {
    return <>{children}</>;
  }

  // Trial expired - show restricted UI
  if (isTrialExpired) {
    if (showOverlay) {
      // Show content with disabled overlay
      return (
        <div className="relative">
          <div className="opacity-50 pointer-events-none select-none">
            {children}
          </div>
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/10 backdrop-blur-[1px] rounded-lg">
            <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm mx-4 text-center">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <LockClosedIcon className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {featureName ? `${featureName} Locked` : 'Feature Locked'}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {isCompanyAdmin 
                  ? 'Your trial has ended. Upgrade to access this feature.'
                  : 'Your company\'s trial has ended. Contact your administrator.'}
              </p>
              {isCompanyAdmin && (
                <button
                  onClick={() => navigate('/billing')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  <CreditCardIcon className="w-4 h-4" />
                  Upgrade Now
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Block completely - show upgrade message
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
          <LockClosedIcon className="w-8 h-8 text-amber-600" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          {featureName ? `${featureName} Unavailable` : 'Feature Unavailable'}
        </h3>
        <p className="text-gray-600 text-center max-w-md mb-6">
          {isCompanyAdmin 
            ? 'Your trial has ended. Please upgrade your subscription to continue using all features.'
            : 'Your company\'s trial has ended. Please contact your administrator to upgrade.'}
        </p>
        {isCompanyAdmin && (
          <button
            onClick={() => navigate('/billing')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <CreditCardIcon className="w-5 h-5" />
            Upgrade Now
          </button>
        )}
      </div>
    );
  }

  // Default: render children
  return <>{children}</>;
}

/**
 * Hook to check if a specific action is allowed
 * Returns a function that can be called before performing an action
 */
export function useFeatureAccess() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isTrialExpired, canAccessPremiumFeatures } = useSubscription();

  const isCompanyAdmin = user?.role === 'company_admin' || 
                         user?.role === 'admin' || 
                         user?.role === 'Admin';
  
  const isSuperAdmin = user?.role === 'super_admin' || 
                       user?.email === 'admin@sunstonecrm.com';

  const checkAccess = (featureName?: string): boolean => {
    // Super admin always has access
    if (isSuperAdmin) return true;
    
    // Has active subscription or trial
    if (canAccessPremiumFeatures) return true;
    
    // Trial expired - redirect to billing for company admin
    if (isTrialExpired && isCompanyAdmin) {
      navigate('/billing');
      return false;
    }
    
    return false;
  };

  return {
    checkAccess,
    isTrialExpired,
    canAccessPremiumFeatures,
    isCompanyAdmin,
    isSuperAdmin
  };
}
