# 🚀 GitHub to VPS Deployment Workflow

**Quick Reference Guide for Sunstone CRM Deployment**

---

## **📋 Local to GitHub (Windows)**

### **1. Check Status**
```powershell
cd "c:\Users\MUIZ UD DIN\CRM--App"
git status
```

### **2. Commit & Push**
```powershell
# Stage all changes
git add .

# Commit with message
git commit -m "Your descriptive commit message"

# Push to GitHub
git push origin main
```

---

## **📥 GitHub to VPS (Hostinger)**

### **1. Connect to VPS**
```bash
ssh your-username@your-vps-ip
# Example: ssh root@sunstonecrm.com
```

### **2. Pull Latest Changes**
```bash
cd /var/www/crm-app
git pull origin main
```

### **3. Update Backend (if needed)**
```bash
cd /var/www/crm-app/backend
source venv/bin/activate
pip install -r requirements.txt  # Only if requirements changed
```

### **4. Update Frontend**
```bash
cd /var/www/crm-app/frontend
npm install  # Only if package.json changed
npm run build
```

### **5. Restart Services**
```bash
# Restart backend
sudo systemctl restart crm-backend

# Check status
sudo systemctl status crm-backend

# View logs if issues
sudo journalctl -u crm-backend -n 50 --no-pager
```

---

## **⚡ Quick Deploy Script**

Create this script on your VPS for faster deployments:

```bash
# On VPS, create the script
nano ~/quick-deploy.sh
```

**Script content:**
```bash
#!/bin/bash
set -e

echo "🚀 Deploying Sunstone CRM..."

cd /var/www/crm-app
git pull origin main

cd frontend
npm run build

sudo systemctl restart crm-backend

echo "✅ Deployment complete!"
sudo systemctl status crm-backend --no-pager
```

**Make executable:**
```bash
chmod +x ~/quick-deploy.sh
```

**Usage:**
```bash
ssh your-vps
~/quick-deploy.sh
```

---

## **🔍 Verification Checklist**

After deployment, verify:

- [ ] Frontend loads: `https://sunstonecrm.com`
- [ ] API responds: `https://sunstonecrm.com/api/docs`
- [ ] Health check: `https://sunstonecrm.com/health`
- [ ] Backend running: `sudo systemctl status crm-backend`
- [ ] No errors in logs: `sudo journalctl -u crm-backend -n 20`

---

## **🆘 Troubleshooting**

### **Backend won't start**
```bash
# Check logs
sudo journalctl -u crm-backend -n 100 --no-pager

# Restart
sudo systemctl restart crm-backend

# Check database connection
sudo systemctl status postgresql
```

### **Frontend not updating**
```bash
# Rebuild
cd /var/www/crm-app/frontend
npm run build

# Clear browser cache (Ctrl+Shift+R)
```

### **Database migration needed**
```bash
cd /var/www/crm-app/backend
source venv/bin/activate

# Run migration
alembic upgrade head

# Or run SQL directly
sudo -u postgres psql -d sales_crm -f migrations/your_migration.sql
```

---

## **📊 Current Setup**

- **Repository:** `https://github.com/MUIZ-UDDIN/CRM--App.git`
- **Branch:** `main`
- **VPS Path:** `/var/www/crm-app`
- **Backend Service:** `crm-backend`
- **Database:** `sales_crm` (PostgreSQL)
- **Web Server:** Nginx

---

## **🔐 Important Files**

**Never commit these files:**
- `backend/.env`
- `backend/.env.production`
- `frontend/.env`
- `frontend/.env.production`

They contain sensitive credentials and are already in `.gitignore`.

---

## **📝 Commit Message Examples**

Good commit messages:
- ✅ `"Add customer analytics dashboard"`
- ✅ `"Fix multi-tenancy data isolation bug"`
- ✅ `"Update mobile responsiveness for deals page"`
- ✅ `"Deploy backend performance improvements"`

Bad commit messages:
- ❌ `"update"`
- ❌ `"fix bug"`
- ❌ `"changes"`

---

## **🎯 Workflow Summary**

```
Local Changes → Git Add → Git Commit → Git Push → GitHub
                                                      ↓
                                            VPS Git Pull
                                                      ↓
                                          Build Frontend
                                                      ↓
                                         Restart Backend
                                                      ✓
                                            Live on VPS
```

---

**For detailed step-by-step instructions, see:** `.agent/workflows/deploy-to-vps.md`

**Status: Ready to deploy! 🚀**
