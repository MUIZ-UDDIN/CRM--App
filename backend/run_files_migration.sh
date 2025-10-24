#!/bin/bash

# Run migration to add status and tags to files and folders
# Usage: ./run_files_migration.sh

echo "Running migration: Add status and tags to files and folders..."

# Run the migration
sudo -u postgres psql -d sales_crm -f migrations/add_status_tags_to_files_folders.sql

if [ $? -eq 0 ]; then
    echo "✅ Migration completed successfully!"
    echo ""
    echo "Verifying changes..."
    sudo -u postgres psql -d sales_crm -c "\d files" | grep status
    sudo -u postgres psql -d sales_crm -c "\d folders" | grep -E "status|tags"
else
    echo "❌ Migration failed!"
    exit 1
fi
