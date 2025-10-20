#!/bin/bash

# CRM Backend Deployment Script
echo "🚀 Deploying CRM Backend..."

# Navigate to project directory
cd /var/www/crm-app

# Pull latest changes
echo "📥 Pulling latest code..."
git pull origin main

# Navigate to backend
cd backend

# Activate virtual environment
source venv/bin/activate

# Clear Python cache
echo "🧹 Clearing Python cache..."
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find . -type f -name "*.pyc" -delete 2>/dev/null || true

# Install/update dependencies
echo "📦 Installing dependencies..."
pip install -q -r requirements.txt

# Restart the service
echo "🔄 Restarting backend service..."
sudo systemctl restart crm-backend

# Wait a moment
sleep 2

# Check status
echo "✅ Checking service status..."
sudo systemctl status crm-backend --no-pager

echo "🎉 Deployment complete!"
echo "📋 To view logs, run: sudo journalctl -u crm-backend -f --output=cat"
