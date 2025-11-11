import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  BuildingOfficeIcon, 
  EnvelopeIcon, 
  LockClosedIcon, 
  UserIcon, 
  PhoneIcon, 
  CheckCircleIcon, 
  ExclamationCircleIcon 
} from '@heroicons/react/24/outline';
import axios from 'axios';

const API_URL = 'https://sunstonecrm.com/api';

interface RegistrationForm {
  company_name: string;
  admin_email: string;
  admin_password: string;
  admin_first_name: string;
  admin_last_name: string;
  phone: string;
}

export default function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState<RegistrationForm>({
    company_name: '',
    admin_email: '',
    admin_password: '',
    admin_first_name: '',
    admin_last_name: '',
    phone: ''
  });

  const [passwordStrength, setPasswordStrength] = useState({
    hasUpper: false,
    hasLower: false,
    hasNumber: false,
    hasLength: false
  });

  const handlePasswordChange = (password: string) => {
    setFormData({ ...formData, admin_password: password });
    setPasswordStrength({
      hasUpper: /[A-Z]/.test(password),
      hasLower: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      hasLength: password.length >= 8
    });
  };

  const isPasswordValid = Object.values(passwordStrength).every(v => v);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/register/company`, formData);
      
      if (response.data.success) {
        // Store the access token
        localStorage.setItem('token', response.data.access_token);
        localStorage.setItem('user', JSON.stringify({
          email: response.data.admin_email,
          company_id: response.data.company_id
        }));
        
        setSuccess(true);
        
        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      }
    } catch (err: any) {
      // Better error handling with user-friendly messages
      const errorDetail = err.response?.data?.detail;
      
      if (typeof errorDetail === 'string') {
        // Display the backend's user-friendly error message directly
        setError(errorDetail);
      } else if (Array.isArray(errorDetail)) {
        // Handle validation errors array
        const firstError = errorDetail[0];
        if (firstError && firstError.msg) {
          setError(firstError.msg);
        } else {
          setError('Please check your information and correct any errors.');
        }
      } else {
        setError('We encountered an issue creating your account. Please try again or contact support if the problem persists.');
      }
      
      console.error('Registration error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircleIcon className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Sunstone CRM! 🎉</h2>
          <p className="text-gray-600 mb-4">
            Your account has been created successfully with a 14-day free trial.
          </p>
          <p className="text-sm text-gray-500">
            Redirecting to your dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <BuildingOfficeIcon className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Start Your Free Trial</h1>
          <p className="text-gray-600">14 days free • No credit card required • Full access</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <ExclamationCircleIcon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Company Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company Name *
            </label>
            <div className="relative">
              <BuildingOfficeIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                required
                maxLength={100}
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Acme Corporation"
              />
              <p className="mt-1 text-xs text-gray-500">{formData.company_name.length}/100 characters</p>
            </div>
          </div>

          {/* Name Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Name *
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  required
                  maxLength={50}
                  value={formData.admin_first_name}
                  onChange={(e) => setFormData({ ...formData, admin_first_name: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="John"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Last Name *
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  required
                  maxLength={50}
                  value={formData.admin_last_name}
                  onChange={(e) => setFormData({ ...formData, admin_last_name: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Doe"
                />
              </div>
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Work Email *
            </label>
            <div className="relative">
              <EnvelopeIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                required
                value={formData.admin_email}
                onChange={(e) => setFormData({ ...formData, admin_email: e.target.value })}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="john@company.com"
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number (Optional)
            </label>
            <div className="relative">
              <PhoneIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="tel"
                maxLength={20}
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="+1 (555) 000-0000"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password *
            </label>
            <div className="relative">
              <LockClosedIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                required
                maxLength={128}
                value={formData.admin_password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Create a strong password"
              />
            </div>
            
            {/* Password Strength Indicator */}
            {formData.admin_password && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2 text-xs">
                  <div className={`w-2 h-2 rounded-full ${passwordStrength.hasLength ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className={passwordStrength.hasLength ? 'text-green-700' : 'text-gray-500'}>
                    At least 8 characters
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className={`w-2 h-2 rounded-full ${passwordStrength.hasUpper ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className={passwordStrength.hasUpper ? 'text-green-700' : 'text-gray-500'}>
                    One uppercase letter
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className={`w-2 h-2 rounded-full ${passwordStrength.hasLower ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className={passwordStrength.hasLower ? 'text-green-700' : 'text-gray-500'}>
                    One lowercase letter
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className={`w-2 h-2 rounded-full ${passwordStrength.hasNumber ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className={passwordStrength.hasNumber ? 'text-green-700' : 'text-gray-500'}>
                    One number
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !isPasswordValid}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Creating your account...' : 'Start Free Trial'}
          </button>

          {/* Terms */}
          <p className="text-xs text-center text-gray-500">
            By signing up, you agree to our{' '}
            <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Terms of Service</a>
            {' '}and{' '}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Privacy Policy</a>
          </p>

          {/* Login Link */}
          <div className="text-center pt-4 border-t">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="text-blue-600 font-semibold hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
