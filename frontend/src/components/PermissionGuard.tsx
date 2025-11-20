import React, { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * Permission Guard Component
 * 
 * This component controls access to UI elements based on user permissions.
 * It implements the role-based permission matrix for:
 * - Super Admin: SaaS platform owner with access to everything
 * - Company Admin: Admin for a subscribing company with full access to their company
 * - Sales Manager: Team manager with access to their team's data
 * - Sales Rep/Regular User: Individual user with access to only their assigned data
 */

// Define permission types as a const object instead of enum to be compatible with TypeScript's erasableSyntaxOnly mode
export const Permission = {
  // Company Management
  MANAGE_BILLING: "manage_billing",
  CREATE_COMPANY: "create_company",
  DELETE_COMPANY: "delete_company",
  EDIT_COMPANY: "edit_company",
  SUSPEND_COMPANY: "suspend_company",
  VIEW_BILLING: "view_billing",
  MANAGE_COMPANIES: "manage_companies",
  
  // User Management
  MANAGE_COMPANY_ADMINS: "manage_company_admins",
  MANAGE_COMPANY_USERS: "manage_company_users",
  MANAGE_TEAM_USERS: "manage_team_users",
  
  // Data Access
  VIEW_ALL_COMPANIES: "view_all_companies",
  VIEW_COMPANY_DATA: "view_company_data",
  VIEW_TEAM_DATA: "view_team_data",
  VIEW_OWN_DATA: "view_own_data",
  
  // Analytics
  VIEW_ALL_ANALYTICS: "view_all_analytics",
  VIEW_COMPANY_ANALYTICS: "view_company_analytics",
  VIEW_TEAM_ANALYTICS: "view_team_analytics",
  VIEW_OWN_ANALYTICS: "view_own_analytics",
  
  // Lead/Deal Management
  ASSIGN_ANY_LEADS: "assign_any_leads",
  ASSIGN_COMPANY_LEADS: "assign_company_leads",
  ASSIGN_TEAM_LEADS: "assign_team_leads",
  MANAGE_OWN_LEADS: "manage_own_leads",
  
  // Integrations
  MANAGE_GLOBAL_INTEGRATIONS: "manage_global_integrations",
  MANAGE_COMPANY_INTEGRATIONS: "manage_company_integrations",
  MANAGE_TEAM_INTEGRATIONS: "manage_team_integrations",
  USE_INTEGRATIONS: "use_integrations",
  
  // Automations
  MANAGE_GLOBAL_AUTOMATIONS: "manage_global_automations",
  MANAGE_COMPANY_AUTOMATIONS: "manage_company_automations",
  MANAGE_TEAM_AUTOMATIONS: "manage_team_automations",
  USE_PERSONAL_AUTOMATIONS: "use_personal_automations",
  
  // CRM Customization
  CUSTOMIZE_GLOBAL_CRM: "customize_global_crm",
  CUSTOMIZE_COMPANY_CRM: "customize_company_crm",
  VIEW_TEAM_CRM_SETTINGS: "view_team_crm_settings",
  
  // Data Export/Import
  EXPORT_ANY_DATA: "export_any_data",
  EXPORT_COMPANY_DATA: "export_company_data",
  EXPORT_TEAM_DATA: "export_team_data",
  IMPORT_COMPANY_DATA: "import_company_data",
  IMPORT_TEAM_DATA: "import_team_data",
  
  // Support and Notifications
  MANAGE_SYSTEM_SUPPORT: "manage_system_support",
  MANAGE_COMPANY_SUPPORT: "manage_company_support",
  MANAGE_TEAM_SUPPORT: "manage_team_support",
  VIEW_USER_SUPPORT: "view_user_support",
  
  // Notifications
  MANAGE_NOTIFICATIONS: "manage_notifications",
  VIEW_COMPANY_NOTIFICATIONS: "view_company_notifications",
  VIEW_TEAM_NOTIFICATIONS: "view_team_notifications",
  VIEW_OWN_NOTIFICATIONS: "view_own_notifications"
} as const;

// Type for permission values
export type PermissionType = typeof Permission[keyof typeof Permission];

// Role-based permission mapping
const ROLE_PERMISSIONS: Record<string, string[]> = {
  // Super Admin has all permissions
  'super_admin': Object.values(Permission),
  
  // Company Admin permissions
  'company_admin': [
    // Company Management
    Permission.EDIT_COMPANY, 
    Permission.MANAGE_BILLING,  // Company Admin can manage their own company billing
    
    // User Management
    Permission.MANAGE_COMPANY_USERS, 
    Permission.MANAGE_TEAM_USERS,
    
    // Data Access
    Permission.VIEW_COMPANY_DATA, 
    Permission.VIEW_TEAM_DATA, 
    Permission.VIEW_OWN_DATA,
    
    // Analytics
    Permission.VIEW_COMPANY_ANALYTICS, 
    Permission.VIEW_TEAM_ANALYTICS, 
    Permission.VIEW_OWN_ANALYTICS,
    
    // Lead/Deal Management
    Permission.ASSIGN_COMPANY_LEADS, 
    Permission.ASSIGN_TEAM_LEADS,
    Permission.MANAGE_OWN_LEADS,
    
    // Integrations
    Permission.MANAGE_COMPANY_INTEGRATIONS,
    Permission.MANAGE_TEAM_INTEGRATIONS,
    Permission.USE_INTEGRATIONS,
    
    // Automations
    Permission.MANAGE_COMPANY_AUTOMATIONS, 
    Permission.MANAGE_TEAM_AUTOMATIONS,
    Permission.USE_PERSONAL_AUTOMATIONS,
    
    // CRM Customization
    Permission.CUSTOMIZE_COMPANY_CRM,
    Permission.VIEW_TEAM_CRM_SETTINGS,
    
    // Data Export/Import
    Permission.EXPORT_COMPANY_DATA, 
    Permission.EXPORT_TEAM_DATA,
    
    // Support and Notifications
    Permission.MANAGE_COMPANY_SUPPORT,
    Permission.MANAGE_TEAM_SUPPORT,
    Permission.VIEW_USER_SUPPORT
  ],
  
  // Sales Manager permissions
  'sales_manager': [
    // User Management
    Permission.MANAGE_TEAM_USERS,
    
    // Data Access
    Permission.VIEW_TEAM_DATA, 
    Permission.VIEW_OWN_DATA,
    
    // Analytics
    Permission.VIEW_TEAM_ANALYTICS, 
    Permission.VIEW_OWN_ANALYTICS,
    
    // Lead/Deal Management
    Permission.ASSIGN_TEAM_LEADS,
    Permission.MANAGE_OWN_LEADS,
    
    // Integrations
    Permission.MANAGE_TEAM_INTEGRATIONS,
    Permission.USE_INTEGRATIONS,
    
    // Automations
    Permission.MANAGE_TEAM_AUTOMATIONS,
    Permission.USE_PERSONAL_AUTOMATIONS,
    
    // CRM Customization
    Permission.VIEW_TEAM_CRM_SETTINGS,
    
    // Data Export/Import
    Permission.EXPORT_TEAM_DATA,
    
    // Support and Notifications
    Permission.MANAGE_TEAM_SUPPORT,
    Permission.VIEW_USER_SUPPORT
  ],
  
  // Sales Rep permissions
  'sales_rep': [
    // Data Access
    Permission.VIEW_OWN_DATA,
    
    // Analytics
    Permission.VIEW_OWN_ANALYTICS,
    
    // Lead/Deal Management
    Permission.MANAGE_OWN_LEADS,
    
    // Integrations
    Permission.USE_INTEGRATIONS,
    
    // Automations
    Permission.USE_PERSONAL_AUTOMATIONS,
    
    // Support and Notifications
    Permission.VIEW_USER_SUPPORT
  ],
  
  // Regular User / Company User permissions
  'company_user': [
    // Data Access
    Permission.VIEW_OWN_DATA,
    
    // Analytics
    Permission.VIEW_OWN_ANALYTICS,
    
    // Integrations
    Permission.USE_INTEGRATIONS,
    
    // Support and Notifications
    Permission.VIEW_USER_SUPPORT
  ],
  
  // Add alias for Regular User to match UI terminology
  'regular_user': [
    // Data Access
    Permission.VIEW_OWN_DATA,
    
    // Analytics
    Permission.VIEW_OWN_ANALYTICS,
    
    // Integrations
    Permission.USE_INTEGRATIONS,
    
    // Support and Notifications
    Permission.VIEW_USER_SUPPORT
  ]
};

/**
 * Helper function to check if a user has a specific permission
 * 
 * @param userRole - The user's role (super_admin, company_admin, sales_manager, sales_rep, etc.)
 * @param permission - The permission to check
 * @returns boolean - Whether the user has the permission
 */
export const hasPermission = (userRole: string, permission: string): boolean => {
  if (!userRole) return false;
  
  // Normalize the role name (lowercase, replace spaces with underscores)
  const normalizedRole = userRole.toLowerCase().replace(/\s+/g, '_');
  
  // Handle role aliases
  let roleKey = normalizedRole;
  if (normalizedRole === 'admin') roleKey = 'company_admin';
  if (normalizedRole === 'super_admin' || normalizedRole === 'super') roleKey = 'super_admin';
  if (normalizedRole === 'user' || normalizedRole === 'regular' || normalizedRole === 'sales_rep') roleKey = 'regular_user';
  if (normalizedRole === 'manager') roleKey = 'sales_manager';
  
  // Get permissions for the role
  const permissions = ROLE_PERMISSIONS[roleKey] || [];
  
  // Check if the permission exists in the role's permissions
  return permissions.includes(permission);
};

interface PermissionGuardProps {
  permission: string | string[];
  children: ReactNode;
  fallback?: ReactNode;
  requireAll?: boolean; // If true, user must have all permissions in the array
}

/**
 * PermissionGuard Component
 * 
 * Conditionally renders children based on user permissions
 * 
 * @param permission - Single permission string or array of permissions
 * @param children - Content to show if user has permission
 * @param fallback - Content to show if user lacks permission
 * @param requireAll - If true and permission is an array, requires all permissions
 */
const PermissionGuard: React.FC<PermissionGuardProps> = ({ 
  permission, 
  children, 
  fallback = null,
  requireAll = false
}) => {
  const { user } = useAuth();
  
  if (!user) {
    return <>{fallback}</>;
  }
  
  const userRole = user.role.toLowerCase();
  
  // Handle array of permissions
  if (Array.isArray(permission)) {
    if (requireAll) {
      // User must have ALL permissions
      const hasAllPermissions = permission.every(p => hasPermission(userRole, p));
      return hasAllPermissions ? <>{children}</> : <>{fallback}</>;
    } else {
      // User must have ANY permission
      const hasAnyPermission = permission.some(p => hasPermission(userRole, p));
      return hasAnyPermission ? <>{children}</> : <>{fallback}</>;
    }
  }
  
  // Handle single permission
  if (hasPermission(userRole, permission)) {
    return <>{children}</>;
  }
  
  return <>{fallback}</>;
};

export default PermissionGuard;

/**
 * Usage examples:
 * 
 * // Basic usage with single permission
 * <PermissionGuard permission={Permission.VIEW_COMPANY_DATA}>
 *   <CompanyDataTable />
 * </PermissionGuard>
 * 
 * // With fallback content
 * <PermissionGuard 
 *   permission={Permission.MANAGE_BILLING}
 *   fallback={<AccessDeniedMessage />}
 * >
 *   <BillingManager />
 * </PermissionGuard>
 * 
 * // With multiple permissions (any of them)
 * <PermissionGuard 
 *   permission={[Permission.MANAGE_COMPANY_USERS, Permission.MANAGE_TEAM_USERS]}
 * >
 *   <UserManagement />
 * </PermissionGuard>
 * 
 * // With multiple permissions (all required)
 * <PermissionGuard 
 *   permission={[Permission.CUSTOMIZE_COMPANY_CRM, Permission.MANAGE_COMPANY_USERS]}
 *   requireAll={true}
 * >
 *   <AdvancedCRMCustomization />
 * </PermissionGuard>
 */
