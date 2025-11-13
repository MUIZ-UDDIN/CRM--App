# Frontend Implementation of Role-Based Permissions

## Overview

This document outlines the frontend implementation of the role-based permission system in the CRM application. The frontend components work in conjunction with the backend API to enforce access control and provide a seamless user experience based on the user's role and permissions.

## Key Components

### 1. Authentication Context

The `AuthContext` (`src/contexts/AuthContext.jsx`) provides authentication state and functions to the entire application:

- Manages user authentication state (login, logout)
- Stores user data including role and permissions
- Provides permission checking functions to components
- Handles token management and API authentication

### 2. Permission Hooks

The `usePermissions` hook (`src/hooks/usePermissions.js`) provides utility functions for checking permissions:

- `hasPermission(permission)`: Check if user has a specific permission
- `hasAnyPermission(permissions)`: Check if user has any of the specified permissions
- `hasAllPermissions(permissions)`: Check if user has all of the specified permissions
- `hasRole(role)`: Check if user has a specific role
- `isSuperAdmin()`, `isCompanyAdmin()`, etc.: Convenience methods for role checking

### 3. Protected Routes

The `ProtectedRoute` component (`src/components/ProtectedRoute.jsx`) restricts access to routes based on permissions:

- Wraps routes that require specific permissions or roles
- Redirects unauthorized users to a specified route
- Supports checking for specific permissions, roles, or combinations

### 4. Permission-Based UI Rendering

Components conditionally render UI elements based on user permissions:

- Navigation items in the sidebar are only shown to users with appropriate permissions
- Action buttons and forms are conditionally rendered based on permissions
- Different dashboard views are shown based on user role

### 5. Role-Based Dashboards

Different dashboard views are provided based on user role:

- `SuperAdminDashboard`: System-wide metrics and management options
- `CompanyAdminDashboard`: Company-wide metrics and management options
- `SalesManagerDashboard`: Team performance and management options
- `SalesRepDashboard`: Personal performance and tasks

## Implementation Examples

### Permission-Based UI Rendering

```jsx
// Example from Sidebar.jsx
{hasPermission('manage_billing') && (
  <li className={isActive('/billing') ? 'active' : ''}>
    <Link to="/billing">
      <FaCreditCard className="icon" />
      <span>Billing Management</span>
    </Link>
  </li>
)}
```

### Protected Routes

```jsx
// Example route configuration
<Routes>
  <Route path="/login" element={<Login />} />
  <Route path="/unauthorized" element={<Unauthorized />} />
  
  <Route
    path="/dashboard"
    element={
      <ProtectedRoute
        component={Dashboard}
        anyPermission={['view_own_data']}
      />
    }
  />
  
  <Route
    path="/companies"
    element={
      <ProtectedRoute
        component={Companies}
        requiredPermission="view_all_companies"
      />
    }
  />
  
  <Route
    path="/admin"
    element={
      <ProtectedRoute
        component={AdminPanel}
        requiredRole="super_admin"
      />
    }
  />
</Routes>
```

### Role-Based Component Rendering

```jsx
// Example from Dashboard.jsx
function Dashboard() {
  const { isSuperAdmin, isCompanyAdmin, isSalesManager } = usePermissions();
  
  if (isSuperAdmin()) {
    return <SuperAdminDashboard />;
  }
  
  if (isCompanyAdmin()) {
    return <CompanyAdminDashboard />;
  }
  
  if (isSalesManager()) {
    return <SalesManagerDashboard />;
  }
  
  return <SalesRepDashboard />;
}
```

## Permission Configuration

Permissions are defined in the `config.js` file to match the backend permissions:

```js
// Permission definitions (matching backend)
export const PERMISSIONS = {
  // Company Management
  MANAGE_BILLING: 'manage_billing',
  CREATE_COMPANY: 'create_company',
  // ... other permissions
};
```

## Best Practices

1. **Defense in Depth**: Permissions are enforced at multiple levels:
   - API level (backend)
   - Route level (ProtectedRoute)
   - Component level (conditional rendering)

2. **Single Source of Truth**: Permissions are stored in the AuthContext and accessed via hooks

3. **Consistent Permission Checking**: Use the usePermissions hook throughout the application

4. **Clear User Feedback**: Unauthorized users are redirected to an appropriate page with clear messaging

5. **Role-Based UI**: Different UI views based on user role provide a tailored experience

## Conclusion

The frontend implementation of the role-based permission system ensures that users only see and interact with features they have permission to access. This provides a secure and personalized user experience while maintaining consistency with the backend permission model.
