# Multi-Tenancy Migration Guide

## Overview
This CRM application has been updated to support full multi-tenancy, where each company's data is completely isolated from other companies.

## Issue with Historical Data

### Problem
If you have existing data created **before** multi-tenancy was implemented, those records have `company_id = NULL`. The new multi-tenant APIs filter by `company_id`, which could hide old data.

### Solution
We've implemented a **backward-compatible approach** that:
1. Shows records matching the user's `company_id`
2. **ALSO** shows records with `NULL company_id` that belong to the user

This ensures old data remains visible while maintaining multi-tenant isolation for new data.

## Migration Options

### Option 1: Keep Backward Compatibility (Current Implementation) ✅
**Status**: Already implemented in the code

The APIs now use this filter pattern:
```python
query = db.query(Model).filter(
    or_(
        Model.company_id == company_id,
        and_(Model.company_id.is_(None), Model.user_id == user_id)
    )
)
```

**Pros**:
- No data migration needed
- Old data immediately visible
- Zero downtime

**Cons**:
- Slightly more complex queries
- NULL company_id records remain in database

### Option 2: Run Data Migration (Recommended for Production)
**Status**: Migration script provided

Run the migration script to populate `company_id` for all existing records:

```bash
cd /var/www/crm-app/backend
python -m app.scripts.migrate_company_id
```

This will:
- Find all records with `NULL company_id`
- Populate `company_id` based on the user's company
- Update records in batches

**Pros**:
- Cleaner database
- Simpler queries after migration
- Better performance

**Cons**:
- Requires running migration script
- Should be done during low-traffic period

## APIs Updated for Backward Compatibility

### Communication APIs
- ✅ SMS Enhanced API (`/api/sms/messages`)
- ✅ Calls API (`/api/calls`)
- ✅ Emails API (already handles NULL)

### Other APIs
All other APIs already have proper company_id handling:
- Contacts, Deals, Activities, Pipelines
- Files, Quotes, Workflows
- Bulk Email Campaigns, Conversations, Inbox

## Testing Multi-Tenancy

### 1. Create Test Companies
```sql
-- Create two test companies
INSERT INTO companies (id, name, created_at) 
VALUES 
  (gen_random_uuid(), 'Company A', NOW()),
  (gen_random_uuid(), 'Company B', NOW());
```

### 2. Assign Users to Companies
```sql
-- Update user's company
UPDATE users 
SET company_id = (SELECT id FROM companies WHERE name = 'Company A' LIMIT 1)
WHERE email = 'user1@example.com';

UPDATE users 
SET company_id = (SELECT id FROM companies WHERE name = 'Company B' LIMIT 1)
WHERE email = 'user2@example.com';
```

### 3. Test Data Isolation
1. Login as User 1 (Company A)
2. Create contacts, deals, send SMS
3. Login as User 2 (Company B)
4. Verify you CANNOT see Company A's data
5. Create your own data
6. Login back as User 1
7. Verify you CANNOT see Company B's data

## Frontend Compatibility

### No Changes Required ✅
The frontend continues to work without any modifications because:
- All API endpoints remain the same
- Authentication flow unchanged
- Response formats unchanged

The backend handles all multi-tenancy logic transparently.

## Database Schema

### Tables with company_id
All major tables now have `company_id` column:
- `sms_messages`
- `calls`
- `emails`
- `contacts`
- `deals`
- `activities`
- `pipelines`
- `files`
- `folders`
- `quotes`
- `workflows`
- `bulk_email_campaigns`
- `user_conversations`
- `inbox`

### Nullable vs Required
- `company_id` is **nullable** for backward compatibility
- New records automatically get `company_id` from current user
- Old records with NULL are still accessible to original user

## Deployment Checklist

- [x] Update all API endpoints for multi-tenancy
- [x] Add backward compatibility for NULL company_id
- [x] Test with existing data
- [ ] Run migration script (optional but recommended)
- [ ] Test data isolation between companies
- [ ] Monitor logs for any 403 errors

## Troubleshooting

### "No company associated with user" Error
**Cause**: User doesn't have a company_id assigned

**Fix**:
```sql
-- Assign user to a company
UPDATE users 
SET company_id = (SELECT id FROM companies WHERE name = 'Your Company' LIMIT 1)
WHERE email = 'user@example.com';
```

### Old Data Not Showing
**Cause**: Backward compatibility not implemented for that endpoint

**Fix**: Check if the endpoint uses the OR filter pattern shown above

### Data Leaking Between Companies
**Cause**: Missing company_id filter on an endpoint

**Fix**: Verify all queries include company_id filtering

## Support

For issues or questions:
1. Check application logs: `sudo journalctl -u crm-backend -f`
2. Verify user has company_id: `SELECT id, email, company_id FROM users WHERE email = 'your@email.com';`
3. Check data has company_id: `SELECT COUNT(*), company_id FROM sms_messages GROUP BY company_id;`
