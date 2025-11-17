# 🔒 COMPREHENSIVE PERMISSION AUDIT & FIXES

**Date:** November 17, 2025  
**Status:** IN PROGRESS  
**Priority:** CRITICAL

---

## 📋 PERMISSION MATRIX (REFERENCE)

### Sales Rep (Regular User) Restrictions:
According to the permission matrix, Sales Reps should have:
- ❌ **NO** delete permissions for activities
- ❌ **NO** delete permissions for deals
- ❌ **NO** delete permissions for contacts
- ❌ **NO** ability to add/remove users
- ❌ **NO** access to company settings
- ❌ **NO** ability to assign leads/deals
- ❌ **NO** CRM customization access
- ❌ **NO** data export/import
- ✅ **YES** view own data only
- ✅ **YES** edit own data
- ✅ **YES** create activities, deals, contacts for themselves

---

## 🔍 AUDIT FINDINGS

### ❌ CRITICAL ISSUES FOUND:

#### 1. **Activities Delete Permission** 
**File:** `backend/app/api/activities.py`  
**Lines:** 239-256, 436-458 (DUPLICATE ENDPOINTS!)  
**Issue:** Sales Reps CAN delete their own activities  
**Current Logic:** `if str(activity.owner_id) != current_user["id"]`  
**Problem:** This allows owners to delete, but Sales Reps should NOT be able to delete  
**Fix Required:** Add role check - only Managers and Admins can delete

#### 2. **Deals Delete Permission**
**File:** `backend/app/api/deals.py`  
**Lines:** 518-547  
**Issue:** ANY user in company can delete deals (only company check)  
**Current Logic:** Only checks `company_id`  
**Problem:** Sales Reps can delete any deal in their company  
**Fix Required:** Add role-based permission check

#### 3. **Contacts Delete Permission**
**File:** `backend/app/api/contacts.py`  
**Lines:** 394-470  
**Issue:** Sales Reps can delete their own contacts  
**Current Logic:** Allows deletion if owner matches  
**Problem:** Sales Reps should not delete contacts  
**Fix Required:** Add role check - only Managers and Admins can delete

#### 4. **Duplicate Delete Endpoints**
**File:** `backend/app/api/activities.py`  
**Issue:** TWO identical delete endpoints (lines 239 and 436)  
**Problem:** Code duplication, maintenance nightmare  
**Fix Required:** Remove duplicate

---

## 🛠️ FIXES REQUIRED

### Priority 1: Delete Permissions (CRITICAL)

#### Fix 1: Activities Delete
```python
# Current (WRONG):
if str(activity.owner_id) != current_user["id"]:
    raise HTTPException(status_code=403, detail="Not authorized")

# Fixed (CORRECT):
from app.middleware.permissions import has_permission
from app.models.permissions import Permission

# Only Managers and Admins can delete activities
if not (has_permission(current_user, Permission.MANAGE_TEAM_DATA) or 
        has_permission(current_user, Permission.MANAGE_COMPANY_DATA)):
    raise HTTPException(
        status_code=403, 
        detail="You don't have permission to delete activities. Please contact your manager or administrator."
    )

# Check ownership for managers
if has_permission(current_user, Permission.MANAGE_TEAM_DATA):
    # Manager can only delete team activities
    if user_team_id:
        team_user_ids = [...]
        if str(activity.owner_id) not in team_user_ids:
            raise HTTPException(...)
```

#### Fix 2: Deals Delete
```python
# Add role-based permission check
if not (has_permission(current_user, Permission.MANAGE_TEAM_DATA) or 
        has_permission(current_user, Permission.MANAGE_COMPANY_DATA)):
    raise HTTPException(
        status_code=403,
        detail="You don't have permission to delete deals. Please contact your manager or administrator."
    )
```

#### Fix 3: Contacts Delete
```python
# Add role check before ownership check
if not (has_permission(current_user, Permission.MANAGE_TEAM_DATA) or 
        has_permission(current_user, Permission.MANAGE_COMPANY_DATA)):
    raise HTTPException(
        status_code=403,
        detail="You don't have permission to delete contacts. Please contact your manager or administrator."
    )
```

#### Fix 4: Remove Duplicate Activity Delete Endpoint
- Keep the first one (line 239)
- Remove the second one (line 436)

---

## 📝 USER-FRIENDLY ERROR MESSAGES

### Current Messages (Generic):
- ❌ "Not authorized to delete this activity"
- ❌ "Access denied to this contact"
- ❌ "Deal not found"

### New Messages (User-Friendly):
- ✅ "You don't have permission to delete activities. Only managers and administrators can delete activities. Please contact your manager if you need to remove an activity."
- ✅ "You don't have permission to delete contacts. Only managers and administrators can delete contacts. Please contact your administrator for assistance."
- ✅ "You don't have permission to delete deals. Only managers and administrators can delete deals. Please contact your manager if you need to remove a deal."
- ✅ "You don't have permission to perform this action. Please contact your administrator."

---

## 🔍 ADDITIONAL AUDITS NEEDED

### Other Delete Operations to Check:
1. ✅ **Emails** - Check if Sales Reps can delete
2. ✅ **SMS Messages** - Check if Sales Reps can delete
3. ✅ **Files** - Check if Sales Reps can delete
4. ✅ **Calls** - Check if Sales Reps can delete
5. ✅ **Quotes** - Check if Sales Reps can delete
6. ✅ **Notifications** - Personal notifications OK to delete
7. ✅ **Support Tickets** - Check if Sales Reps can delete

### Other Permission Issues to Check:
1. ✅ **User Management** - Sales Reps should NOT add/remove users
2. ✅ **Team Management** - Sales Reps should NOT manage teams
3. ✅ **Company Settings** - Already fixed (view-only)
4. ✅ **Integrations** - Already fixed (admin-only)
5. ✅ **Billing** - Already fixed (admin-only)
6. ✅ **CRM Customization** - Check if Sales Reps can modify
7. ✅ **Data Import/Export** - Check if Sales Reps can access
8. ✅ **Workflows** - Check if Sales Reps can create/delete
9. ✅ **Pipelines** - Check if Sales Reps can modify

---

## 📊 IMPLEMENTATION PLAN

### Phase 1: Critical Fixes (NOW)
- [ ] Fix Activities delete permission
- [ ] Fix Deals delete permission
- [ ] Fix Contacts delete permission
- [ ] Remove duplicate activity delete endpoint
- [ ] Add user-friendly error messages

### Phase 2: Additional Audits (NEXT)
- [ ] Audit all remaining delete operations
- [ ] Audit user management endpoints
- [ ] Audit CRM customization endpoints
- [ ] Audit data import/export endpoints

### Phase 3: Frontend Updates (AFTER)
- [ ] Hide delete buttons for Sales Reps
- [ ] Show permission tooltips
- [ ] Add permission badges
- [ ] Update UI to reflect permissions

### Phase 4: Testing (FINAL)
- [ ] Test as Sales Rep - verify NO delete access
- [ ] Test as Sales Manager - verify team delete access
- [ ] Test as Company Admin - verify company delete access
- [ ] Test as Super Admin - verify full delete access

---

## 🎯 SUCCESS CRITERIA

- ✅ Sales Reps CANNOT delete activities
- ✅ Sales Reps CANNOT delete deals
- ✅ Sales Reps CANNOT delete contacts
- ✅ Sales Reps CANNOT manage users
- ✅ Sales Reps CANNOT access company settings
- ✅ All error messages are user-friendly
- ✅ No duplicate endpoints
- ✅ 100% compliance with permission matrix

---

## 📝 NOTES

- All delete operations should check role-based permissions FIRST
- Then check ownership/scope (company/team/personal)
- Always provide user-friendly error messages
- Consider soft deletes vs hard deletes
- Log all delete operations for audit trail

---

**Status:** Ready to implement fixes  
**Next Step:** Apply fixes to activities.py, deals.py, contacts.py
