import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import apiService from '../services/api';
import { Permission, hasPermission as checkPermission } from '../components/PermissionGuard';

// Export types directly in this file to avoid separate type definition files
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  company_id?: string;
  teamId?: string;
  avatarUrl?: string;
  permissions?: string[];
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<any>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  updateUser: (userData: Partial<User>) => void;
  hasPermission: (permission: string) => boolean;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

// Action types
type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'AUTH_ERROR'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'UPDATE_USER'; payload: Partial<User> }
  | { type: 'SET_LOADING'; payload: boolean };

// Initial state
const initialState: AuthState = {
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

// Reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case 'AUTH_ERROR':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    case 'UPDATE_USER':
      return {
        ...state,
        user: state.user ? { ...state.user, ...action.payload } : null,
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    default:
      return state;
  }
}

// Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check for existing auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          // Try to validate token with API
          try {
            const userData = await apiService.getCurrentUser();
            const user: User = {
              id: userData.id,
              email: userData.email,
              firstName: userData.first_name || userData.firstName,
              lastName: userData.last_name || userData.lastName,
              role: userData.role || 'User',
              company_id: userData.company_id,
              teamId: userData.team_id,
            };
            
            dispatch({
              type: 'AUTH_SUCCESS',
              payload: { user, token },
            });
          } catch (apiError) {
            console.error('API user validation failed:', apiError);
            localStorage.removeItem('token');
            dispatch({ type: 'LOGOUT' });
          }
        } catch (error) {
          localStorage.removeItem('token');
          dispatch({ type: 'LOGOUT' });
        }
      } else {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    dispatch({ type: 'AUTH_START' });

    try {
      // Try to use the real API first
      try {
        const response = await apiService.login(email, password);
        
        if (!response || !response.access_token) {
          throw new Error('Invalid login response');
        }
        
        const user: User = {
          id: response.user.id,
          email: response.user.email,
          firstName: response.user.first_name || response.user.firstName,
          lastName: response.user.last_name || response.user.lastName,
          role: response.user.role || 'User',
          company_id: response.user.company_id,
          teamId: response.user.team_id,
        };
        
        const token = response.access_token;
        
        // Ensure token is set in localStorage
        localStorage.setItem('token', token);
        
        // Update auth state
        dispatch({
          type: 'AUTH_SUCCESS',
          payload: { user, token },
        });
        
        // Store user data in localStorage as backup
        localStorage.setItem('user', JSON.stringify(user));
        
        return response;
      } catch (apiError: any) {
        console.error('API login error:', apiError);
        throw apiError;
      }
    } catch (error: any) {
      console.error('Login error:', error);
      dispatch({
        type: 'AUTH_ERROR',
        payload: error.message || 'Login failed',
      });
      throw error;
    }
  };

  const register = async (userData: RegisterData) => {
    dispatch({ type: 'AUTH_START' });

    try {
      // Try to use the real API first
      try {
        const response = await apiService.register({
          email: userData.email,
          password: userData.password,
          first_name: userData.firstName,
          last_name: userData.lastName,
        });
        
        const user: User = {
          id: response.user.id,
          email: response.user.email,
          firstName: response.user.first_name || response.user.firstName,
          lastName: response.user.last_name || response.user.lastName,
          role: response.user.role || 'User',
          teamId: response.user.team_id,
        };
        
        const token = response.access_token;
        
        localStorage.setItem('token', token);
        dispatch({
          type: 'AUTH_SUCCESS',
          payload: { user, token },
        });
        return;
      } catch (apiError: any) {
        throw apiError;
      }
    } catch (error: any) {
      dispatch({
        type: 'AUTH_ERROR',
        payload: error.message || 'Registration failed',
      });
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    dispatch({ type: 'LOGOUT' });
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const updateUser = (userData: Partial<User>) => {
    dispatch({ type: 'UPDATE_USER', payload: userData });
  };

  const hasPermission = (permission: string): boolean => {
    if (!state.user) return false;
    return checkPermission(state.user.role, permission);
  };

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    clearError,
    updateUser,
    hasPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}