#!/bin/bash

# Multi-Tenant Migration Runner
# This script runs the multi-tenant migration safely

set -e  # Exit on error

echo "=========================================="
echo "Multi-Tenant SaaS Migration"
echo "=========================================="
echo ""

# Check if .env file exists
if [ -f "../.env" ]; then
    echo "✓ Found .env file, loading environment variables..."
    export $(cat ../.env | grep -v '^#' | xargs)
else
    echo "⚠ Warning: .env file not found"
fi

# Get database credentials
DB_USER="${DB_USER:-crm_user}"
DB_NAME="${DB_NAME:-sales_crm}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

echo "Database Configuration:"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo ""

# Check if PostgreSQL is accessible
if ! command -v psql &> /dev/null; then
    echo "❌ Error: psql command not found"
    echo "Please install PostgreSQL client"
    exit 1
fi

# Test connection
echo "Testing database connection..."
if psql -U "$DB_USER" -d "$DB_NAME" -h "$DB_HOST" -p "$DB_PORT" -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✓ Database connection successful"
else
    echo "❌ Error: Cannot connect to database"
    echo ""
    echo "Please try one of these options:"
    echo ""
    echo "Option 1: Run as postgres superuser"
    echo "  sudo -u postgres psql -d $DB_NAME -f migrations/add_multi_tenant_support.sql"
    echo ""
    echo "Option 2: Provide credentials manually"
    echo "  psql -U your_user -d $DB_NAME -h $DB_HOST -f migrations/add_multi_tenant_support.sql"
    echo ""
    exit 1
fi

# Backup reminder
echo ""
echo "⚠ IMPORTANT: This migration will modify your database schema"
echo "   Make sure you have a backup before proceeding!"
echo ""
read -p "Do you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Migration cancelled"
    exit 0
fi

# Run migration
echo ""
echo "Running migration..."
echo "=========================================="

if psql -U "$DB_USER" -d "$DB_NAME" -h "$DB_HOST" -p "$DB_PORT" -f add_multi_tenant_support.sql; then
    echo ""
    echo "=========================================="
    echo "✓ Migration completed successfully!"
    echo "=========================================="
    echo ""
    echo "Next steps:"
    echo "1. Create a super admin user"
    echo "2. Register company API router in main.py"
    echo "3. Update existing endpoints with tenant context"
    echo ""
else
    echo ""
    echo "=========================================="
    echo "❌ Migration failed!"
    echo "=========================================="
    echo ""
    echo "Please check the error messages above"
    exit 1
fi
