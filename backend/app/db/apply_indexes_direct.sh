#!/bin/bash
# Direct PostgreSQL index application script
# Run this with: bash apply_indexes_direct.sh

# Database connection details
DB_NAME="sales_crm"
DB_USER="postgres"
DB_HOST="localhost"

echo "🚀 Applying performance indexes to database: $DB_NAME"
echo "================================================"

# Apply the SQL file directly
psql -U $DB_USER -d $DB_NAME -h $DB_HOST -f /var/www/crm-app/backend/app/db/create_indexes.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ All indexes applied successfully!"
    echo ""
    echo "📊 Checking created indexes..."
    psql -U $DB_USER -d $DB_NAME -h $DB_HOST -c "SELECT schemaname, tablename, indexname FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'idx_%' ORDER BY tablename, indexname;"
else
    echo ""
    echo "❌ Error applying indexes. Please check the error messages above."
    exit 1
fi
