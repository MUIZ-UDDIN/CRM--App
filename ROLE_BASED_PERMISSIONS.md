# Role-Based Permissions System Implementation

This document outlines the implementation of the role-based permissions system in the CRM application.

## Roles Hierarchy

The system now supports the following roles:

1. **Super Admin (SaaS Owner)**
   - Owner of the entire SaaS platform
   - Full access to all companies and features
   - Email: admin@sunstonecrm.com

2. **Company Admin**
   - Admin for a specific company
   - Full access to their company's data and settings

3. **Sales Manager**
   - Manages a team within a company
   - Access to team data and limited company settings

4. **Sales Rep (User)**
   - Regular salesperson
   - Access to their own data only

## Implementation Details

### Backend Changes

1. **Updated User Model**
   - Added `SALES_MANAGER` and `SALES_REP` to `UserRole` enum
   - Added helper methods for role checking

2. **Updated Team Model**
   - Added `company_id` field to associate teams with companies
   - Added `is_member` method to check team membership

3. **New Permissions System**
   - Created `permissions.py` with detailed permission definitions
   - Implemented role-permission mapping
   - Added permission checking utilities

4. **Updated Tenant Middleware**
   - Enhanced data isolation based on user role
   - Added team-based access control
   - Added validation for record access

5. **New Teams API**
   - Added endpoints for team management
   - Implemented team member management
   - Added team lead assignment

6. **Updated Companies API**
   - Added suspend/activate company functionality
   - Enhanced company management for Super Admin

### Frontend Changes

1. **PermissionGuard Component**
   - Created reusable component for permission-based UI rendering
   - Implemented permission checking utilities

2. **Updated AuthContext**
   - Added permission checking functionality
   - Enhanced user role handling

3. **Updated SuperAdminDashboard**
   - Implemented suspend/activate company feature
   - Enhanced company management UI

## Database Migration

A migration script (`add_sales_roles.py`) has been created to update the database schema:

1. Adds `sales_manager` and `sales_rep` to the `user_role` enum type
2. Adds `team_id` column to the `users` table
3. Adds `company_id` column to the `teams` table

## How to Apply Changes

1. **Run Database Migration**
   ```bash
   cd backend
   python migrations/add_sales_roles.py
   ```

2. **Restart Backend**
   ```bash
   cd /var/www/crm-app
   sudo systemctl restart crm_backend
   ```

3. **Rebuild Frontend**
   ```bash
   cd frontend
   npm run build
   ```

## Testing the Implementation

1. **Super Admin Features**
   - Log in as admin@sunstonecrm.com
   - Navigate to the Super Admin Dashboard
   - Test company suspension/activation
   - Verify access to all companies

2. **Company Admin Features**
   - Create a new company admin
   - Verify they can manage users within their company
   - Test company settings access

3. **Sales Manager Features**
   - Create a team and assign a sales manager
   - Verify they can manage team members
   - Test team data access

4. **Sales Rep Features**
   - Add users to a team
   - Verify they can only access their own data
   - Test restricted permissions

## Troubleshooting

- **Permission Issues**: Check user role assignments in the database
- **Data Access Problems**: Verify tenant isolation in the middleware
- **UI Rendering Issues**: Check PermissionGuard component usage

## Future Enhancements

1. **Role Assignment UI**
   - Add UI for assigning roles to users
   - Implement role change workflow

2. **Custom Permissions**
   - Allow company admins to define custom permissions
   - Implement permission inheritance

3. **Audit Logging**
   - Track permission changes
   - Log access attempts
