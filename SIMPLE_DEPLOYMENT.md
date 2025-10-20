# Simple Deployment Guide

## On VPS Ubuntu Server:

```bash
# 1. Pull latest code
cd /var/www/crm-app
git reset --hard
git pull origin main

# 2. Run database migration
sudo -u postgres psql sales_crm -c "ALTER TYPE contactstatus ADD VALUE IF NOT EXISTS 'lead';"
sudo -u postgres psql sales_crm -c "ALTER TYPE contactstatus ADD VALUE IF NOT EXISTS 'prospect';"

# 3. Build frontend
cd /var/www/crm-app/frontend
npm run build

# 4. Restart backend
sudo systemctl restart crm-backend
sudo systemctl status crm-backend
```

That's it! All files are already correct in GitHub.
