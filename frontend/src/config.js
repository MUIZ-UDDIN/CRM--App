/**
 * Application Configuration
 * 
 * This file contains configuration settings for the application.
 */

// API URL - Change this based on environment
export const API_URL = process.env.REACT_APP_API_URL || 'https://sunstonecrm.com';

// Authentication settings
export const AUTH_CONFIG = {
  tokenKey: 'auth_token',
  refreshTokenKey: 'refresh_token',
  tokenExpiry: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
};

// Role definitions
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  COMPANY_ADMIN: 'company_admin',
  SALES_MANAGER: 'sales_manager',
  SALES_REP: 'sales_rep',
};

// Permission definitions (matching backend)
export const PERMISSIONS = {
  // Company Management
  MANAGE_BILLING: 'manage_billing',
  CREATE_COMPANY: 'create_company',
  DELETE_COMPANY: 'delete_company',
  EDIT_COMPANY: 'edit_company',
  SUSPEND_COMPANY: 'suspend_company',
  VIEW_BILLING: 'view_billing',
  MANAGE_COMPANIES: 'manage_companies',
  
  // User Management
  MANAGE_COMPANY_ADMINS: 'manage_company_admins',
  MANAGE_COMPANY_USERS: 'manage_company_users',
  MANAGE_TEAM_USERS: 'manage_team_users',
  
  // Data Access
  VIEW_ALL_COMPANIES: 'view_all_companies',
  VIEW_COMPANY_DATA: 'view_company_data',
  VIEW_TEAM_DATA: 'view_team_data',
  VIEW_OWN_DATA: 'view_own_data',
  
  // Analytics
  VIEW_ALL_ANALYTICS: 'view_all_analytics',
  VIEW_COMPANY_ANALYTICS: 'view_company_analytics',
  VIEW_TEAM_ANALYTICS: 'view_team_analytics',
  VIEW_OWN_ANALYTICS: 'view_own_analytics',
  
  // Lead/Deal Management
  ASSIGN_ANY_LEADS: 'assign_any_leads',
  ASSIGN_COMPANY_LEADS: 'assign_company_leads',
  ASSIGN_TEAM_LEADS: 'assign_team_leads',
  MANAGE_OWN_LEADS: 'manage_own_leads',
  
  // Integrations
  MANAGE_GLOBAL_INTEGRATIONS: 'manage_global_integrations',
  MANAGE_COMPANY_INTEGRATIONS: 'manage_company_integrations',
  MANAGE_TEAM_INTEGRATIONS: 'manage_team_integrations',
  USE_INTEGRATIONS: 'use_integrations',
  
  // Automations
  MANAGE_GLOBAL_AUTOMATIONS: 'manage_global_automations',
  MANAGE_COMPANY_AUTOMATIONS: 'manage_company_automations',
  MANAGE_TEAM_AUTOMATIONS: 'manage_team_automations',
  USE_PERSONAL_AUTOMATIONS: 'use_personal_automations',
  
  // CRM Customization
  CUSTOMIZE_GLOBAL_CRM: 'customize_global_crm',
  CUSTOMIZE_COMPANY_CRM: 'customize_company_crm',
  VIEW_TEAM_CRM_SETTINGS: 'view_team_crm_settings',
  
  // Data Export/Import
  EXPORT_ANY_DATA: 'export_any_data',
  EXPORT_COMPANY_DATA: 'export_company_data',
  EXPORT_TEAM_DATA: 'export_team_data',
  IMPORT_COMPANY_DATA: 'import_company_data',
  IMPORT_TEAM_DATA: 'import_team_data',
  
  // Support and Notifications
  MANAGE_SYSTEM_SUPPORT: 'manage_system_support',
  MANAGE_COMPANY_SUPPORT: 'manage_company_support',
  MANAGE_TEAM_SUPPORT: 'manage_team_support',
  VIEW_USER_SUPPORT: 'view_user_support',
  CREATE_SUPPORT_TICKETS: 'create_support_tickets',
  VIEW_SUPPORT_TICKETS: 'view_support_tickets',
  MANAGE_SUPPORT_TICKETS: 'manage_support_tickets',
  MANAGE_SUPPORT: 'manage_support',
  
  // Notifications
  MANAGE_NOTIFICATIONS: 'manage_notifications',
  VIEW_COMPANY_NOTIFICATIONS: 'view_company_notifications',
  VIEW_TEAM_NOTIFICATIONS: 'view_team_notifications',
  VIEW_OWN_NOTIFICATIONS: 'view_own_notifications'
};

// Application routes configuration
export const ROUTES = {
  // Public routes
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  UNAUTHORIZED: '/unauthorized',
  
  // Protected routes
  DASHBOARD: '/dashboard',
  COMPANIES: '/companies',
  COMPANY_SETTINGS: '/company-settings',
  USERS: '/users',
  LEADS: '/leads',
  DEALS: '/deals',
  CONTACTS: '/contacts',
  BILLING: '/billing',
  ANALYTICS: '/analytics',
  INTEGRATIONS: '/integrations',
  AUTOMATIONS: '/automations',
  CUSTOMIZATION: '/customization',
  DATA_EXPORT_IMPORT: '/data',
  SUPPORT: '/support',
  NOTIFICATIONS: '/notifications',
  ADMIN: '/admin'
};

export default {
  API_URL,
  AUTH_CONFIG,
  ROLES,
  PERMISSIONS,
  ROUTES
};
