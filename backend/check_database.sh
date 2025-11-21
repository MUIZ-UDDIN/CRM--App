#!/bin/bash
# Database Structure Verification Script
# Run this with: bash check_database.sh

DB_NAME="sales_crm"

echo "🔍 Checking Database Structure for: $DB_NAME"
echo "=============================================="
echo ""

echo "📊 1. Checking all tables..."
echo "----------------------------"
sudo -u postgres psql -d $DB_NAME -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
echo ""

echo "📋 2. Checking critical tables existence..."
echo "-------------------------------------------"
for table in users companies teams deals contacts activities pipelines pipeline_stages subscription_plans subscriptions custom_fields tags workflows
do
    result=$(sudo -u postgres psql -d $DB_NAME -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$table');")
    if [[ $result == *"t"* ]]; then
        echo "✅ $table - EXISTS"
    else
        echo "❌ $table - MISSING"
    fi
done
echo ""

echo "🔑 3. Checking existing indexes..."
echo "----------------------------------"
sudo -u postgres psql -d $DB_NAME -c "SELECT schemaname, tablename, indexname FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename, indexname LIMIT 50;"
echo ""

echo "👥 4. Checking users table structure..."
echo "---------------------------------------"
sudo -u postgres psql -d $DB_NAME -c "\d users"
echo ""

echo "💼 5. Checking deals table structure..."
echo "---------------------------------------"
sudo -u postgres psql -d $DB_NAME -c "\d deals"
echo ""

echo "📞 6. Checking contacts table structure..."
echo "------------------------------------------"
sudo -u postgres psql -d $DB_NAME -c "\d contacts"
echo ""

echo "📈 7. Checking data counts..."
echo "-----------------------------"
echo "Users:"
sudo -u postgres psql -d $DB_NAME -t -c "SELECT COUNT(*) FROM users WHERE is_deleted = false;"
echo "Companies:"
sudo -u postgres psql -d $DB_NAME -t -c "SELECT COUNT(*) FROM companies;"
echo "Teams:"
sudo -u postgres psql -d $DB_NAME -t -c "SELECT COUNT(*) FROM teams;"
echo "Deals:"
sudo -u postgres psql -d $DB_NAME -t -c "SELECT COUNT(*) FROM deals WHERE is_deleted = false;"
echo "Contacts:"
sudo -u postgres psql -d $DB_NAME -t -c "SELECT COUNT(*) FROM contacts WHERE is_deleted = false;"
echo ""

echo "🔍 8. Checking for missing columns in critical tables..."
echo "--------------------------------------------------------"

# Check users table for team_id
result=$(sudo -u postgres psql -d $DB_NAME -t -c "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'team_id');")
if [[ $result == *"t"* ]]; then
    echo "✅ users.team_id - EXISTS"
else
    echo "❌ users.team_id - MISSING"
fi

# Check users table for company_id
result=$(sudo -u postgres psql -d $DB_NAME -t -c "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'company_id');")
if [[ $result == *"t"* ]]; then
    echo "✅ users.company_id - EXISTS"
else
    echo "❌ users.company_id - MISSING"
fi

# Check deals table for owner_id
result=$(sudo -u postgres psql -d $DB_NAME -t -c "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'deals' AND column_name = 'owner_id');")
if [[ $result == *"t"* ]]; then
    echo "✅ deals.owner_id - EXISTS"
else
    echo "❌ deals.owner_id - MISSING"
fi

# Check contacts table for owner_id
result=$(sudo -u postgres psql -d $DB_NAME -t -c "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'owner_id');")
if [[ $result == *"t"* ]]; then
    echo "✅ contacts.owner_id - EXISTS"
else
    echo "❌ contacts.owner_id - MISSING"
fi

# Check deals table for company_id
result=$(sudo -u postgres psql -d $DB_NAME -t -c "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'deals' AND column_name = 'company_id');")
if [[ $result == *"t"* ]]; then
    echo "✅ deals.company_id - EXISTS"
else
    echo "❌ deals.company_id - MISSING"
fi

# Check contacts table for company_id
result=$(sudo -u postgres psql -d $DB_NAME -t -c "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'company_id');")
if [[ $result == *"t"* ]]; then
    echo "✅ contacts.company_id - EXISTS"
else
    echo "❌ contacts.company_id - MISSING"
fi

echo ""
echo "✅ Database structure check complete!"
echo ""
echo "💡 Next steps:"
echo "   - If all critical tables exist, run: bash apply_indexes.sh"
echo "   - If tables are missing, check your database migrations"
