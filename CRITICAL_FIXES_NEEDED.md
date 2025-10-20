# Critical Fixes Needed

## Issues to Fix:

### 1. Contact Status Enum - Database Migration
**Problem:** Database doesn't have 'lead' and 'prospect' enum values
**Solution:** Run the migration script on production database

```bash
# SSH into server
ssh root@sunstonecrm.com

# Run migration
cd /var/www/crm-app
psql -U crm_user -d crm_db -f backend/migrations/add_contact_status_values.sql

# Or manually:
psql -U crm_user -d crm_db
ALTER TYPE contactstatus ADD VALUE IF NOT EXISTS 'lead';
ALTER TYPE contactstatus ADD VALUE IF NOT EXISTS 'prospect';
```

### 2. File Download 404
**Problem:** Files are not being stored on disk properly
**Solution:** Need to verify file upload is saving files to disk and storing correct path

### 3. File Category Not Saving
**Problem:** Category field not being saved during file upload
**Solution:** Check frontend is sending category in upload request

### 4. Quotes Client Name Not Saving
**Problem:** Frontend sending 'client' but backend expects 'client_id'
**Solution:** Update frontend to send client_id

### 5. Dashboard Not Updating
**Problem:** Dashboard statistics not refreshing with new data
**Solution:** Check dashboard API endpoints are returning real data

### 6. Password Reset Email Not Sending
**Problem:** Email sending not implemented
**Solution:** Implement SMTP email sending with Gmail

### 7. Remove Mock Data
**Problem:** Many pages still have mock/fallback data
**Solution:** Remove all mock data arrays from frontend pages

### 8. Clean Up Unused Files
**Files to remove:**
- README files
- Documentation files
- Unused component files
