#!/bin/bash
# Deploy all fixes and seed templates

echo "🚀 Deploying All Fixes..."
echo ""

# Step 1: Pull latest code
echo "📥 Step 1: Pulling latest code..."
cd /var/www/crm-app
git pull origin main

# Step 2: Seed workflow templates
echo ""
echo "🌱 Step 2: Seeding workflow templates..."
cd backend
./venv/bin/python seed_templates.py

# Step 3: Restart backend
echo ""
echo "🔄 Step 3: Restarting backend..."
systemctl restart crm-backend
sleep 3
systemctl status crm-backend --no-pager

# Step 4: Rebuild frontend
echo ""
echo "🎨 Step 4: Rebuilding frontend..."
cd /var/www/crm-app/frontend
npm run build

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 What's Fixed:"
echo "  ✅ Navigation: Support Tickets in profile, Automation in More dropdown"
echo "  ✅ Billing: View/Edit buttons now work, company names truncated"
echo "  ✅ Templates: 8 default workflow templates created"
echo ""
echo "🧪 Test these features:"
echo "  1. Check navigation menu structure"
echo "  2. Try creating a support ticket"
echo "  3. View workflow templates"
echo "  4. Test billing management actions"
