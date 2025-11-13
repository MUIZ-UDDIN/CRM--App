/**
 * Protected Route Component
 * 
 * This component wraps routes that require specific permissions or roles.
 * It redirects unauthorized users to a specified route.
 */

import React from 'react';
import { Route, Navigate } from 'react-router-dom';
import { usePermissions } from '../hooks/usePermissions';
import PropTypes from 'prop-types';

/**
 * Protected Route Component
 * @param {Object} props - Component props
 * @param {React.Component} props.component - Component to render if authorized
 * @param {string} [props.requiredPermission] - Permission required to access the route
 * @param {string[]} [props.requiredPermissions] - Permissions required to access the route (all must match)
 * @param {string[]} [props.anyPermission] - Any of these permissions grants access
 * @param {string} [props.requiredRole] - Role required to access the route
 * @param {string[]} [props.anyRole] - Any of these roles grants access
 * @param {string} [props.redirectTo='/unauthorized'] - Route to redirect to if unauthorized
 * @param {Object} props.rest - Additional props to pass to the Route component
 * @returns {React.Component} Protected route component
 */
function ProtectedRoute({
  component: Component,
  requiredPermission,
  requiredPermissions,
  anyPermission,
  requiredRole,
  anyRole,
  redirectTo = '/unauthorized',
  ...rest
}) {
  const {
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,
    hasRole,
    hasAnyRole
  } = usePermissions();
  
  // Check if the user has the required permissions/roles
  const isAuthorized = () => {
    // Check specific permission
    if (requiredPermission && !hasPermission(requiredPermission)) {
      return false;
    }
    
    // Check all required permissions
    if (requiredPermissions && !hasAllPermissions(requiredPermissions)) {
      return false;
    }
    
    // Check any permission
    if (anyPermission && !hasAnyPermission(anyPermission)) {
      return false;
    }
    
    // Check specific role
    if (requiredRole && !hasRole(requiredRole)) {
      return false;
    }
    
    // Check any role
    if (anyRole && !hasAnyRole(anyRole)) {
      return false;
    }
    
    // If no permission/role requirements or all checks pass
    return true;
  };
  
  return (
    <Route
      {...rest}
      element={isAuthorized() ? <Component /> : <Navigate to={redirectTo} />}
    />
  );
}

ProtectedRoute.propTypes = {
  component: PropTypes.elementType.isRequired,
  requiredPermission: PropTypes.string,
  requiredPermissions: PropTypes.arrayOf(PropTypes.string),
  anyPermission: PropTypes.arrayOf(PropTypes.string),
  requiredRole: PropTypes.string,
  anyRole: PropTypes.arrayOf(PropTypes.string),
  redirectTo: PropTypes.string
};

export default ProtectedRoute;
