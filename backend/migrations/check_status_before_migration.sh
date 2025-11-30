#!/bin/bash

# Script to check contact status column BEFORE migration

echo "=========================================="
echo "Contact Status Pre-Migration Check"
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

echo "Checking current database schema..."
echo ""

# Run the check query
psql "$DATABASE_URL" -f migrations/check_contact_status.sql

echo ""
echo "=========================================="
echo "Review the output above before proceeding with migration"
echo "=========================================="
