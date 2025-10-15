# 🚀 Sales CRM - Production Deployment Guide

## 📋 Pre-Deployment Checklist

### ✅ Code Quality
- [x] All `alert()` calls replaced with toast notifications
- [x] Mobile responsiveness implemented and tested
- [x] Drag-and-drop functionality for deals pipeline
- [x] Analytics with interactive charts (Recharts)
- [x] All modals centered and mobile-friendly
- [x] Proper error handling throughout

### ✅ Features Implemented
- [x] Dashboard with KPIs and activity feeds
- [x] Deals pipeline with drag-and-drop
- [x] Contacts management with bulk import
- [x] Analytics & reporting with charts
- [x] Activities tracking
- [x] Files management
- [x] Quotes management
- [x] User authentication & authorization
- [x] Mobile-responsive navigation

---

## 🖥️ VPS Deployment (Hostinger)

### 1. Server Requirements
- **OS**: Ubuntu 20.04 LTS or higher
- **RAM**: Minimum 2GB (4GB recommended)
- **Storage**: Minimum 20GB
- **Node.js**: v18+ 
- **Python**: 3.11+
- **PostgreSQL**: 14+
- **Redis**: 7+
- **Nginx**: Latest stable

### 2. Initial Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Python 3.11
sudo apt install -y python3.11 python3.11-venv python3-pip

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Redis
sudo apt install -y redis-server

# Install Nginx
sudo apt install -y nginx

# Install PM2 for process management
sudo npm install -g pm2

# Install certbot for SSL
sudo apt install -y certbot python3-certbot-nginx
```

### 3. Database Setup

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE sales_crm;
CREATE USER crm_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE sales_crm TO crm_user;
\q

# Configure PostgreSQL for remote connections (if needed)
sudo nano /etc/postgresql/14/main/postgresql.conf
# Set: listen_addresses = 'localhost'

sudo nano /etc/postgresql/14/main/pg_hba.conf
# Add: local   all   crm_user   md5

sudo systemctl restart postgresql
```

### 4. Redis Configuration

```bash
# Configure Redis
sudo nano /etc/redis/redis.conf
# Set: bind 127.0.0.1
# Set: maxmemory 256mb
# Set: maxmemory-policy allkeys-lru

sudo systemctl restart redis-server
sudo systemctl enable redis-server
```

### 5. Application Deployment

```bash
# Create application directory
sudo mkdir -p /var/www/sales-crm
sudo chown -R $USER:$USER /var/www/sales-crm
cd /var/www/sales-crm

# Clone or upload your code
# Option 1: Git
git clone <your-repo-url> .

# Option 2: Upload via SCP/SFTP
# scp -r /local/path/CRM/* user@your-server:/var/www/sales-crm/
```

### 6. Backend Setup

```bash
cd /var/www/sales-crm/backend

# Create virtual environment
python3.11 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cat > .env << EOF
# Application
APP_NAME=Sales CRM API
APP_VERSION=1.0.0
DEBUG=False
ENVIRONMENT=production

# Database
DATABASE_URL=postgresql+asyncpg://crm_user:your_secure_password@localhost:5432/sales_crm
DATABASE_URL_SYNC=postgresql://crm_user:your_secure_password@localhost:5432/sales_crm

# Redis
REDIS_URL=redis://localhost:6379/0

# Security
SECRET_KEY=$(openssl rand -hex 32)
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# CORS
ALLOWED_HOSTS=["yourdomain.com", "www.yourdomain.com"]
ALLOWED_ORIGINS=["https://yourdomain.com", "https://www.yourdomain.com"]

# Email (Optional - configure if needed)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_TLS=True

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_FOLDER=/var/www/sales-crm/uploads

# Logging
LOG_LEVEL=INFO
EOF

# Run database migrations (if you have alembic)
# alembic upgrade head

# Test the backend
python main.py
# Press Ctrl+C after verifying it starts

# Setup PM2 for backend
pm2 start main.py --name crm-backend --interpreter python3
pm2 save
pm2 startup
```

### 7. Frontend Build & Setup

```bash
cd /var/www/sales-crm/frontend

# Install dependencies
npm install

# Create production .env
cat > .env << EOF
VITE_API_URL=https://yourdomain.com/api
VITE_APP_NAME=Sales CRM
VITE_APP_VERSION=1.0.0
EOF

# Build for production
npm run build

# The build output will be in the 'dist' folder
```

### 8. Nginx Configuration

```bash
# Create Nginx config
sudo nano /etc/nginx/sites-available/sales-crm

# Add the following configuration:
```

```nginx
# Frontend & API Server
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Redirect to HTTPS (after SSL is configured)
    # return 301 https://$server_name$request_uri;
    
    # Frontend
    root /var/www/sales-crm/frontend/dist;
    index index.html;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;
    
    # Frontend routes
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
    
    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Backend API
    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Health check endpoint
    location /health {
        proxy_pass http://127.0.0.1:8000/health;
        access_log off;
    }
    
    # Upload size limit
    client_max_body_size 10M;
}
```

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/sales-crm /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### 9. SSL Certificate (Let's Encrypt)

```bash
# Obtain SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Certbot will automatically configure HTTPS
# Test auto-renewal
sudo certbot renew --dry-run
```

### 10. Firewall Configuration

```bash
# Configure UFW firewall
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
sudo ufw status
```

### 11. Create Uploads Directory

```bash
# Create uploads directory
sudo mkdir -p /var/www/sales-crm/uploads
sudo chown -R www-data:www-data /var/www/sales-crm/uploads
sudo chmod 755 /var/www/sales-crm/uploads
```

### 12. Setup Monitoring & Logs

```bash
# View backend logs
pm2 logs crm-backend

# View Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Setup log rotation
sudo nano /etc/logrotate.d/sales-crm
```

Add:
```
/var/www/sales-crm/backend/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
}
```

---

## 📱 Mobile Testing Checklist

### Before Deployment - Test on Real Devices

#### 1. Android Testing
- [ ] Chrome Mobile (latest)
- [ ] Samsung Internet
- [ ] Firefox Mobile
- Screen sizes: 360x640, 375x667, 414x896

#### 2. iOS Testing  
- [ ] Safari Mobile (latest)
- [ ] Chrome iOS
- Screen sizes: iPhone SE, iPhone 12, iPhone 14 Pro Max

#### 3. Tablet Testing
- [ ] iPad (Safari)
- [ ] Android Tablet (Chrome)

### Key Mobile Features to Test

#### Navigation
- [ ] Mobile menu opens/closes smoothly
- [ ] All menu items accessible
- [ ] Bottom navigation (if implemented)
- [ ] Floating action button works

#### Forms & Modals
- [ ] All modals are centered and scrollable
- [ ] Form inputs are properly sized
- [ ] Keyboard doesn't hide inputs
- [ ] Date pickers work correctly
- [ ] File upload works on mobile

#### Drag & Drop
- [ ] Deal cards can be dragged on touch devices
- [ ] Smooth animations
- [ ] Visual feedback during drag

#### Charts & Analytics
- [ ] Charts are responsive
- [ ] Touch interactions work (zoom, pan)
- [ ] Tooltips appear on tap

#### Performance
- [ ] Page load time < 3 seconds
- [ ] Smooth scrolling
- [ ] No layout shifts
- [ ] Images load properly

### Testing Tools

```bash
# Use Chrome DevTools Device Mode
# 1. Open Chrome DevTools (F12)
# 2. Click device toolbar icon (Ctrl+Shift+M)
# 3. Test different devices

# Use BrowserStack or similar for real device testing
# https://www.browserstack.com/

# Lighthouse audit for mobile
npm install -g lighthouse
lighthouse https://yourdomain.com --preset=mobile --view
```

---

## 🔧 Post-Deployment

### 1. Create Admin User

```bash
cd /var/www/sales-crm/backend
source venv/bin/activate
python -c "
from app.core.database import SessionLocal
from app.models import User
from app.core.security import get_password_hash

db = SessionLocal()
admin = User(
    email='admin@yourdomain.com',
    first_name='Admin',
    last_name='User',
    hashed_password=get_password_hash('ChangeThisPassword123!'),
    role='admin',
    is_active=True
)
db.add(admin)
db.commit()
print('Admin user created!')
"
```

### 2. Backup Strategy

```bash
# Create backup script
sudo nano /usr/local/bin/backup-crm.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/sales-crm"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
pg_dump -U crm_user sales_crm | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Backup uploads
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /var/www/sales-crm/uploads

# Keep only last 7 days
find $BACKUP_DIR -name "*.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
```

```bash
# Make executable
sudo chmod +x /usr/local/bin/backup-crm.sh

# Add to crontab (daily at 2 AM)
sudo crontab -e
# Add: 0 2 * * * /usr/local/bin/backup-crm.sh
```

### 3. Monitoring Setup

```bash
# Install monitoring tools
pm2 install pm2-logrotate

# Setup PM2 monitoring
pm2 monitor
```

### 4. Performance Optimization

```bash
# Enable Redis persistence
sudo nano /etc/redis/redis.conf
# Uncomment: save 900 1

# Optimize PostgreSQL
sudo nano /etc/postgresql/14/main/postgresql.conf
# Set appropriate values:
# shared_buffers = 256MB
# effective_cache_size = 1GB
# maintenance_work_mem = 64MB

sudo systemctl restart postgresql
```

---

## 🐛 Troubleshooting

### Backend Not Starting
```bash
# Check logs
pm2 logs crm-backend

# Check if port 8000 is in use
sudo lsof -i :8000

# Restart backend
pm2 restart crm-backend
```

### Database Connection Issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test connection
psql -U crm_user -d sales_crm -h localhost

# Check pg_hba.conf
sudo nano /etc/postgresql/14/main/pg_hba.conf
```

### Nginx Issues
```bash
# Test configuration
sudo nginx -t

# Check error logs
sudo tail -f /var/log/nginx/error.log

# Restart Nginx
sudo systemctl restart nginx
```

### SSL Certificate Issues
```bash
# Renew certificate manually
sudo certbot renew

# Check certificate status
sudo certbot certificates
```

---

## 📊 Performance Benchmarks

### Target Metrics
- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3.5s
- **Lighthouse Score**: > 90
- **Mobile Performance**: > 85

### Optimization Tips
1. Enable Nginx gzip compression ✅
2. Set proper cache headers ✅
3. Minify CSS/JS (done by Vite) ✅
4. Optimize images (use WebP)
5. Enable HTTP/2 in Nginx
6. Use CDN for static assets (optional)

---

## 🔐 Security Checklist

- [ ] Change all default passwords
- [ ] Enable firewall (UFW)
- [ ] Configure SSL/TLS
- [ ] Set secure SECRET_KEY
- [ ] Disable DEBUG mode
- [ ] Configure CORS properly
- [ ] Set up rate limiting
- [ ] Regular security updates
- [ ] Backup encryption
- [ ] Monitor logs for suspicious activity

---

## 📞 Support & Maintenance

### Regular Maintenance Tasks

**Daily**
- Check PM2 status: `pm2 status`
- Review error logs

**Weekly**
- Check disk space: `df -h`
- Review backup logs
- Update dependencies

**Monthly**
- Security updates: `sudo apt update && sudo apt upgrade`
- Database optimization
- Performance review

---

## ✅ Deployment Complete!

Your Sales CRM is now live at: **https://yourdomain.com**

**Default Login** (change immediately):
- Email: admin@yourdomain.com
- Password: ChangeThisPassword123!

**Next Steps**:
1. Change admin password
2. Test all features on mobile
3. Configure email settings
4. Add team members
5. Import initial data
6. Setup monitoring alerts

---

**Built with ❤️ for modern sales teams**
