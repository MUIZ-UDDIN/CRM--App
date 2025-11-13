/**
 * Custom hook for checking user permissions
 * 
 * This hook provides utility functions to check if the current user
 * has specific permissions or roles.
 */

import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

export function usePermissions() {
  const { user } = useContext(AuthContext);
  
  /**
   * Check if the user has a specific permission
   * @param {string} permission - The permission to check
   * @returns {boolean} - Whether the user has the permission
   */
  const hasPermission = (permission) => {
    if (!user || !user.permissions) return false;
    return user.permissions.includes(permission);
  };
  
  /**
   * Check if the user has any of the specified permissions
   * @param {string[]} permissions - Array of permissions to check
   * @returns {boolean} - Whether the user has any of the permissions
   */
  const hasAnyPermission = (permissions) => {
    if (!user || !user.permissions) return false;
    return permissions.some(permission => user.permissions.includes(permission));
  };
  
  /**
   * Check if the user has all of the specified permissions
   * @param {string[]} permissions - Array of permissions to check
   * @returns {boolean} - Whether the user has all of the permissions
   */
  const hasAllPermissions = (permissions) => {
    if (!user || !user.permissions) return false;
    return permissions.every(permission => user.permissions.includes(permission));
  };
  
  /**
   * Check if the user has a specific role
   * @param {string} role - The role to check
   * @returns {boolean} - Whether the user has the role
   */
  const hasRole = (role) => {
    if (!user || !user.role) return false;
    return user.role === role;
  };
  
  /**
   * Check if the user has any of the specified roles
   * @param {string[]} roles - Array of roles to check
   * @returns {boolean} - Whether the user has any of the roles
   */
  const hasAnyRole = (roles) => {
    if (!user || !user.role) return false;
    return roles.includes(user.role);
  };
  
  /**
   * Check if the user belongs to a specific company
   * @param {string} companyId - The company ID to check
   * @returns {boolean} - Whether the user belongs to the company
   */
  const belongsToCompany = (companyId) => {
    if (!user || !user.company_id) return false;
    return user.company_id === companyId;
  };
  
  /**
   * Check if the user belongs to a specific team
   * @param {string} teamId - The team ID to check
   * @returns {boolean} - Whether the user belongs to the team
   */
  const belongsToTeam = (teamId) => {
    if (!user || !user.team_id) return false;
    return user.team_id === teamId;
  };
  
  /**
   * Check if the user is a super admin
   * @returns {boolean} - Whether the user is a super admin
   */
  const isSuperAdmin = () => {
    return hasRole('super_admin');
  };
  
  /**
   * Check if the user is a company admin
   * @returns {boolean} - Whether the user is a company admin
   */
  const isCompanyAdmin = () => {
    return hasRole('company_admin');
  };
  
  /**
   * Check if the user is a sales manager
   * @returns {boolean} - Whether the user is a sales manager
   */
  const isSalesManager = () => {
    return hasRole('sales_manager');
  };
  
  /**
   * Check if the user is a sales rep
   * @returns {boolean} - Whether the user is a sales rep
   */
  const isSalesRep = () => {
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
