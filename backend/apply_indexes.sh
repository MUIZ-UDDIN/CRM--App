#!/bin/bash
# Apply database indexes for Sunstone CRM
# Usage: bash apply_indexes.sh

DB_NAME="sales_crm"

echo "🚀 Applying performance indexes to database: $DB_NAME"
echo "================================================"

sudo -u postgres psql -d $DB_NAME -f /var/www/crm-app/backend/app/db/create_indexes.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ All indexes applied successfully!"
    echo ""
    echo "📊 Listing created indexes..."
    sudo -u postgres psql -d $DB_NAME -c "SELECT tablename, indexname FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'idx_%' ORDER BY tablename;"
else
    echo ""
    echo "❌ Error applying indexes"
    exit 1
fi
