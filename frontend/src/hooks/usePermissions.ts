/**
 * Custom hook for checking user permissions
 * 
 * This hook provides utility functions to check if the current user
 * has specific permissions or roles.
 */

import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

interface PermissionsHook {
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  belongsToCompany: (companyId: string) => boolean;
  belongsToTeam: (teamId: string) => boolean;
  isSuperAdmin: () => boolean;
  isCompanyAdmin: () => boolean;
  isSalesManager: () => boolean;
  isSalesRep: () => boolean;
}

export function usePermissions(): PermissionsHook {
  const context = useContext(AuthContext);
  const user = context?.user;
  
  /**
   * Check if the user has a specific permission
   * @param permission - The permission to check
   * @returns Whether the user has the permission
   */
  const hasPermission = (permission: string): boolean => {
    if (!user || !user.permissions) return false;
    return user.permissions.includes(permission);
  };
  
  /**
   * Check if the user has any of the specified permissions
   * @param permissions - Array of permissions to check
   * @returns Whether the user has any of the permissions
   */
  const hasAnyPermission = (permissions: string[]): boolean => {
    if (!user || !user.permissions) return false;
    return permissions.some(permission => user.permissions!.includes(permission));
  };
  
  /**
   * Check if the user has all of the specified permissions
   * @param permissions - Array of permissions to check
   * @returns Whether the user has all of the permissions
   */
  const hasAllPermissions = (permissions: string[]): boolean => {
    if (!user || !user.permissions) return false;
    return permissions.every(permission => user.permissions!.includes(permission));
  };
  
  /**
   * Check if the user has a specific role
   * @param role - The role to check
   * @returns Whether the user has the role
   */
  const hasRole = (role: string): boolean => {
    if (!user || !user.role) return false;
    return user.role === role;
  };
  
  /**
   * Check if the user has any of the specified roles
   * @param roles - Array of roles to check
   * @returns Whether the user has any of the roles
   */
  const hasAnyRole = (roles: string[]): boolean => {
    if (!user || !user.role) return false;
    return roles.includes(user.role);
  };
  
  /**
   * Check if the user belongs to a specific company
   * @param companyId - The company ID to check
   * @returns Whether the user belongs to the company
   */
  const belongsToCompany = (companyId: string): boolean => {
    if (!user || !user.company_id) return false;
    return user.company_id === companyId;
  };
  
  /**
   * Check if the user belongs to a specific team
   * @param teamId - The team ID to check
   * @returns Whether the user belongs to the team
   */
  const belongsToTeam = (teamId: string): boolean => {
    if (!user || !user.teamId) return false;
    return user.teamId === teamId;
  };
  
  /**
   * Check if the user is a super admin
   * @returns Whether the user is a super admin
   */
  const isSuperAdmin = (): boolean => {
    return hasRole('super_admin');
  };
  
  /**
   * Check if the user is a company admin
   * @returns Whether the user is a company admin
   */
  const isCompanyAdmin = (): boolean => {
    return hasRole('company_admin');
  };
  
  /**
   * Check if the user is a sales manager
   * @returns Whether the user is a sales manager
   */
  const isSalesManager = (): boolean => {
    return hasRole('sales_manager');
  };
  
  /**
   * Check if the user is a sales rep
   * @returns Whether the user is a sales rep
   */
  const isSalesRep = (): boolean => {
    return hasRole('sales_rep');
  };
  
  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasAnyRole,
    belongsToCompany,
    belongsToTeam,
    isSuperAdmin,
    isCompanyAdmin,
    isSalesManager,
    isSalesRep
  };
}

export default usePermissions;
