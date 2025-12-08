import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  BuildingOfficeIcon, 
  EnvelopeIcon, 
  LockClosedIcon, 
  UserIcon, 
  PhoneIcon, 
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = 'https://sunstonecrm.com/api';

interface RegistrationForm {
  company_name: string;
  admin_email: string;
  admin_password: string;
  admin_first_name: string;
  admin_last_name: string;
  phone: string;
}

interface ValidationErrors {
  company_name?: string;
  admin_first_name?: string;
  admin_last_name?: string;
  admin_email?: string;
  phone?: string;
  admin_password?: string;
}

export default function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  
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

  // Real-time validation functions
  const validateCompanyName = (value: string): string | undefined => {
    if (!value.trim()) return 'Company name is required';
    if (value.length < 2) return 'Company name must be at least 2 characters';
    if (value.length > 100) return 'Company name cannot exceed 100 characters';
    if (/<script|<iframe|javascript:|onerror=|onload=/i.test(value)) {
      return 'Script tags and HTML are not allowed';
    }
    if (/<[^>]+>/.test(value)) return 'HTML tags are not allowed';
    if (!/^[a-zA-Z0-9\s\-\.&,'"()]+$/.test(value)) {
      return 'Only letters, numbers, spaces, and basic punctuation allowed';
    }
    return undefined;
  };

  const validateName = (value: string, fieldName: string): string | undefined => {
    if (!value.trim()) return `${fieldName} is required`;
    if (value.length > 50) return `${fieldName} cannot exceed 50 characters`;
    if (/<script|<iframe|javascript:|onerror=|onload=/i.test(value)) {
      return 'Script tags and HTML are not allowed';
    }
    if (/<[^>]+>/.test(value)) return 'HTML tags are not allowed';
    return undefined;
  };

  const validatePhone = (value: string): string | undefined => {
    if (!value) return undefined; // Optional field
    if (value.length > 20) return 'Phone number cannot exceed 20 characters';
    // Only allow digits, spaces, hyphens, parentheses, and plus sign
    if (!/^[\d\s\-\(\)\+]+$/.test(value)) {
      return 'Phone number can only contain numbers and formatting characters (+ - ( ) space)';
    }
    const digitsOnly = value.replace(/\D/g, '');
    if (digitsOnly.length < 10) return 'Phone number must contain at least 10 digits';
    return undefined;
  };

  const validateEmail = (value: string): string | undefined => {
    if (!value) return 'Email is required';
    // Strict email validation
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(value)) return 'Please enter a valid email address (e.g., user@example.com)';
    if (value.length > 255) return 'Email cannot exceed 255 characters';
    return undefined;
  };

  // Handle field changes with validation
  const handleFieldChange = (field: keyof RegistrationForm, value: string) => {
    setFormData({ ...formData, [field]: value });
    
    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors({ ...validationErrors, [field]: undefined });
    }
  };

  // Validate field on blur
  const handleFieldBlur = (field: keyof RegistrationForm) => {
    let error: string | undefined;
    
    switch (field) {
      case 'company_name':
        error = validateCompanyName(formData.company_name);
        break;
      case 'admin_first_name':
        error = validateName(formData.admin_first_name, 'First name');
        break;
      case 'admin_last_name':
        error = validateName(formData.admin_last_name, 'Last name');
        break;
      case 'admin_email':
        error = validateEmail(formData.admin_email);
        break;
      case 'phone':
        error = validatePhone(formData.phone);
        break;
    }
    
    if (error) {
      setValidationErrors({ ...validationErrors, [field]: error });
      toast.error(error);
    }
  };

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
    setLoading(true);

    // Validate all fields before submission
    const errors: ValidationErrors = {
      company_name: validateCompanyName(formData.company_name),
      admin_first_name: validateName(formData.admin_first_name, 'First name'),
      admin_last_name: validateName(formData.admin_last_name, 'Last name'),
      admin_email: validateEmail(formData.admin_email),
      phone: validatePhone(formData.phone),
    };

    // Check if password is valid
    if (!isPasswordValid) {
      errors.admin_password = 'Password does not meet requirements';
    }

    // Remove undefined errors
    Object.keys(errors).forEach(key => {
      if (!errors[key as keyof ValidationErrors]) {
        delete errors[key as keyof ValidationErrors];
      }
    });

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      toast.error('Please correct the errors in the form');
      setLoading(false);
      return;
    }

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
        toast.success('Account created successfully! Redirecting...');
        
        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      }
    } catch (err: any) {
      // Better error handling with user-friendly messages
      const errorDetail = err.response?.data?.detail;
      let errorMessage = 'We encountered an issue creating your account. Please try again or contact support if the problem persists.';
      
      if (typeof errorDetail === 'string') {
        errorMessage = errorDetail;
      } else if (Array.isArray(errorDetail)) {
        const firstError = errorDetail[0];
        if (firstError && firstError.msg) {
          errorMessage = firstError.msg;
        } else {
          errorMessage = 'Please check your information and correct any errors.';
        }
      }
      
      toast.error(errorMessage);
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


        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Company Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company Name <span className="text-red-500">*</span>
            </label>
            <div>
              <div className="relative">
                <BuildingOfficeIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={formData.company_name}
                  onChange={(e) => {
                    // Block < and > characters to prevent HTML/script tags
                    const value = e.target.value.replace(/[<>]/g, '');
                    handleFieldChange('company_name', value);
                  }}
                  onBlur={() => handleFieldBlur('company_name')}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    validationErrors.company_name ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="Acme Corporation"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">{formData.company_name.length}/100 characters</p>
            </div>
          </div>

          {/* Name Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Name <span className="text-red-500">*</span>
              </label>
              <div>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    required
                    maxLength={50}
                    value={formData.admin_first_name}
                    onChange={(e) => {
                      // Block < and > characters to prevent HTML/script tags
                      const value = e.target.value.replace(/[<>]/g, '');
                      handleFieldChange('admin_first_name', value);
                    }}
                    onBlur={() => handleFieldBlur('admin_first_name')}
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      validationErrors.admin_first_name ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="John"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">{formData.admin_first_name.length}/50 characters</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Last Name <span className="text-red-500">*</span>
              </label>
              <div>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    required
                    maxLength={50}
                    value={formData.admin_last_name}
                    onChange={(e) => {
                      // Block < and > characters to prevent HTML/script tags
                      const value = e.target.value.replace(/[<>]/g, '');
                      handleFieldChange('admin_last_name', value);
                    }}
                    onBlur={() => handleFieldBlur('admin_last_name')}
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      validationErrors.admin_last_name ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="Doe"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">{formData.admin_last_name.length}/50 characters</p>
              </div>
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Work Email <span className="text-red-500">*</span>
            </label>
            <div>
              <div className="relative">
                <EnvelopeIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  required
                  maxLength={255}
                  value={formData.admin_email}
                  onChange={(e) => handleFieldChange('admin_email', e.target.value.trim())}
                  onBlur={() => handleFieldBlur('admin_email')}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    validationErrors.admin_email ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="john@company.com"
                />
              </div>
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number (Optional)
            </label>
            <div>
              <div className="relative">
                <PhoneIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  maxLength={20}
                  value={formData.phone}
                  onChange={(e) => {
                    // Only allow numbers and phone formatting characters
                    const value = e.target.value.replace(/[^\d\s\-\(\)\+]/g, '');
                    handleFieldChange('phone', value);
                  }}
                  onBlur={() => handleFieldBlur('phone')}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    validationErrors.phone ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="+1 (555) 000-0000"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">{formData.phone.length}/20 characters</p>
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <LockClosedIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                required
                maxLength={128}
                value={formData.admin_password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
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
            <Link to="/terms" className="text-blue-600 hover:underline">Terms of Service</Link>
            {' '}and{' '}
            <Link to="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>
          </p>

          {/* Login Link */}
          <div className="text-center pt-4 border-t">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/auth/login" className="text-blue-600 font-semibold hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
