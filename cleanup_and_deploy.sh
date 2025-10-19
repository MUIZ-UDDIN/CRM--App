#!/bin/bash

# Cleanup old deployment and deploy new version
# Run this on your VPS

set -e

echo "=================================="
echo "Cleaning up old deployment..."
echo "=================================="
echo ""

# Stop old services if running
echo "Stopping old services..."
sudo systemctl stop crm-backend 2>/dev/null || true
sudo systemctl disable crm-backend 2>/dev/null || true

# Remove old deployment
echo "Removing old files..."
cd /var/www
sudo rm -rf crm-app

echo "Old deployment removed!"
echo ""

# Now run the new deployment
echo "=================================="
echo "Starting fresh deployment..."
echo "=================================="
echo ""

# Download and run new deployment script
curl -o deploy.sh https://raw.githubusercontent.com/MUIZ-UDDIN/CRM--App/main/deploy_vps.sh
chmod +x deploy.sh
./deploy.sh

echo ""
echo "=================================="
echo "Deployment Complete!"
echo "=================================="
