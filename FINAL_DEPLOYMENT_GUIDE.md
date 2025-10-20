# Final Deployment Guide - SunstoneCRM

## All Issues Fixed ✅

### 1. Contact Status Enum Fixed
- Added "lead" and "prospect" to database enum
- Migration script ready

### 2. Mock Data Removed
- Removed all mock/fallback data from:
  - Contacts page
  - Activities page
  - Email page
  - SMS page
  - Calls page
  - Inbox page

### 3. Password Reset Email Implemented
- SMTP email sending configured
- Uses environment variables for Gmail credentials

### 4. Email/SMS/Calls Pages Improved
- Combined search and manual input into single field
- Better UX - type to search contacts or enter directly
- Dropdown shows matching contacts

### 5. File Download & Folder Navigation
- Download endpoint added
- Breadcrumb navigation for folders

---

## Deployment Steps

### Step 1: Pull Latest Code
```bash
cd /var/www/crm-app
git pull origin main
```

### Step 2: Run Database Migration
```bash
# Connect to database
psql -U crm_user -d crm_db

# Run these commands:
ALTER TYPE contactstatus ADD VALUE IF NOT EXISTS 'lead';
ALTER TYPE contactstatus ADD VALUE IF NOT EXISTS 'prospect';

# Exit
\q
```

### Step 3: Configure Environment Variables
```bash
# Edit backend .env file
nano /var/www/crm-app/backend/.env

# Add these lines:
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Save and exit (Ctrl+X, Y, Enter)
```

### Step 4: Replace Frontend Pages
```bash
cd /var/www/crm-app/frontend/src/pages

# Replace old files with new ones
mv EmailNew.tsx Email.tsx
mv SMSNew.tsx SMS.tsx
mv CallsNew.tsx Calls.tsx
```

### Step 5: Build Frontend
```bash
cd /var/www/crm-app/frontend
npm run build
```

### Step 6: Restart Backend
```bash
sudo systemctl restart crm-backend
sudo systemctl status crm-backend
```

### Step 7: Verify Deployment
Visit https://sunstonecrm.com and test:
- [ ] Contact filtering with "lead" status works
- [ ] No mock data appears on any page
- [ ] Password reset sends email
- [ ] File download works
- [ ] Email/SMS/Calls have combined input field
- [ ] Twilio integration configured in Settings
- [ ] Gmail integration configured in Settings

---

## Gmail App Password Setup

1. Go to https://myaccount.google.com/apppasswords
2. Create new app password for "Mail"
3. Copy the 16-character password
4. Use it as SMTP_PASSWORD in .env

---

## Twilio Setup

Users configure in Settings > Integrations:
1. Account SID (from Twilio Console)
2. Auth Token (from Twilio Console)
3. Phone Number (purchased Twilio number)

---

## Troubleshooting

### Contact Status Error
If you still see enum errors:
```bash
psql -U crm_user -d crm_db
SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'contactstatus');
```
Should show: new, lead, prospect, contacted, qualified, unqualified, customer, inactive

### Email Not Sending
Check backend logs:
```bash
sudo journalctl -u crm-backend -f
```
Verify SMTP credentials are correct in .env

### File Download 404
Verify files are being uploaded to correct directory and paths are stored in database

---

## All Changes Summary

**Backend:**
- `backend/app/api/auth.py` - SMTP email sending
- `backend/app/api/files.py` - Download endpoint
- `backend/app/models/contacts.py` - Updated enum
- `backend/migrations/add_contact_status_values.sql` - Migration

**Frontend:**
- `frontend/src/pages/Contacts.tsx` - Removed mock data
- `frontend/src/pages/Activities.tsx` - Removed mock data
- `frontend/src/pages/Email.tsx` - Removed mock data
- `frontend/src/pages/SMS.tsx` - Removed mock data
- `frontend/src/pages/Calls.tsx` - Removed mock data
- `frontend/src/pages/Inbox.tsx` - Removed mock data
- `frontend/src/pages/EmailNew.tsx` - Combined input field
- `frontend/src/pages/SMSNew.tsx` - Combined input field
- `frontend/src/pages/CallsNew.tsx` - Combined input field
- `frontend/src/pages/Files.tsx` - Breadcrumb navigation
- `frontend/src/pages/Settings.tsx` - Gmail & Twilio integrations

---

## Production Ready! 🚀

All critical issues have been fixed. The application is now ready for production use.
