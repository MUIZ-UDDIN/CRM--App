/**
 * Authentication Context
 * 
 * This context provides authentication state and functions to the entire application.
 * It handles user login, logout, and permission checking.
 */

import React, { createContext, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { API_URL } from '../config';

// Create the context
export const AuthContext = createContext();

/**
 * Authentication Provider Component
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @returns {React.Component} Auth provider component
 */
export const AuthProvider = ({ children }) => {
  // State for user data, loading status, and error
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Get token from local storage
  const getToken = () => localStorage.getItem('token');
  
  // Set token in local storage
  const setToken = (token) => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  };
  
  // Configure axios with token
  const configureAxios = (token) => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  };
  
  // Load user data from API
  const loadUser = async () => {
    const token = getToken();
    
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    
    try {
      configureAxios(token);
      setIsLoading(true);
      
      const response = await axios.get(`${API_URL}/api/users/me`);
      
      // Process user data and permissions
      const userData = response.data;
      
      // Map role to permissions if not provided by API
      if (!userData.permissions) {
        userData.permissions = getRolePermissions(userData.role);
      }
      
      setUser(userData);
      setError(null);
    } catch (err) {
      console.error('Failed to load user:', err);
      setError('Failed to authenticate user');
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Login user with email and password
  const login = async (email, password) => {
    try {
      setIsLoading(true);
      
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        email,
        password
      });
      
      const { access_token } = response.data;
      
      setToken(access_token);
      configureAxios(access_token);
      
      await loadUser();
      
      return { success: true };
    } catch (err) {
      console.error('Login failed:', err);
      setError(err.response?.data?.detail || 'Login failed');
      return { success: false, error: err.response?.data?.detail || 'Login failed' };
    } finally {
      setIsLoading(false);
    }
  };
  
  // Logout user
  const logout = () => {
    setToken(null);
    configureAxios(null);
    setUser(null);
  };
  
  // Get permissions for a role (fallback if API doesn't provide permissions)
  const getRolePermissions = (role) => {
    switch (role) {
      case 'super_admin':
        return [
          'manage_billing',
          'create_company',
          'delete_company',
          'edit_company',
          'suspend_company',
          'view_billing',
          'manage_companies',
          'manage_company_admins',
          'manage_company_users',
          'manage_team_users',
          'view_all_companies',
          'view_company_data',
          'view_team_data',
          'view_own_data',
          'view_all_analytics',
          'view_company_analytics',
          'view_team_analytics',
          'view_own_analytics',
          'assign_any_leads',
          'assign_company_leads',
          'assign_team_leads',
          'manage_own_leads',
          'manage_global_integrations',
          'manage_company_integrations',
          'manage_team_integrations',
          'use_integrations',
          'manage_global_automations',
          'manage_company_automations',
          'manage_team_automations',
          'use_personal_automations',
          'customize_global_crm',
          'customize_company_crm',
          'view_team_crm_settings',
          'export_any_data',
          'export_company_data',
          'export_team_data',
          'import_company_data',
          'import_team_data',
          'manage_system_support',
          'manage_company_support',
          'manage_team_support',
          'view_user_support',
          'create_support_tickets',
          'view_support_tickets',
          'manage_support_tickets',
          'manage_support',
          'manage_notifications',
          'view_company_notifications',
          'view_team_notifications',
          'view_own_notifications'
        ];
      case 'company_admin':
        return [
          'edit_company',
          'view_billing',
          'manage_company_users',
          'manage_team_users',
          'view_company_data',
          'view_team_data',
          'view_own_data',
          'view_company_analytics',
          'view_team_analytics',
          'view_own_analytics',
          'assign_company_leads',
          'assign_team_leads',
          'manage_own_leads',
          'manage_company_integrations',
          'manage_team_integrations',
          'use_integrations',
          'manage_company_automations',
          'manage_team_automations',
          'use_personal_automations',
          'customize_company_crm',
          'view_team_crm_settings',
          'export_company_data',
          'export_team_data',
          'import_company_data',
          'import_team_data',
          'manage_company_support',
          'manage_team_support',
          'view_user_support',
          'create_support_tickets',
          'view_support_tickets',
          'manage_support_tickets',
          'manage_notifications',
          'view_company_notifications',
          'view_team_notifications',
          'view_own_notifications'
        ];
      case 'sales_manager':
        return [
          'manage_team_users',
          'view_team_data',
          'view_own_data',
          'view_team_analytics',
          'view_own_analytics',
          'assign_team_leads',
          'manage_own_leads',
          'manage_team_integrations',
          'use_integrations',
          'manage_team_automations',
          'use_personal_automations',
          'view_team_crm_settings',
          'export_team_data',
          'import_team_data',
          'manage_team_support',
          'view_user_support',
          'create_support_tickets',
          'view_support_tickets',
          'view_team_notifications',
          'view_own_notifications'
        ];
      case 'sales_rep':
        return [
          'view_own_data',
          'view_own_analytics',
          'manage_own_leads',
          'use_integrations',
          'use_personal_automations',
          'view_user_support',
          'create_support_tickets',
          'view_own_notifications'
        ];
      default:
        return [];
    }
  };
  
  // Load user on initial render
  useEffect(() => {
    loadUser();
  }, []);
  
  // Context value
  const value = {
    user,
    isLoading,
    error,
    login,
    logout,
    loadUser
  };
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired
};

export default AuthProvider;
