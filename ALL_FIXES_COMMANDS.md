# ALL FIXES - COMMANDS TO RUN

## Step 1: Check Backend Logs for Errors

```bash
# Check custom fields API registration
journalctl -u crm-backend -n 50 | grep -i "custom"

# Check workflow template errors  
journalctl -u crm-backend -n 50 | grep -i "workflow"

# Check all recent errors
journalctl -u crm-backend -n 100 | grep -E "ERROR|500|404"
```

## Step 2: After I push fixes, deploy with:

```bash
cd /var/www/crm-app
git pull origin main
systemctl restart crm-backend
cd frontend
npm run build
```

## Issues Being Fixed:

1. ✅ Remove Team link from More dropdown (redundant with Settings > Team)
2. ✅ Fix Billing Management stats (Active/Trial/Expired counters)
3. ✅ Fix Billing table Next Billing date format
4. ✅ Remove Edit button, keep only View button in Billing
5. ✅ Add Assign functionality to Support Tickets
6. ✅ Fix workflow template "Use Template" 500 error
7. ⚠️  Twilio errors (need Twilio credentials configured - not a code issue)
8. ⚠️  Custom Fields 404 (need to check backend logs first)
