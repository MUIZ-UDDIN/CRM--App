# 🚀 Deployment Guide - GitHub to Ubuntu VPS

## Step 1: Push to GitHub

```bash
cd "c:\Users\MUIZ UD DIN\CRM--App"

# Initialize git (if not already done)
git init
git add .
git commit -m "Production ready - Sunstone CRM"

# Add remote and push
git remote add origin https://github.com/MUIZ-UDDIN/CRM--App.git
git branch -M main
git push -u origin main
```

## Step 2: Connect to Your Ubuntu VPS

```bash
ssh root@your-vps-ip
# Or
ssh your-username@your-vps-ip
```

## Step 3: Run Deployment Script

```bash
# Download and run deployment script
curl -o deploy.sh https://raw.githubusercontent.com/MUIZ-UDDIN/CRM--App/main/deploy_vps.sh
chmod +x deploy.sh
./deploy.sh
```

## Step 4: Setup SSL (Optional but Recommended)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d sunstonecrm.com -d www.sunstonecrm.com
```

## Step 5: Configure DNS

Point your domain to your VPS IP:

**A Records:**
- `sunstonecrm.com` → Your VPS IP
- `www.sunstonecrm.com` → Your VPS IP

## Step 6: Test Deployment

1. **Check Backend:**
```bash
curl http://sunstonecrm.com/health
```

2. **Check Frontend:**
Open browser: `https://sunstonecrm.com`

3. **Check Logs:**
```bash
# Backend logs
sudo journalctl -u crm-backend -f

# Nginx logs
sudo tail -f /var/log/nginx/error.log
```

## Step 7: Create First Admin User

1. Go to: `https://sunstonecrm.com/register`
2. Register with email: `admin@sunstonecrm.com`
3. This user will automatically get Super Admin role

## Useful Commands

### Service Management
```bash
# Restart backend
sudo systemctl restart crm-backend

# Check status
sudo systemctl status crm-backend

# View logs
sudo journalctl -u crm-backend -f
```

### Update Application
```bash
cd /var/www/crm-app
git pull origin main

# Update backend
cd backend
source venv/bin/activate
pip install -r requirements.txt
sudo systemctl restart crm-backend

# Update frontend
cd ../frontend
npm install
npm run build
sudo systemctl restart nginx
```

### Database Backup
```bash
pg_dump -U crm_user sales_crm > backup_$(date +%Y%m%d).sql
```

### Database Restore
```bash
psql -U crm_user sales_crm < backup_20250119.sql
```

## Troubleshooting

### Backend not starting
```bash
# Check logs
sudo journalctl -u crm-backend -n 50

# Check if port 8000 is in use
sudo lsof -i :8000

# Restart service
sudo systemctl restart crm-backend
```

### Frontend not loading
```bash
# Check Nginx config
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Check if build exists
ls -la /var/www/crm-app/frontend/dist
```

### Database connection issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test connection
psql -U crm_user -d sales_crm -h localhost

# Check database exists
sudo -u postgres psql -l
```

## Security Checklist

- ✅ SSL certificate installed
- ✅ Firewall configured (UFW)
- ✅ PostgreSQL only accepts local connections
- ✅ Strong passwords set
- ✅ Regular backups scheduled
- ✅ Fail2ban installed (optional)

## Firewall Setup

```bash
# Enable UFW
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable

# Check status
sudo ufw status
```

## Monitoring

```bash
# Install monitoring tools
sudo apt install -y htop

# Monitor resources
htop

# Monitor disk space
df -h

# Monitor logs in real-time
sudo journalctl -u crm-backend -f
```

## Production Checklist

- [ ] Domain DNS configured
- [ ] SSL certificate installed
- [ ] Database created and configured
- [ ] Backend service running
- [ ] Frontend built and deployed
- [ ] Nginx configured
- [ ] Firewall enabled
- [ ] First admin user created
- [ ] Backup strategy in place
- [ ] Monitoring setup

## Support

For issues, check:
1. Backend logs: `sudo journalctl -u crm-backend -f`
2. Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Database logs: `sudo tail -f /var/log/postgresql/postgresql-14-main.log`

---

**Your CRM is now live at: https://sunstonecrm.com** 🎉
