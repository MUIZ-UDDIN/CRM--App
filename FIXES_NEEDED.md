# CRM App - Issues to Fix

## Status Summary
- ✅ Notifications API - FIXED (tables created)
- ✅ Emails API - FIXED (owner_id corrected)
- ✅ Files API - FIXED (routes registered)
- ✅ Workflows API - FIXED (routes registered)
- ✅ Deals - Already using real API (no mock data)
- ✅ Contacts - Search and filters already implemented

## Remaining Issues

### 1. Contacts Edit Type Dropdown
**Issue:** User reports type dropdown not changing when editing
**Status:** Code looks correct - needs testing
**Location:** `frontend/src/pages/Contacts.tsx` lines 555-578
**Fix Needed:** Verify dropdown is working, may be a UI/UX issue

### 2. Pipeline Page
**Issue:** May be using mock data, stage dropdown not showing options
**Status:** Needs investigation
**Files to check:**
- `frontend/src/pages/Pipeline.tsx` or `frontend/src/pages/Pipelines.tsx`
- Backend: `backend/app/api/pipelines.py`

### 3. Quotes Page
**Issue:** Using mock data, buttons not working
**Status:** Needs complete overhaul
**Files to check:**
- `frontend/src/pages/Quotes.tsx`
- Backend: Need to create `backend/app/api/quotes.py` if doesn't exist

### 4. Drag-and-Drop Icon
**Issue:** User says drag icon not showing in Deals
**Status:** Code has Bars3Icon at line 303 - should be visible
**Possible cause:** CSS issue or icon not rendering

## Next Steps
1. Check if Pipeline page exists and has mock data
2. Check if Quotes page exists and create API if needed
3. Test drag-and-drop functionality
4. Verify all filters and search work correctly
