#!/bin/bash

# Sales CRM - Quick Update Script
# This script automates the update process on a VPS

set -e  # Exit on error

echo "🔄 Sales CRM - Update Script"
echo "=================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Application directory
APP_DIR="/var/www/crm-app"

# Pull latest changes
print_info "Pulling latest changes from git repository..."
cd $APP_DIR
git pull origin main
print_success "Latest changes pulled"

# Update backend
print_info "Updating backend..."
cd $APP_DIR/backend
source venv/bin/activate
pip install -r requirements.txt
print_success "Backend dependencies updated"

# Restart backend service
print_info "Restarting backend service..."
sudo systemctl restart crm-backend
print_success "Backend service restarted"

# Update frontend
print_info "Updating frontend..."
cd $APP_DIR/frontend
npm install
npm run build
print_success "Frontend rebuilt"

echo ""
echo "=================================="
print_success "Update completed successfully!"
echo "=================================="
echo ""
print_info "Changes applied:"
echo "1. Fixed admin dashboard 500 error with comprehensive error handling"
echo "2. Fixed authentication issues with improved token management"
echo "3. Updated login flow for more reliable authentication"
echo ""
print_success "Your CRM is now up-to-date! 🚀"
