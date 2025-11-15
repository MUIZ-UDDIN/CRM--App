#!/bin/bash
# Complete Deployment Script for CRM - 100% Version

echo "🚀 Starting CRM Deployment..."

# Step 1: Pull latest code
echo ""
echo "📥 Step 1: Pulling latest code..."
cd /var/www/crm-app
git pull origin main

# Step 2: Run migrations
echo ""
echo "🗄️  Step 2: Running database migrations..."
cd backend
./venv/bin/python run_migrations.py

# Step 3: Restart backend
echo ""
echo "🔄 Step 3: Restarting backend..."
systemctl restart crm-backend
sleep 3
systemctl status crm-backend --no-pager -l

# Step 4: Build frontend
echo ""
echo "🎨 Step 4: Building frontend..."
cd /var/www/crm-app/frontend
npm run build

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🎉 Your CRM is now 100% deployed!"
echo ""
echo "Test the new features:"
echo "  - Support Tickets: https://sunstonecrm.com/support-tickets"
echo "  - Custom Fields: https://sunstonecrm.com/custom-fields"
echo "  - Workflow Templates: https://sunstonecrm.com/workflow-templates"
echo "  - Billing Management: https://sunstonecrm.com/billing-management"
