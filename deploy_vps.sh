#!/bin/bash

# Sunstone CRM - Ubuntu VPS Deployment Script
# Run this script on your Ubuntu VPS

set -e

echo "=================================="
echo "Sunstone CRM - VPS Deployment"
echo "=================================="
echo ""

# Update system
echo "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Python 3.11
echo "Installing Python 3.11..."
sudo apt install -y python3.11 python3.11-venv python3-pip

# Install PostgreSQL
echo "Installing PostgreSQL..."
sudo apt install -y postgresql postgresql-contrib

# Install Node.js 18
echo "Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Nginx
echo "Installing Nginx..."
sudo apt install -y nginx

# Install Redis
echo "Installing Redis..."
sudo apt install -y redis-server

# Setup PostgreSQL
echo "Setting up PostgreSQL database..."
sudo -u postgres psql <<EOF
CREATE USER crm_user WITH PASSWORD 'Marc@2025crmServer#';
CREATE DATABASE sales_crm OWNER crm_user;
GRANT ALL PRIVILEGES ON DATABASE sales_crm TO crm_user;
\c sales_crm
GRANT ALL ON SCHEMA public TO crm_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO crm_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO crm_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO crm_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO crm_user;
EOF

# Clone repository (if not already cloned)
if [ ! -d "/var/www/crm-app" ]; then
    echo "Cloning repository..."
    sudo mkdir -p /var/www
    cd /var/www
    sudo git clone https://github.com/MUIZ-UDDIN/CRM--App.git crm-app
    sudo chown -R $USER:$USER /var/www/crm-app
fi

cd /var/www/crm-app

# Setup Backend
echo "Setting up backend..."
cd backend
python3.11 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Create production .env
cat > .env <<EOF
ENVIRONMENT=production
DATABASE_URL=postgresql+asyncpg://crm_user:Marc%402025crmServer%23@localhost:5432/sales_crm
DATABASE_URL_SYNC=postgresql://crm_user:Marc%402025crmServer%23@localhost:5432/sales_crm
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=$(openssl rand -hex 32)
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
ALLOWED_HOSTS=["sunstonecrm.com", "www.sunstonecrm.com"]
ALLOWED_ORIGINS=["https://sunstonecrm.com", "https://www.sunstonecrm.com"]
LOG_LEVEL=INFO
EOF

# Setup Frontend
echo "Setting up frontend..."
cd ../frontend
npm install
npm run build

# Create systemd service for backend
echo "Creating systemd service..."
sudo tee /etc/systemd/system/crm-backend.service > /dev/null <<EOF
[Unit]
Description=Sunstone CRM Backend
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=$USER
WorkingDirectory=/var/www/crm-app/backend
Environment="PATH=/var/www/crm-app/backend/venv/bin"
ExecStart=/var/www/crm-app/backend/venv/bin/python -m app.main
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Configure Nginx
echo "Configuring Nginx..."
sudo tee /etc/nginx/sites-available/crm-app > /dev/null <<'EOF'
server {
    listen 80;
    server_name sunstonecrm.com www.sunstonecrm.com;

    # Frontend
    location / {
        root /var/www/crm-app/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:8000;
    }

    # API docs
    location /docs {
        proxy_pass http://localhost:8000;
    }

    location /redoc {
        proxy_pass http://localhost:8000;
    }
}
EOF

# Enable Nginx site
sudo ln -sf /etc/nginx/sites-available/crm-app /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

# Start services
echo "Starting services..."
sudo systemctl daemon-reload
sudo systemctl enable crm-backend
sudo systemctl start crm-backend
sudo systemctl enable nginx
sudo systemctl enable postgresql
sudo systemctl enable redis-server

# Setup SSL with Let's Encrypt (optional)
echo ""
echo "To setup SSL certificate, run:"
echo "sudo apt install -y certbot python3-certbot-nginx"
echo "sudo certbot --nginx -d sunstonecrm.com -d www.sunstonecrm.com"

echo ""
echo "=================================="
echo "Deployment Complete!"
echo "=================================="
echo ""
echo "Services Status:"
sudo systemctl status crm-backend --no-pager
echo ""
echo "Access your application at:"
echo "  - http://sunstonecrm.com"
echo "  - API: http://sunstonecrm.com/api"
echo "  - Docs: http://sunstonecrm.com/docs"
echo ""
echo "To view logs:"
echo "  - Backend: sudo journalctl -u crm-backend -f"
echo "  - Nginx: sudo tail -f /var/log/nginx/error.log"
echo ""
