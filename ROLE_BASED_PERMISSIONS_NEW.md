# Role-Based Permissions System

## User Roles

1. **Super Admin (SaaS Owner)**
   - Owner of the entire SaaS platform
   - Has access to all companies and global settings
   - Can manage subscriptions, billing, and system-wide configurations

2. **Company Admin**
   - Administrator for a subscribing company
   - Has full access to their company's data and settings
   - Can manage users and features within their company

3. **Sales Manager**
   - Team manager within a company
   - Has access to their team's data and settings
   - Can manage team members and view team analytics

4. **Sales Rep / Regular User**
   - Individual salesperson
   - Has access only to their assigned data
   - Limited to personal features and data

## Permission Matrix

| Feature/Permission | Super Admin | Company Admin | Sales Manager | Sales Rep | Implementation Status |
|-------------------|-------------|---------------|---------------|-----------|----------------------|
| **Company Management** |
| Manage subscription/billing | ✅ Full control | ✅ View only | ❌ | ❌ | Fully Implemented |
| Create/delete companies | ✅ | ❌ | ❌ | ❌ | Fully Implemented |
| Add/remove company admins | ✅ | ✅ Within their company | ❌ | ❌ | Fully Implemented |
| Add/remove users | ✅ Any company | ✅ Within company | ✅ Within team | ❌ | Fully Implemented |
| **Data Access** |
| View leads/clients | ✅ All companies | ✅ All company data | ✅ Team data only | ✅ Own leads only | Fully Implemented |
| Edit company info/settings | ✅ Any company | ✅ Their company | ✅ Limited (team settings) | ❌ | Fully Implemented |
| View analytics/reports | ✅ All companies | ✅ Company-wide | ✅ Team-only | ✅ Personal metrics | Fully Implemented |
| **Analytics** |
| View reports/dashboards | ✅ All companies | ✅ Company-wide | ✅ Team-only | ✅ Personal metrics | Fully Implemented |
| **Lead Management** |
| Assign leads/deals | ✅ Anywhere | ✅ Within company | ✅ To team members | ❌ | Fully Implemented |
| **Integrations** |
| Email/SMS/Call integrations | ✅ Configure globally | ✅ Use/manage for company | ✅ Use/manage for team | ✅ Use for assigned leads | Fully Implemented |
| **Automations** |
| Automations/workflows | ✅ Global & company templates | ✅ Company-level | ✅ Team-level | ✅ Limited or none | Fully Implemented |
| **CRM Customization** |
| Fields/tags/pipelines | ✅ Global defaults | ✅ Company-level | ✅ View team settings | ❌ | Fully Implemented |
| **Notifications** |
| System alerts | ✅ All system | ✅ Company + team | ✅ Team + personal | ✅ Personal only | Fully Implemented |
| **Data Export/Import** |
| Data export/import | ✅ Any company | ✅ Their company | ✅ Team-only (optional) | ❌ | Fully Implemented |
| **Support** |
| Tickets/chat | ✅ Full system | ✅ Company-level | ✅ Team-level | ✅ User-level | Fully Implemented |

## Implementation Details

### Backend

The permission system is implemented in the backend through:

1. **Permission Enum** (`permissions.py`)
   - Defines all possible permissions in the system
   - Grouped by feature area (company management, data access, etc.)

2. **Role-Permission Mapping** (`permissions.py`)
   - Maps each role to its corresponding set of permissions
   - Ensures consistent permission assignment across the application

3. **Permission Middleware** (`middleware/permissions.py`)
   - Provides helper functions to check if a user has specific permissions
   - Used in API endpoints to enforce access control

4. **Tenant Context** (`middleware/tenant.py`)
   - Manages multi-tenancy and company isolation
   - Ensures users can only access data from their own company or team

5. **API Endpoint Permission Checks**
   - Each API endpoint includes explicit permission checks
   - Enforces role-based access control at the API level

### Frontend

The frontend implements the permission system through:

1. **Auth Context** (`src/contexts/AuthContext.jsx`)
   - Stores user authentication state and permissions
   - Provides permission checking functions to components

2. **Permission-Based UI Rendering**
   - Components conditionally render based on user permissions
   - Navigation items, buttons, and forms are only shown to users with appropriate permissions

3. **Route Guards** (`src/components/ProtectedRoute.jsx`)
   - Protect routes based on user permissions
   - Redirect unauthorized users to appropriate pages

4. **Permission Hooks** (`src/hooks/usePermissions.js`)
   - Custom React hooks for permission checking
   - Simplify permission checks in functional components

5. **Role-Based Dashboards**
   - Different dashboard views for different roles
   - Super Admin: Global system overview
   - Company Admin: Company-wide metrics
   - Sales Manager: Team performance
   - Sales Rep: Personal performance and tasks

### Permission Check Implementation Examples

#### Backend Example (FastAPI)

```python
@router.post("/companies/")
async def create_company(company: CompanyCreate, current_user: User = Depends(get_current_user)):
    # Check if user has permission to create companies
    if not has_permission(current_user, Permission.CREATE_COMPANY):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to create companies"
        )
    # Proceed with company creation
    # ...
```

#### Frontend Example (React)

```jsx
import { usePermissions } from '../hooks/usePermissions';

function CompanyActions() {
  const { hasPermission } = usePermissions();
  
  return (
    <div className="actions-container">
      {hasPermission('create_company') && (
        <button className="btn btn-primary">Create Company</button>
      )}
      {hasPermission('manage_billing') && (
        <button className="btn btn-secondary">Manage Billing</button>
      )}
    </div>
  );
}
```

## Frontend Components

### 1. Permission Hook Implementation

```jsx
// src/hooks/usePermissions.js
import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

export function usePermissions() {
  const { user } = useContext(AuthContext);
  
  const hasPermission = (permission) => {
    if (!user || !user.permissions) return false;
    return user.permissions.includes(permission);
  };
  
  const hasRole = (role) => {
    if (!user || !user.role) return false;
    return user.role === role;
  };
  
  return { hasPermission, hasRole };
}
```

### 2. Protected Route Component

```jsx
// src/components/ProtectedRoute.jsx
import React from 'react';
import { Route, Redirect } from 'react-router-dom';
import { usePermissions } from '../hooks/usePermissions';

function ProtectedRoute({ component: Component, requiredPermission, ...rest }) {
  const { hasPermission } = usePermissions();
  
  return (
    <Route
      {...rest}
      render={(props) =>
        hasPermission(requiredPermission) ? (
          <Component {...props} />
        ) : (
          <Redirect to="/unauthorized" />
        )
      }
    />
  );
}

export default ProtectedRoute;
```

### 3. Navigation Menu with Permission Checks

```jsx
// src/components/Sidebar.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { usePermissions } from '../hooks/usePermissions';

function Sidebar() {
  const { hasPermission, hasRole } = usePermissions();
  
  return (
    <nav className="sidebar">
      <ul>
        <li>
          <Link to="/dashboard">Dashboard</Link>
        </li>
        
        {/* Company Management */}
        {hasPermission('view_company_data') && (
          <li>
            <Link to="/companies">Companies</Link>
          </li>
        )}
        
        {/* User Management */}
        {(hasPermission('manage_company_users') || hasPermission('manage_team_users')) && (
          <li>
            <Link to="/users">Users</Link>
          </li>
        )}
        
        {/* Billing */}
        {hasPermission('manage_billing') && (
          <li>
            <Link to="/billing">Billing</Link>
          </li>
        )}
        {hasPermission('view_billing') && !hasPermission('manage_billing') && (
          <li>
            <Link to="/billing">View Billing</Link>
          </li>
        )}
        
        {/* Analytics */}
        <li>
          <Link to="/analytics">Analytics</Link>
        </li>
        
        {/* Support */}
        <li>
          <Link to="/support">Support</Link>
        </li>
        
        {/* Admin Panel - Super Admin Only */}
        {hasRole('super_admin') && (
          <li>
            <Link to="/admin">Admin Panel</Link>
          </li>
        )}
      </ul>
    </nav>
  );
}

export default Sidebar;
```

### 4. Role-Based Dashboard Components

```jsx
// src/pages/Dashboard.jsx
import React from 'react';
import { usePermissions } from '../hooks/usePermissions';
import SuperAdminDashboard from '../components/dashboards/SuperAdminDashboard';
import CompanyAdminDashboard from '../components/dashboards/CompanyAdminDashboard';
import SalesManagerDashboard from '../components/dashboards/SalesManagerDashboard';
import SalesRepDashboard from '../components/dashboards/SalesRepDashboard';

function Dashboard() {
  const { hasRole } = usePermissions();
  
  if (hasRole('super_admin')) {
    return <SuperAdminDashboard />;
  }
  
  if (hasRole('company_admin')) {
    return <CompanyAdminDashboard />;
  }
  
  if (hasRole('sales_manager')) {
    return <SalesManagerDashboard />;
  }
  
  return <SalesRepDashboard />;
}

export default Dashboard;
```

## Conclusion

The role-based permission system has been fully implemented across both backend and frontend components. This ensures that users can only access features and data appropriate to their role, maintaining security and data isolation across the application.
