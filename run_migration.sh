#!/bin/bash
# Migration script to add QUEUED status and fix old calls

echo "🔍 Finding database credentials from .env file..."

# Navigate to backend directory
cd /var/www/crm-app/backend

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "Please create .env file with DATABASE_URL"
    exit 1
fi

# Extract database credentials from .env
DB_URL=$(grep DATABASE_URL_SYNC .env | cut -d '=' -f2- | tr -d '"' | tr -d "'")

if [ -z "$DB_URL" ]; then
    DB_URL=$(grep DATABASE_URL .env | head -1 | cut -d '=' -f2- | tr -d '"' | tr -d "'" | sed 's/+asyncpg//')
fi

echo "Database URL: $DB_URL"

# Parse the URL to get components
# Format: postgresql://user:password@host:port/database
DB_USER=$(echo $DB_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo $DB_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo $DB_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DB_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DB_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

echo "📊 Database Details:"
echo "  User: $DB_USER"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  Database: $DB_NAME"
echo ""

# Run the migration
echo "🚀 Running migration..."
PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f /var/www/crm-app/add_queued_status.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration completed successfully!"
    echo ""
    echo "🔍 Verifying enum values..."
    PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'callstatus') ORDER BY enumsortorder;"
    echo ""
    echo "📊 Checking updated calls..."
    PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT status, COUNT(*) FROM calls GROUP BY status ORDER BY status;"
else
    echo ""
    echo "❌ Migration failed!"
    exit 1
fi
