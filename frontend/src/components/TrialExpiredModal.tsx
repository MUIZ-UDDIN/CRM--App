import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { XMarkIcon, ExclamationTriangleIcon, CreditCardIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import useSubscription from '../hooks/useSubscription';

export default function TrialExpiredModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasShownThisSession, setHasShownThisSession] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isTrialExpired, loading, companyName } = useSubscription();

  const isCompanyAdmin = user?.role === 'company_admin' || 
                         user?.role === 'admin' || 
                         user?.role === 'Admin';
  
  const isSuperAdmin = user?.role === 'super_admin' || 
                       user?.email === 'admin@sunstonecrm.com';

  useEffect(() => {
    // Don't show for super admin
    if (isSuperAdmin) return;
    
    // Show modal every time user logs in when trial is expired
    // We use a flag that resets on page refresh/new login
    if (!loading && isTrialExpired && !hasShownThisSession) {
      // Small delay to let the page load first
      const timer = setTimeout(() => {
        setIsOpen(true);
        setHasShownThisSession(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [loading, isTrialExpired, isSuperAdmin, hasShownThisSession]);

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleUpgrade = () => {
    setIsOpen(false);
    navigate('/billing');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500 to-orange-500 px-6 py-8 text-white text-center relative">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-1 hover:bg-white/20 rounded-full transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <ExclamationTriangleIcon className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold">Trial Period Ended</h2>
          <p className="text-white/80 mt-2">Your free trial has expired</p>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {isCompanyAdmin ? (
            <>
              <p className="text-gray-700 text-center mb-4">
                Your trial has ended. Please upgrade to continue using all features of Sunstone CRM.
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                <h4 className="font-medium text-amber-800 mb-2">Limited Access Mode</h4>
                <ul className="text-sm text-amber-700 space-y-1">
                  <li>• View-only access to existing data</li>
                  <li>• Cannot create new records</li>
                  <li>• Premium features are disabled</li>
                </ul>
              </div>
              <button
                onClick={handleUpgrade}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                <CreditCardIcon className="w-5 h-5" />
                Upgrade Now
              </button>
              <button
                onClick={handleClose}
                className="w-full mt-3 text-gray-500 hover:text-gray-700 py-2 text-sm"
              >
                Continue with limited access
              </button>
            </>
          ) : (
            <>
              <p className="text-gray-700 text-center mb-4">
                Your company's trial has ended. Please contact your administrator to upgrade and restore full access.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h4 className="font-medium text-blue-800 mb-2">What you can do:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• View existing data (read-only)</li>
                  <li>• Contact your company administrator</li>
                  <li>• Wait for subscription to be activated</li>
                </ul>
              </div>
              <button
                onClick={handleClose}
                className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                I Understand
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
