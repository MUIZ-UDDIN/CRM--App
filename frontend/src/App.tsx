import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';

// Layout Components
import MainLayout from './components/layout/MainLayout';
import AuthLayout from './components/layout/AuthLayout';

// Pages
import Dashboard from './pages/Dashboard';
import Deals from './pages/Deals';
import Contacts from './pages/Contacts';
import Activities from './pages/Activities';
import Files from './pages/Files';
import Quotes from './pages/Quotes';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';
import TeamsPage from './pages/TeamsPage';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import SuperAdminBilling from './pages/SuperAdminBilling';
import PlatformDashboard from './pages/PlatformDashboard';
import CompanyBilling from './pages/CompanyBilling';
import DataImport from './pages/DataImport';
import PipelineSettings from './pages/PipelineSettings';
import Workflows from './pages/Workflows';
import Inbox from './pages/Inbox';
import SMS from './pages/SMS';
import SMSEnhanced from './pages/SMSEnhanced';
import SMSTemplates from './pages/SMSTemplates';
import SMSAnalytics from './pages/SMSAnalytics';
import ScheduledSMS from './pages/ScheduledSMS';
import PhoneNumbers from './pages/PhoneNumbers';
import Calls from './pages/Calls';
import SearchResults from './pages/SearchResults';
import SupportTickets from './pages/SupportTickets';
import CustomFields from './pages/CustomFields';
import WorkflowTemplates from './pages/WorkflowTemplates';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import AcceptInvitation from './pages/auth/AcceptInvitation';
import ForgotPassword from './pages/auth/ForgotPassword';
import TermsOfService from './pages/TermsOfService';
import PrivacyPolicy from './pages/PrivacyPolicy';

// Providers
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Styles
import './index.css';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Global 401 handler component
function GlobalAuthHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    // Intercept fetch globally
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      
      // Handle 401 Unauthorized
      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/auth/login');
      }
      
      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [navigate]);

  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <GlobalAuthHandler />
          <div className="min-h-screen bg-gray-50">
            <Routes>
              {/* Authentication Routes */}
              <Route path="/auth" element={<AuthLayout />}>
                <Route path="login" element={<Login />} />
                <Route path="register" element={<Register />} />
                <Route path="accept-invitation" element={<AcceptInvitation />} />
                <Route path="forgot-password" element={<ForgotPassword />} />
                <Route index element={<Navigate to="/auth/login" replace />} />
              </Route>

              {/* Public Routes */}
              <Route path="/register" element={<Register />} />
              <Route path="/login" element={<Navigate to="/auth/login" replace />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />

              {/* Protected Routes */}
              <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
                <Route index element={<Dashboard />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="deals" element={<Deals />} />
                <Route path="contacts" element={<Contacts />} />
                <Route path="activities" element={<Activities />} />
                <Route path="files" element={<Files />} />
                <Route path="quotes" element={<Quotes />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="pipeline-settings" element={<PipelineSettings />} />
                <Route path="workflows" element={<Workflows />} />
                <Route path="settings" element={<Settings />} />
                <Route path="settings/custom-fields" element={<CustomFields />} />
                <Route path="team" element={<TeamsPage />} />
                <Route path="admin" element={<SuperAdminDashboard />} />
                <Route path="admin/platform" element={<PlatformDashboard />} />
                <Route path="admin/billing" element={<SuperAdminBilling />} />
                <Route path="billing" element={<CompanyBilling />} />
                <Route path="import" element={<DataImport />} />
                <Route path="support-tickets" element={<SupportTickets />} />
                <Route path="workflow-templates" element={<WorkflowTemplates />} />
                <Route path="profile" element={<Profile />} />
                <Route path="notifications" element={<Notifications />} />
                <Route path="inbox" element={<Inbox />} />
                <Route path="sms" element={<SMSEnhanced />} />
                <Route path="sms-templates" element={<SMSTemplates />} />
                <Route path="sms-analytics" element={<SMSAnalytics />} />
                <Route path="sms-scheduled" element={<ScheduledSMS />} />
                <Route path="phone-numbers" element={<PhoneNumbers />} />
                <Route path="calls" element={<Calls />} />
                <Route path="search" element={<SearchResults />} />
              </Route>

              {/* Catch all route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>

            {/* Global Toast Notifications */}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                  fontSize: '14px',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                },
                success: {
                  style: {
                    background: '#10B981',
                  },
                  iconTheme: {
                    primary: '#fff',
                    secondary: '#10B981',
                  },
                },
                error: {
                  style: {
                    background: '#EF4444',
                  },
                  iconTheme: {
                    primary: '#fff',
                    secondary: '#EF4444',
                  },
                },
              }}
            />
          </div>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
