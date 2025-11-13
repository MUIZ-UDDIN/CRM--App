# Role-Based Permission System

## Overview

This document outlines the comprehensive role-based permission system implemented in the CRM application. The system defines four primary user roles with hierarchical access to features and data.

## User Roles

1. **Super Admin** - SaaS platform owner
   - Has access to everything across all companies
   - Can manage subscriptions, billing, companies, and global settings

2. **Company Admin** - Administrator for a subscribing company
   - Has full access within their company
   - Can manage company settings, users, and company-wide features

3. **Sales Manager** - Team manager within a company
   - Has access to their team's data and settings
   - Can manage team members and view team analytics

4. **Sales Rep / Regular User** - Individual salesperson
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
| View leads/clients | ✅ All companies | ✅ All company data | ✅ Team data only | ✅ Own leads only |  |
| Edit company info/settings | ✅ Any company | ✅ Their company | ✅ Limited (team settings) | ❌ | Fully Implemented |
| View analytics/reports | ✅ All companies | ✅ Company-wide | ✅ Team-only | ✅ Personal metrics | Fully Implemented |
| **Analytics** |
| View reports/dashboards | ✅ All companies | ✅ Company-wide | ✅ Team-only | ✅ Personal metrics | Fully Implemented |
| **Lead Management** |
| Assign leads/deals | ✅ Anywhere | ✅ Within company | ✅ To team members | ❌ |  |
| **Integrations** |
| Email/SMS/Call integrations | ✅ Configure globally | ✅ Use/manage for company | ✅ Use/manage for team | ✅ Use for assigned leads | Fully Implemented |
| **Automations** |
| Automations/workflows | ✅ Global & company templates | ✅ Company-level | ✅ Team-level | ✅ Limited or none | Fully Implemented |
| **CRM Customization** |
| Fields/tags/pipelines | ✅ Global defaults | ✅ Company-level | ✅ View team settings | ❌ |  |
| **Notifications** |
| System alerts | ✅ All system | ✅ Company + team | ✅ Team + personal | ✅ Personal only |  |
| **Data Export/Import** |
| Data export/import | ✅ Any company | ✅ Their company | ✅ Team-only (optional) | ❌ | Fully Implemented |
| **Support** |
| Tickets/chat | ✅ Full system | ✅ Company-level | ✅ Team-level | ✅ User-level |  |

## Implementation Details

### Backend

The permission system is implemented in the backend through:

1. **Permission Enum** (`permissions.py`)
   - Defines all possible permissions in the system
   - Grouped by feature area (company management, data access, etc.)

2. **Role-Permission Mapping** (`permissions.py`)
   - Maps each role to its allowed permissions
   - Super Admin has all permissions
   - Other roles have progressively fewer permissions

3. **Permission Checking** (`middleware/permissions.py`)
   - `has_permission()` - Checks if a user has a specific permission
   - `require_permission()` - Decorator to require permission for an endpoint

4. **Tenant Context** (`middleware/tenant.py`)
   - Enforces data isolation based on company and team
   - Filters queries based on user role and permissions

### Frontend

The frontend implements the permission system through:

1. **Permission Object** (`PermissionGuard.tsx`)
   - Mirrors the backend Permission enum
   - Defines all available permissions

2. **Role-Permission Mapping** (`PermissionGuard.tsx`)
   - Maps frontend roles to permissions
   - Kept in sync with backend mapping

3. **Permission Guard Component** (`PermissionGuard.tsx`)
   - Conditionally renders UI elements based on permissions
   - Supports single or multiple permission checks

4. **Auth Context** (`AuthContext.tsx`)
   - Provides `hasPermission()` method to components
   - Stores user role and permissions

## Usage Examples

### Backend

```python
# Check permission in API endpoint
@router.get("/analytics/company")
async def get_company_analytics(
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if not has_permission(current_user, Permission.VIEW_COMPANY_ANALYTICS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to view company analytics"
        )
    # ... implementation
```

### Frontend

```tsx
// Basic usage with single permission
<PermissionGuard permission={Permission.VIEW_COMPANY_DATA}>
  <CompanyDataTable />
</PermissionGuard>

// With fallback content
<PermissionGuard 
  permission={Permission.MANAGE_BILLING}
  fallback={<AccessDeniedMessage />}
>
  <BillingManager />
</PermissionGuard>

// With multiple permissions (any of them)
<PermissionGuard 
  permission={[Permission.MANAGE_COMPANY_USERS, Permission.MANAGE_TEAM_USERS]}
>
  <UserManagement />
</PermissionGuard>
```

## Extending the System

When adding new features:

1. Add new permissions to both backend and frontend
2. Update role-permission mappings in both places
3. Use permission checks in API endpoints
4. Use PermissionGuard in frontend components
