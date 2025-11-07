# Analytics Permission Audit

## Requirements:
1. **Company Isolation**: All queries MUST filter by `company_id` first
2. **Role-Based Access**:
   - Super Admin / Company Admin / Admin: Can see ALL company data OR filter by user
   - Regular User: Can ONLY see their own data (no user filter option)

## Backend Endpoints Audit:

### ✅ `/analytics/dashboard` - CORRECT
- Filters by `company_id` ✅
- Accepts `user_id` parameter ✅
- Logic: If `user_id` provided → filter by user, else → all company data ✅

### ✅ `/analytics/pipeline` - CORRECT
- Filters by `company_id` ✅
- Accepts `user_id` parameter ✅
- Logic: If `user_id` provided → filter by user, else → all company data ✅

### ✅ `/analytics/revenue` - CORRECT
- Filters by `company_id` ✅
- Accepts `user_id` parameter ✅
- Logic: If `user_id` provided → filter by user, else → all company data ✅

### ✅ `/analytics/activities` - CORRECT
- Filters by `company_id` ✅
- Accepts `user_id` parameter ✅
- Logic: If `user_id` provided → filter by user, else → all company data ✅

### ✅ `/analytics/contacts` - CORRECT
- Filters by `company_id` ✅
- Accepts `user_id` parameter ✅
- Logic: If `user_id` provided → filter by user, else → all company data ✅

### ❌ `/analytics/emails` - DUMMY DATA (Not Critical)
- Returns hardcoded data
- Not used in main analytics

### ❌ `/analytics/calls` - DUMMY DATA (Not Critical)
- Returns hardcoded data
- Not used in main analytics

### ❌ `/analytics/documents` - DUMMY DATA (Not Critical)
- Returns hardcoded data
- Not used in main analytics

## Frontend Pages Audit:

### ❌ Dashboard.tsx - ISSUE FOUND
**Problem**: Hardcoded logic that prevents admins from seeing company-wide data
```typescript
// Current logic - WRONG!
if (currentUser && currentUser.user_role !== 'Super Admin') {
  filters.user_id = currentUser.id;
}
```

**Issue**: 
- Company Admin and Admin roles CANNOT see company-wide data
- They are forced to see only their own data
- No user filter dropdown to select team members

**Required Fix**:
- Regular users: Always filter by their own `user_id`
- Admins: Show company-wide data by default, add user filter dropdown

---

### ❌ Analytics.tsx - NEEDS VERIFICATION
**Need to check**:
- Does it have user filter dropdown?
- Is the dropdown visible to all roles or only admins?
- Does it pass filters correctly?

---

## Action Items:

1. ✅ Backend endpoints are mostly correct
2. ❌ Fix Dashboard.tsx role-based filtering
3. ❌ Verify Analytics.tsx has proper role-based UI
4. ❌ Add user filter dropdown to Dashboard for admins
5. ❌ Ensure regular users cannot see/use user filters
