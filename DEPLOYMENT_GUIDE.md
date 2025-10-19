# 🚀 Sunstone CRM - Production Deployment Guide

## 📋 Prerequisites

- PostgreSQL database server
- Node.js 18+ and Python 3.10+
- Domain name with SSL certificate
- Server with at least 2GB RAM

---

## 🗄️ Database Setup

### 1. Install PostgreSQL
```bash
# On Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 2. Create Database and User
```bash
sudo -u postgres psql

# In PostgreSQL prompt:
CREATE USER crm_user WITH PASSWORD 'your_secure_password';
CREATE DATABASE sales_crm OWNER crm_user;
GRANT ALL PRIVILEGES ON DATABASE sales_crm TO crm_user;
\c sales_crm
GRANT ALL ON SCHEMA public TO crm_user;
\q
```

---

## 🔧 Backend Setup

### 1. Navigate to backend folder
```bash
cd backend
```

### 2. Install dependencies
```bash
pip install -r requirements.txt
```

### 3. Configure environment
```bash
# Copy production environment file
cp .env.production .env

# Edit .env with your production values
nano .env
```

**Update these values:**
- `DATABASE_URL` - Your PostgreSQL connection string
- `SECRET_KEY` - Generate a secure random key
- `ALLOWED_ORIGINS` - Your frontend domain
- `SMTP_*` - Email configuration (if using)
- `TWILIO_*` - Twilio configuration (if using)

### 4. Run database migrations
```bash
# The tables will be created automatically on first run
python main.py
```

### 5. Create systemd service (for production)
```bash
sudo nano /etc/systemd/system/sunstone-crm.service
```

Add:
```ini
[Unit]
Description=Sunstone CRM Backend
After=network.target postgresql.service

[Service]
Type=simple
User=your_user
WorkingDirectory=/path/to/CRM--App/backend
Environment="PATH=/path/to/CRM--App/backend/venv/bin"
ExecStart=/path/to/CRM--App/backend/venv/bin/python main.py
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl start sunstone-crm
sudo systemctl enable sunstone-crm
```

---

## 🎨 Frontend Setup

### 1. Navigate to frontend folder
```bash
cd frontend
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment
```bash
# Edit .env.production with your domain
nano .env.production
```

**Update:**
- `VITE_API_URL` - Your backend API URL (e.g., https://api.your-domain.com)

### 4. Build for production
```bash
npm run build
```

### 5. Deploy to web server

**Option A: Using Nginx**
```bash
# Copy build files
sudo cp -r dist/* /var/www/sunstone-crm/

# Configure Nginx
sudo nano /etc/nginx/sites-available/sunstone-crm
```

Add:
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    root /var/www/sunstone-crm;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/sunstone-crm /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

**Option B: Using Vercel/Netlify**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

---

## 🔒 SSL Certificate (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

---

## 📝 Post-Deployment Checklist

- [ ] Database is running and accessible
- [ ] Backend API is running (check: https://your-domain.com/api/health)
- [ ] Frontend is accessible
- [ ] SSL certificate is installed
- [ ] Environment variables are set correctly
- [ ] First admin user is created (admin@sunstonecrm.com)
- [ ] CORS is configured correctly
- [ ] Firewall rules are set
- [ ] Backups are configured

---

## 🔐 Security Recommendations

1. **Change default credentials immediately**
2. **Use strong SECRET_KEY** (generate with: `openssl rand -hex 32`)
3. **Enable firewall** (only allow ports 80, 443, 22)
4. **Regular backups** of PostgreSQL database
5. **Keep dependencies updated**
6. **Monitor logs** for suspicious activity
7. **Use environment variables** for sensitive data

---

## 🔄 Updating the Application

### Backend Update:
```bash
cd backend
git pull
pip install -r requirements.txt
sudo systemctl restart sunstone-crm
```

### Frontend Update:
```bash
cd frontend
git pull
npm install
npm run build
sudo cp -r dist/* /var/www/sunstone-crm/
```

---

## 📊 Monitoring

### Check Backend Status:
```bash
sudo systemctl status sunstone-crm
sudo journalctl -u sunstone-crm -f
```

### Check Database:
```bash
sudo -u postgres psql sales_crm
SELECT COUNT(*) FROM users;
```

---

## 🆘 Troubleshooting

### Backend not starting:
- Check logs: `sudo journalctl -u sunstone-crm -n 50`
- Verify database connection
- Check environment variables

### Frontend not loading:
- Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
- Verify API URL in `.env.production`
- Check CORS settings in backend

### Database connection failed:
- Verify PostgreSQL is running: `sudo systemctl status postgresql`
- Check database credentials in `.env`
- Verify firewall allows database port

---

## 📞 Support

For issues or questions, check the application logs and database status first.

---

**Last Updated:** October 19, 2025
