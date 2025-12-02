import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [isSuspended, setIsSuspended] = useState(false);
  const [supportEmail] = useState('admin@sunstonecrm.com');

  const { login, isLoading, error, clearError, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Safety check: On mount, ensure login page is in clean state
  useEffect(() => {
    // Clear any error state from previous attempts
    clearError();
    
    // If there's no token, ensure user data is also cleared
    const token = localStorage.getItem('token');
    if (!token) {
      localStorage.removeItem('user');
    }
  }, []);
  
  // Safety check: If user is on login page, ensure auth state is clean
  useEffect(() => {
    // If there's no token but isAuthenticated is true, clear the state
    const token = localStorage.getItem('token');
    if (!token && isAuthenticated) {
      localStorage.removeItem('user');
      // Force page reload to reset auth state
      window.location.reload();
    }
  }, [isAuthenticated]);
  
  // Load saved credentials on component mount
  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    const savedRememberMe = localStorage.getItem('rememberMe') === 'true';
    if (savedEmail && savedRememberMe) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);
  
  // Handle errors
  useEffect(() => {
    if (error) {
      toast.error(error);
      clearError();
    }
  }, [error, clearError]);
  
  // Handle successful login
  useEffect(() => {
    if (loginSuccess) {
      window.location.href = '/dashboard';
    }
  }, [loginSuccess]);

  // If already authenticated, redirect to dashboard
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsSubmitting(true);

    try {
      // Use the login function from AuthContext instead of direct API call
      const result = await login(email, password);
      
      // Handle remember me
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
        localStorage.setItem('rememberMe', 'true');
      } else {
        localStorage.removeItem('rememberedEmail');
        localStorage.removeItem('rememberMe');
      }
      
      // Verify token is in localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        // If token is missing, set it from the result
        if (result && result.access_token) {
          localStorage.setItem('token', result.access_token);
        } else {
          throw new Error('No access token received');
        }
      }
      
      // Double check user data is stored
      if (result && result.user) {
        localStorage.setItem('user', JSON.stringify(result.user));
      }
      
      toast.success('Login successful!');
      
      // Navigate without full page reload
      navigate('/dashboard');
      
    } catch (error: any) {
      // Check if account is suspended
      if (error.response?.status === 403 && error.response?.data?.detail === 'ACCOUNT_SUSPENDED') {
        setIsSuspended(true);
        // Don't show toast - we have a dedicated UI
      } else if (error.message === 'ACCOUNT_SUSPENDED') {
        // Fallback check if response structure is different
        setIsSuspended(true);
        // Don't show toast - we have a dedicated UI
      } else {
        // Only show toast for non-suspension errors
        toast.error(error.message || 'Login failed');
      }
      // Only log in development mode
      if (import.meta.env.DEV) {
        console.error('Login error:', error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // If account is suspended, show suspension message
  if (isSuspended) {
    return (
      <div className="w-full max-w-md xl:max-w-lg 2xl:max-w-xl space-y-6 sm:space-y-8">
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 sm:p-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-red-100 rounded-full p-3">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-red-900 text-center mb-3">
            Account Suspended
          </h2>
          
          <p className="text-red-800 text-center mb-6">
            Your company account has been suspended and you cannot log in at this time.
          </p>
          
          <div className="bg-white rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-700 mb-2">
              <span className="font-semibold">Need help?</span> Please contact our support team:
            </p>
            <a 
              href={`mailto:${supportEmail}`}
              className="flex items-center justify-center gap-2 text-primary-600 hover:text-primary-700 font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {supportEmail}
            </a>
          </div>
          
          <button
            onClick={() => setIsSuspended(false)}
            className="w-full py-3 px-4 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors duration-200"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md xl:max-w-lg 2xl:max-w-xl space-y-6 sm:space-y-8">
      <div className="text-center">
        <h2 className="text-2xl sm:text-3xl xl:text-4xl font-bold text-gray-900">Sign in to your account</h2>
        <p className="mt-2 text-sm text-gray-600">
          Or{' '}
          <Link
            to="/auth/register"
            className="font-medium text-primary-600 hover:text-primary-500 transition-colors duration-200"
          >
            create a new account
          </Link>
        </p>
      </div>

      <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div>
            <label htmlFor="email" className="sr-only">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="relative block w-full px-3 py-2 xl:px-4 xl:py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 text-sm xl:text-base"
              placeholder="Email address"
            />
          </div>

          <div className="relative">
            <label htmlFor="password" className="sr-only">
              Password
            </label>
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="relative block w-full px-3 py-2 xl:px-4 xl:py-3 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 text-sm xl:text-base"
              placeholder="Password"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeSlashIcon className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              ) : (
                <EyeIcon className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
              Remember me
            </label>
          </div>

          <div className="text-sm">
            <Link
              to="/auth/forgot-password"
              className="font-medium text-primary-600 hover:text-primary-500 transition-colors duration-200"
            >
              Forgot your password?
            </Link>
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={isSubmitting || isLoading}
            className="group relative w-full flex justify-center py-2 px-4 xl:py-3 xl:px-6 border border-transparent text-sm xl:text-base font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {isSubmitting || isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Signing in...
              </div>
            ) : (
              'Sign in'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}