#!/bin/bash

# Sales CRM - Quick Deployment Script
# This script automates the deployment process on a VPS

set -e  # Exit on error

echo "🚀 Sales CRM - Deployment Script"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
    print_error "Please do not run as root"
    exit 1
fi

# Get domain name
read -p "Enter your domain name (e.g., example.com): " DOMAIN
read -p "Enter your email for SSL certificate: " EMAIL

print_info "Domain: $DOMAIN"
print_info "Email: $EMAIL"
echo ""

# Confirm
read -p "Continue with deployment? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

# Update system
print_info "Updating system packages..."
sudo apt update && sudo apt upgrade -y
print_success "System updated"

# Install Node.js
print_info "Installing Node.js 18..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install -y nodejs
    print_success "Node.js installed"
else
    print_success "Node.js already installed"
fi

# Install Python 3.11
print_info "Installing Python 3.11..."
if ! command -v python3.11 &> /dev/null; then
    sudo apt install -y python3.11 python3.11-venv python3-pip
    print_success "Python 3.11 installed"
else
    print_success "Python 3.11 already installed"
fi

# Install PostgreSQL
print_info "Installing PostgreSQL..."
if ! command -v psql &> /dev/null; then
    sudo apt install -y postgresql postgresql-contrib
    print_success "PostgreSQL installed"
else
    print_success "PostgreSQL already installed"
fi

# Install Redis
print_info "Installing Redis..."
if ! command -v redis-cli &> /dev/null; then
    sudo apt install -y redis-server
    sudo systemctl enable redis-server
    print_success "Redis installed"
else
    print_success "Redis already installed"
fi

# Install Nginx
print_info "Installing Nginx..."
if ! command -v nginx &> /dev/null; then
    sudo apt install -y nginx
    sudo systemctl enable nginx
    print_success "Nginx installed"
else
    print_success "Nginx already installed"
fi

# Install PM2
print_info "Installing PM2..."
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
    print_success "PM2 installed"
else
    print_success "PM2 already installed"
fi

# Install Certbot
print_info "Installing Certbot..."
if ! command -v certbot &> /dev/null; then
    sudo apt install -y certbot python3-certbot-nginx
    print_success "Certbot installed"
else
    print_success "Certbot already installed"
fi

# Setup PostgreSQL database
print_info "Setting up PostgreSQL database..."
DB_PASSWORD=$(openssl rand -base64 32)
sudo -u postgres psql -c "CREATE DATABASE sales_crm;" 2>/dev/null || print_info "Database already exists"
sudo -u postgres psql -c "CREATE USER crm_user WITH ENCRYPTED PASSWORD '$DB_PASSWORD';" 2>/dev/null || print_info "User already exists"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE sales_crm TO crm_user;" 2>/dev/null
print_success "Database configured"

# Create application directory
print_info "Creating application directory..."
sudo mkdir -p /var/www/sales-crm
sudo chown -R $USER:$USER /var/www/sales-crm
print_success "Directory created"

# Copy files
print_info "Copying application files..."
cp -r . /var/www/sales-crm/
cd /var/www/sales-crm
print_success "Files copied"

# Setup backend
print_info "Setting up backend..."
cd /var/www/sales-crm/backend

# Create virtual environment
python3.11 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
SECRET_KEY=$(openssl rand -hex 32)
cat > .env << EOF
APP_NAME=Sales CRM API
APP_VERSION=1.0.0
DEBUG=False
ENVIRONMENT=production

DATABASE_URL=postgresql+asyncpg://crm_user:${DB_PASSWORD}@localhost:5432/sales_crm
DATABASE_URL_SYNC=postgresql://crm_user:${DB_PASSWORD}@localhost:5432/sales_crm

REDIS_URL=redis://localhost:6379/0

SECRET_KEY=${SECRET_KEY}
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

ALLOWED_HOSTS=["${DOMAIN}", "www.${DOMAIN}"]
ALLOWED_ORIGINS=["https://${DOMAIN}", "https://www.${DOMAIN}"]

LOG_LEVEL=INFO
EOF

print_success "Backend configured"

# Start backend with PM2
pm2 delete crm-backend 2>/dev/null || true
pm2 start main.py --name crm-backend --interpreter python3
pm2 save
pm2 startup | tail -n 1 | sudo bash
print_success "Backend started"

# Setup frontend
print_info "Setting up frontend..."
cd /var/www/sales-crm/frontend

# Install dependencies
npm install

# Create .env
cat > .env << EOF
VITE_API_URL=https://${DOMAIN}/api
VITE_APP_NAME=Sales CRM
VITE_APP_VERSION=1.0.0
EOF

# Build
npm run build
print_success "Frontend built"

# Create uploads directory
sudo mkdir -p /var/www/sales-crm/uploads
sudo chown -R www-data:www-data /var/www/sales-crm/uploads
sudo chmod 755 /var/www/sales-crm/uploads
print_success "Uploads directory created"

# Configure Nginx
print_info "Configuring Nginx..."
sudo tee /etc/nginx/sites-available/sales-crm > /dev/null << EOF
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};
    
    root /var/www/sales-crm/frontend/dist;
    index index.html;
    
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;
    
    location / {
        try_files \$uri \$uri/ /index.html;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
    
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    location /health {
        proxy_pass http://127.0.0.1:8000/health;
        access_log off;
    }
    
    client_max_body_size 10M;
}
EOF

sudo ln -sf /etc/nginx/sites-available/sales-crm /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
print_success "Nginx configured"

# Setup SSL
print_info "Setting up SSL certificate..."
sudo certbot --nginx -d ${DOMAIN} -d www.${DOMAIN} --non-interactive --agree-tos --email ${EMAIL} --redirect
print_success "SSL configured"

# Configure firewall
print_info "Configuring firewall..."
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
print_success "Firewall configured"

# Create backup script
print_info "Creating backup script..."
sudo tee /usr/local/bin/backup-crm.sh > /dev/null << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/sales-crm"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
pg_dump -U crm_user sales_crm | gzip > $BACKUP_DIR/db_$DATE.sql.gz
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /var/www/sales-crm/uploads
find $BACKUP_DIR -name "*.gz" -mtime +7 -delete
echo "Backup completed: $DATE"
EOF

sudo chmod +x /usr/local/bin/backup-crm.sh
(sudo crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup-crm.sh") | sudo crontab -
print_success "Backup script created"

echo ""
echo "=================================="
print_success "Deployment completed successfully!"
echo "=================================="
echo ""
echo "📝 Important Information:"
echo "------------------------"
echo "🌐 Website: https://${DOMAIN}"
echo "📚 API Docs: https://${DOMAIN}/api/docs"
echo "🔐 Database Password: ${DB_PASSWORD}"
echo "🔑 Secret Key: ${SECRET_KEY}"
echo ""
echo "⚠️  IMPORTANT: Save these credentials securely!"
echo ""
echo "📋 Next Steps:"
echo "1. Create admin user (see DEPLOYMENT.md)"
echo "2. Test the application on mobile devices"
echo "3. Configure email settings (optional)"
echo "4. Setup monitoring (optional)"
echo ""
echo "📖 Full documentation: /var/www/sales-crm/DEPLOYMENT.md"
echo ""
print_success "Happy selling! 🚀"
