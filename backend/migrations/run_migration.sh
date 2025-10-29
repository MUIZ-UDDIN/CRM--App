#!/bin/bash

# Migration script to add SendGrid columns to twilio_settings table
# Run this on the production server

echo "🔄 Running migration: Add SendGrid columns to twilio_settings"

# Get database connection details from environment or use defaults
DB_NAME="${DB_NAME:-crm}"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

# Run the migration
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f add_sendgrid_columns.sql

if [ $? -eq 0 ]; then
    echo "✅ Migration completed successfully!"
    echo "📝 Columns added:"
    echo "   - sendgrid_api_key (VARCHAR 255)"
    echo "   - sendgrid_from_email (VARCHAR 255)"
    echo "   - email_enabled (BOOLEAN, default FALSE)"
else
    echo "❌ Migration failed! Check the error above."
    exit 1
fi

echo ""
echo "🔄 Restarting backend service..."
sudo systemctl restart crm-backend

echo "✅ Done! Backend restarted."
