# Permission Matrix - Gap Analysis & Implementation Plan

**Date:** November 16, 2025  
**Goal:** Achieve 100% compliance with permission requirements

---

## CURRENT STATUS BY FEATURE

### ✅ FULLY IMPLEMENTED (85%)

#### 1. View Data Access
- ✅ Super Admin: All companies
- ✅ Company Admin: Company-wide
- ✅ Sales Manager: Team data (with fallback)
- ✅ Sales Rep: Own data only
**Status:** COMPLETE

#### 2. User Management
- ✅ Super Admin: Any company
- ✅ Company Admin: Within company
- ✅ Sales Manager: Within team
- ✅ Sales Rep: No access
**Status:** COMPLETE (Admin role blocked from invitation)

#### 3. Analytics/Reports
- ✅ Super Admin: All companies
- ✅ Company Admin: Company-wide
- ✅ Sales Manager: Team-only
- ✅ Sales Rep: Personal metrics
**Status:** COMPLETE

#### 4. CRM Customization
- ✅ Super Admin: Global defaults
- ✅ Company Admin: Company-level
- ✅ Sales Manager: View only
- ✅ Sales Rep: No access
**Status:** COMPLETE (Permission checks added)

#### 5. Data Export/Import
- ✅ Super Admin: Any company
- ✅ Company Admin: Their company
- ✅ Sales Manager: Team-only
- ✅ Sales Rep: No access
**Status:** COMPLETE (Permission checks added)

---

## ⚠️ PARTIALLY IMPLEMENTED (10%)

### 6. Billing Management
**Current:**
- ✅ Backend permissions exist
- ⚠️ Frontend pages partially restricted

**Missing:**
- ❌ Super Admin: Set plans/payments UI
- ❌ Company Admin: View own billing (needs better UI)
- ❌ Sales Manager/Rep: Blocked from billing pages

**Action Required:**
- Add permission checks to CompanyBilling.tsx
- Add permission checks to SuperAdminBilling.tsx
- Hide billing menu items for Sales Manager/Rep

### 7. Company Management
**Current:**
- ✅ Backend permissions exist
- ⚠️ Frontend partially implemented

**Missing:**
- ❌ Super Admin: Create/delete companies UI
- ❌ Company Admin: Edit own company settings
- ❌ Sales Manager: Limited team settings access
- ❌ Sales Rep: No access (needs enforcement)

**Action Required:**
- Add company creation/deletion UI for Super Admin
- Add company settings page with role-based access
- Hide company management from Sales Rep

### 8. Lead/Deal Assignment
**Current:**
- ✅ Backend logic exists in deals.py
- ⚠️ Frontend UI needs enhancement

**Missing:**
- ❌ Super Admin: Assign anywhere UI
- ❌ Company Admin: Assign within company UI
- ❌ Sales Manager: Assign to team reps UI
- ❌ Sales Rep: Assignment button hidden

**Action Required:**
- Add assignment dropdown in Deals page
- Filter assignable users by role
- Hide assignment for Sales Rep

### 9. Integrations Management
**Current:**
- ✅ Backend permissions exist
- ⚠️ Frontend partially restricted

**Missing:**
- ❌ Super Admin: Global configuration UI
- ❌ Company Admin: Company-level management
- ❌ Sales Manager: Team-level management
- ❌ Sales Rep: Use only (no management)

**Action Required:**
- Add permission checks to TwilioSettings.tsx
- Add permission checks to integrations pages
- Show different UI based on role

### 10. Automations/Workflows
**Current:**
- ✅ Backend permissions exist
- ✅ WorkflowTemplates has permission checks
- ⚠️ Workflows.tsx needs enhancement

**Missing:**
- ❌ Super Admin: Global templates management
- ❌ Company Admin: Company-level workflows
- ❌ Sales Manager: Team-level workflows
- ❌ Sales Rep: Personal automations only

**Action Required:**
- Add scope filtering in Workflows.tsx
- Show only relevant workflows per role
- Add creation restrictions

---

## ❌ NOT IMPLEMENTED (5%)

### 11. Notifications Scope
**Current:**
- ✅ Basic notifications work
- ❌ No role-based filtering

**Missing:**
- ❌ Super Admin: All system alerts
- ❌ Company Admin: Company + team
- ❌ Sales Manager: Team & reps
- ❌ Sales Rep: Personal only

**Action Required:**
- Add notification filtering in backend
- Update Notifications.tsx with role-based display

### 12. Support Tickets Scope
**Current:**
- ✅ Basic support tickets work
- ❌ No role-based filtering

**Missing:**
- ❌ Super Admin: Full system
- ❌ Company Admin: Company-level
- ❌ Sales Manager: Team-level
- ❌ Sales Rep: User-level

**Action Required:**
- Add ticket filtering in backend
- Update SupportTickets.tsx with role-based display

---

## IMPLEMENTATION PRIORITY

### 🔴 HIGH PRIORITY (Complete First)

1. **Lead/Deal Assignment UI** (Critical for sales workflow)
   - Files: `Deals.tsx`, `deals.py`
   - Add assignment dropdown with role-based filtering
   - Hide for Sales Rep

2. **Billing Page Restrictions** (Security critical)
   - Files: `CompanyBilling.tsx`, `SuperAdminBilling.tsx`
   - Add permission checks
   - Hide from Sales Manager/Rep

3. **Company Settings Access** (Data security)
   - Files: `Settings.tsx`, `companies.py`
   - Role-based company editing
   - Super Admin company creation

### 🟡 MEDIUM PRIORITY (Complete Second)

4. **Integrations Management** (Feature access)
   - Files: `TwilioSettings.tsx`, `integrations.py`
   - Role-based configuration
   - Use-only mode for Sales Rep

5. **Workflows Scope Filtering** (Automation control)
   - Files: `Workflows.tsx`, `workflows.py`
   - Show only relevant workflows
   - Scope-based creation

6. **Notifications Filtering** (Information access)
   - Files: `Notifications.tsx`, `notifications.py`
   - Role-based notification display
   - Scope filtering

### 🟢 LOW PRIORITY (Complete Last)

7. **Support Tickets Scope** (Support organization)
   - Files: `SupportTickets.tsx`, `support_tickets.py`
   - Role-based ticket visibility
   - Escalation paths

---

## DETAILED IMPLEMENTATION TASKS

### Task 1: Deal Assignment UI
**Files to Modify:**
- `frontend/src/pages/Deals.tsx`
- `backend/app/api/deals.py` (already has logic)

**Changes:**
```typescript
// Add assignment dropdown
const canAssignDeals = isSuperAdmin() || isCompanyAdmin() || isSalesManager();

// Filter assignable users
const getAssignableUsers = () => {
  if (isSuperAdmin()) return allUsers; // All companies
  if (isCompanyAdmin()) return companyUsers; // Company only
  if (isSalesManager()) return teamUsers; // Team only
  return []; // Sales Rep cannot assign
};
```

### Task 2: Billing Restrictions
**Files to Modify:**
- `frontend/src/pages/CompanyBilling.tsx`
- `frontend/src/pages/SuperAdminBilling.tsx`
- `frontend/src/components/Layout.tsx` (hide menu)

**Changes:**
```typescript
// CompanyBilling.tsx
const canViewBilling = isSuperAdmin() || isCompanyAdmin();
if (!canViewBilling) return <AccessDenied />;

// Layout.tsx - hide billing menu
{(isSuperAdmin() || isCompanyAdmin()) && (
  <MenuItem to="/billing">Billing</MenuItem>
)}
```

### Task 3: Company Settings
**Files to Modify:**
- `frontend/src/pages/Settings.tsx`
- `backend/app/api/companies.py`

**Changes:**
```typescript
// Settings.tsx - Company tab
const canEditCompany = isSuperAdmin() || isCompanyAdmin();
const canCreateCompany = isSuperAdmin();

// Show different fields based on role
{canEditCompany && <CompanyInfoForm />}
{canCreateCompany && <CreateCompanyButton />}
```

### Task 4: Integrations Management
**Files to Modify:**
- `frontend/src/pages/TwilioSettings.tsx`
- `frontend/src/pages/Settings.tsx` (Integrations tab)

**Changes:**
```typescript
// TwilioSettings.tsx
const canConfigureIntegrations = isSuperAdmin() || isCompanyAdmin();
const canManageTeamIntegrations = isSalesManager();
const canUseIntegrations = true; // All roles

// Show appropriate UI
{canConfigureIntegrations && <ConfigurationPanel />}
{canManageTeamIntegrations && <TeamSettingsPanel />}
{canUseIntegrations && <UsagePanel />}
```

### Task 5: Workflows Scope
**Files to Modify:**
- `frontend/src/pages/Workflows.tsx`
- `backend/app/api/workflows.py`

**Changes:**
```typescript
// Workflows.tsx
const getWorkflowScope = () => {
  if (isSuperAdmin()) return 'global';
  if (isCompanyAdmin()) return 'company';
  if (isSalesManager()) return 'team';
  return 'personal';
};

// Filter workflows by scope
const filteredWorkflows = workflows.filter(w => 
  w.scope === getWorkflowScope() || w.scope === 'personal'
);
```

### Task 6: Notifications Filtering
**Files to Modify:**
- `frontend/src/pages/Notifications.tsx`
- `backend/app/api/notifications.py`

**Changes:**
```python
# notifications.py
if context.is_super_admin():
    # All system alerts
    query = query.filter(Notification.scope.in_(['system', 'company', 'team', 'user']))
elif has_permission(current_user, Permission.VIEW_COMPANY_NOTIFICATIONS):
    # Company + team
    query = query.filter(Notification.scope.in_(['company', 'team', 'user']))
elif has_permission(current_user, Permission.VIEW_TEAM_NOTIFICATIONS):
    # Team & reps
    query = query.filter(Notification.scope.in_(['team', 'user']))
else:
    # Personal only
    query = query.filter(Notification.scope == 'user')
```

### Task 7: Support Tickets Scope
**Files to Modify:**
- `frontend/src/pages/SupportTickets.tsx`
- `backend/app/api/support_tickets.py`

**Changes:**
```python
# support_tickets.py
if context.is_super_admin():
    # Full system
    pass  # No filter
elif has_permission(current_user, Permission.MANAGE_COMPANY_SUPPORT):
    # Company-level
    query = query.filter(Ticket.company_id == company_id)
elif has_permission(current_user, Permission.MANAGE_TEAM_SUPPORT):
    # Team-level
    team_user_ids = get_team_user_ids(user_team_id)
    query = query.filter(Ticket.created_by.in_(team_user_ids))
else:
    # User-level
    query = query.filter(Ticket.created_by == user_id)
```

---

## TESTING CHECKLIST

### Per Role Testing:

#### Super Admin
- [ ] Can access all companies
- [ ] Can create/delete companies
- [ ] Can set billing plans
- [ ] Can assign deals anywhere
- [ ] Can configure global integrations
- [ ] Can create global workflows
- [ ] Can see all notifications
- [ ] Can see all support tickets

#### Company Admin
- [ ] Can access own company only
- [ ] Can view own billing
- [ ] Can edit company settings
- [ ] Can add/remove users
- [ ] Can assign deals in company
- [ ] Can configure company integrations
- [ ] Can create company workflows
- [ ] Can see company notifications
- [ ] Can see company support tickets

#### Sales Manager
- [ ] Can access team data only
- [ ] Cannot access billing
- [ ] Can edit team settings
- [ ] Can add/remove team members
- [ ] Can assign deals to team
- [ ] Can manage team integrations
- [ ] Can create team workflows
- [ ] Can see team notifications
- [ ] Can see team support tickets

#### Sales Rep
- [ ] Can access own data only
- [ ] Cannot access billing
- [ ] Cannot edit settings
- [ ] Cannot manage users
- [ ] Cannot assign deals
- [ ] Can use integrations only
- [ ] Can use personal automations
- [ ] Can see personal notifications
- [ ] Can see own support tickets

---

## ESTIMATED EFFORT

| Task | Complexity | Time | Priority |
|------|------------|------|----------|
| Deal Assignment UI | Medium | 2-3 hours | 🔴 High |
| Billing Restrictions | Low | 1 hour | 🔴 High |
| Company Settings | Medium | 2-3 hours | 🔴 High |
| Integrations Management | Medium | 2 hours | 🟡 Medium |
| Workflows Scope | Medium | 2 hours | 🟡 Medium |
| Notifications Filtering | Low | 1-2 hours | 🟡 Medium |
| Support Tickets Scope | Low | 1-2 hours | 🟢 Low |

**Total Estimated Time:** 11-15 hours
**Current Completion:** 85%
**Remaining:** 15%

---

## SUCCESS CRITERIA

- [ ] All permission matrix requirements implemented
- [ ] All roles tested and verified
- [ ] UI elements hidden/shown based on permissions
- [ ] Backend enforces all permission rules
- [ ] User-friendly error messages for all restrictions
- [ ] Documentation updated
- [ ] 100% compliance achieved

---

**Status:** Ready to implement remaining 15%  
**Next Step:** Start with High Priority tasks
