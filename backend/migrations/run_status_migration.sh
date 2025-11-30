#!/bin/bash

# Script to migrate contact status from ENUM to String

echo "=========================================="
echo "Contact Status Migration Script"
echo "=========================================="
echo ""

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "Error: DATABASE_URL not set"
    echo "Please set DATABASE_URL in .env file"
    exit 1
fi

echo "Database URL: ${DATABASE_URL}"
echo ""

# Backup reminder
echo "⚠️  IMPORTANT: Make sure you have a database backup before proceeding!"
echo ""
read -p "Have you created a backup? (yes/no): " backup_confirm

if [ "$backup_confirm" != "yes" ]; then
    echo "Please create a backup first, then run this script again."
    exit 1
fi

echo ""
echo "Running migration..."
echo ""

# Run the migration
psql "$DATABASE_URL" -f migrations/change_contact_status_to_string.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration completed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Restart the backend server: sudo systemctl restart crm-backend"
    echo "2. Test creating and editing contacts"
else
    echo ""
    echo "❌ Migration failed!"
    echo "Please check the error messages above and fix any issues."
    exit 1
fi
