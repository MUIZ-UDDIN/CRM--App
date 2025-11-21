---
description: Deploy CRM app from local to GitHub to VPS (Hostinger)
---

# 🚀 Deploy CRM App to VPS via GitHub

This workflow guides you through committing local changes to GitHub and deploying them to your Hostinger VPS.

---

## **Prerequisites**
- Git configured with GitHub credentials
- SSH access to Hostinger VPS
- VPS already has the app deployed at `/var/www/crm-app`

---

## **Step 1: Check Current Status**

```bash
cd "c:\Users\MUIZ UD DIN\CRM--App"
git status
```

This shows any uncommitted changes in your local repository.

---

## **Step 2: Stage All Changes**

// turbo
```bash
git add .
```

This stages all modified, new, and deleted files for commit.

---

## **Step 3: Commit Changes**

```bash
git commit -m "Your commit message here"
```

**Example commit messages:**
- `"Add new feature: customer analytics dashboard"`
- `"Fix: resolve multi-tenancy data isolation issue"`
- `"Update: improve mobile responsiveness"`
- `"Deploy: backend API improvements"`

---

## **Step 4: Push to GitHub**

// turbo
```bash
git push origin main
```

This pushes your committed changes to the `main` branch on GitHub.

---

## **Step 5: SSH into VPS**

```bash
ssh your-username@your-vps-ip
```

**Example:**
```bash
ssh root@sunstonecrm.com
```

---

## **Step 6: Navigate to App Directory (on VPS)**

```bash
cd /var/www/crm-app
```

---

## **Step 7: Pull Latest Changes (on VPS)**

```bash
git pull origin main
```

This fetches and merges the latest changes from GitHub.

---

## **Step 8: Update Backend Dependencies (if needed)**

```bash
cd /var/www/crm-app/backend
source venv/bin/activate
pip install -r requirements.txt
```

**When to run:** Only if you modified `requirements.txt`

---

## **Step 9: Update Frontend Dependencies (if needed)**

```bash
cd /var/www/crm-app/frontend
npm install
```

**When to run:** Only if you modified `package.json`

---

## **Step 10: Build Frontend**

```bash
cd /var/www/crm-app/frontend
npm run build
```

This creates the production build in `frontend/dist/`

---

## **Step 11: Run Database Migrations (if needed)**

```bash
cd /var/www/crm-app/backend
source venv/bin/activate

# If using Alembic
alembic upgrade head

# Or run SQL migration directly
sudo -u postgres psql -d sales_crm -f migrations/your_migration.sql
```

**When to run:** Only if you have database schema changes

---

## **Step 12: Restart Backend Service**

```bash
sudo systemctl restart crm-backend
```

This restarts the FastAPI backend service.

---

## **Step 13: Check Backend Status**

```bash
sudo systemctl status crm-backend
```

Should show: `active (running)` in green

---

## **Step 14: Check Backend Logs (if issues)**

```bash
sudo journalctl -u crm-backend -n 50 --no-pager
```

This shows the last 50 log entries for debugging.

---

## **Step 15: Restart Nginx (if needed)**

```bash
sudo systemctl restart nginx
```

**When to run:** Only if you modified Nginx configuration

---

## **Step 16: Verify Deployment**

Open in browser:
- **Frontend:** `https://sunstonecrm.com`
- **API Docs:** `https://sunstonecrm.com/api/docs`
- **Health Check:** `https://sunstonecrm.com/health`

---

## **Quick Deploy Script (All-in-One)**

For faster deployments, you can create a script on your VPS:

```bash
# Create deploy script on VPS
sudo nano /var/www/crm-app/quick-deploy.sh
```

**Script content:**
```bash
#!/bin/bash
set -e

echo "🚀 Starting deployment..."

cd /var/www/crm-app

echo "📥 Pulling latest changes..."
git pull origin main

echo "🔨 Building frontend..."
cd frontend
npm install
npm run build

echo "🔄 Restarting backend..."
sudo systemctl restart crm-backend

echo "✅ Deployment complete!"
echo "📊 Backend status:"
sudo systemctl status crm-backend --no-pager -l

echo ""
echo "🌐 Visit: https://sunstonecrm.com"
```

**Make it executable:**
```bash
chmod +x /var/www/crm-app/quick-deploy.sh
```

**Usage:**
```bash
ssh your-vps
cd /var/www/crm-app
./quick-deploy.sh
```

---

## **Rollback Plan (If Deployment Fails)**

### **1. Revert to Previous Commit (on VPS)**
```bash
cd /var/www/crm-app
git log --oneline -5  # Find previous commit hash
git reset --hard COMMIT_HASH
sudo systemctl restart crm-backend
```

### **2. Restore Database (if migration failed)**
```bash
# Restore from backup
sudo -u postgres psql -d sales_crm < /tmp/sales_crm_backup_TIMESTAMP.sql
sudo systemctl restart crm-backend
```

---

## **Common Issues & Solutions**

### **Issue: Git push rejected**
```bash
# Pull first, then push
git pull origin main
git push origin main
```

### **Issue: Backend won't start**
```bash
# Check logs
sudo journalctl -u crm-backend -n 100 --no-pager

# Common fix: restart service
sudo systemctl restart crm-backend
```

### **Issue: Frontend not updating**
```bash
# Clear browser cache or hard refresh (Ctrl+Shift+R)
# Rebuild frontend
cd /var/www/crm-app/frontend
npm run build
```

### **Issue: Database connection error**
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Restart if needed
sudo systemctl restart postgresql
```

---

## **Best Practices**

1. ✅ **Always commit with descriptive messages**
2. ✅ **Test locally before pushing to GitHub**
3. ✅ **Backup database before major migrations**
4. ✅ **Check backend logs after deployment**
5. ✅ **Keep `.env` files secure (never commit them)**
6. ✅ **Use feature branches for major changes**
7. ✅ **Tag releases for easy rollback**

---

## **Monitoring After Deployment**

```bash
# Watch backend logs in real-time
sudo journalctl -u crm-backend -f

# Check Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Monitor system resources
htop
```

---

**🎯 Quick Reference:**

| Action | Command |
|--------|---------|
| Commit changes | `git add . && git commit -m "message"` |
| Push to GitHub | `git push origin main` |
| Pull on VPS | `git pull origin main` |
| Restart backend | `sudo systemctl restart crm-backend` |
| Check status | `sudo systemctl status crm-backend` |
| View logs | `sudo journalctl -u crm-backend -n 50` |

---

**Status: Ready to use! 🚀**
