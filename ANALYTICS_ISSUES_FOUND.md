# Analytics Issues - Complete Audit

## CRITICAL ISSUES FOUND:

### Issue 1: WRONG ROLE NAMES IN FRONTEND ❌
**Location:** `Analytics.tsx`, `Dashboard.tsx`

**Current (WRONG):**
```typescript
const isAdmin = currentUser && ['Super Admin', 'Company Admin', 'Admin'].includes(currentUser.role);
```

**Database Actual Roles:**
- `super_admin` (CRM owner)
- `company_admin` (Company owner)
- `company_user` (Regular user)

**Fix Required:**
```typescript
const isAdmin = currentUser && ['super_admin', 'company_admin'].includes(currentUser.role);
```

---

### Issue 2: BACKEND ROLE MAPPING INCONSISTENCY ❌
**Location:** `backend/app/api/users.py` line 76

**Current:**
```python
role=user.user_role.value if hasattr(user.user_role, 'value') else str(user.user_role)
```

This returns the enum value (e.g., "super_admin"), which is CORRECT.

---

### Issue 3: PERMISSION LOGIC ❌
**Current Logic:**
- Super Admin: See all company data
- Company Admin: See all company data
- Company User: See only their data

**Required Logic:**
- `super_admin`: Can see ALL companies (cross-company access)
- `company_admin`: Can see all users in THEIR company + filter by user
- `company_user`: Can ONLY see their own data (no filter option)

---

### Issue 4: BACKEND ANALYTICS ENDPOINTS ✅
**Status:** Already correct! All endpoints filter by:
1. `company_id` first (company isolation)
2. `user_id` if provided (user-specific data)

---

### Issue 5: FRONTEND NOT PASSING FILTERS CORRECTLY ❌
**Analytics.tsx** - Need to verify filter parameters are being passed correctly

---

## FIXES NEEDED:

1. ✅ Fix role names in Analytics.tsx
2. ✅ Fix role names in Dashboard.tsx
3. ❌ Add super_admin cross-company logic (if needed)
4. ❌ Test all graphs with real data
5. ❌ Verify filter parameters are passed correctly
