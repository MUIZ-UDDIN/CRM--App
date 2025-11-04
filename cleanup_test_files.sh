#!/bin/bash

# ============================================================
# Test Files and Data Cleanup Script
# ============================================================
# This script removes all test files, test pages, and test data
# from the CRM application
# ============================================================

echo "=============================================="
echo "CRM Test Files Cleanup"
echo "=============================================="
echo ""

# Navigate to project root
cd /var/www/crm-app

echo "1. Removing test documentation files..."
rm -f MOBILE_RESPONSIVENESS_TESTING.md
echo "   ✓ Removed MOBILE_RESPONSIVENESS_TESTING.md"

echo ""
echo "2. Removing backend test files..."
cd backend

# Remove test SQL script (keep for reference, comment out if you want to keep)
# rm -f test_multi_tenancy.sql
# echo "   ✓ Removed test_multi_tenancy.sql"

# Remove test guide (keep for reference, comment out if you want to keep)
# rm -f MULTI_TENANCY_TEST_GUIDE.md
# echo "   ✓ Removed MULTI_TENANCY_TEST_GUIDE.md"

# Remove test router
rm -f app/api/test_router.py
rm -f app/api/__pycache__/test_router.cpython-310.pyc
echo "   ✓ Removed test_router.py and cache"

# Remove test CSV files
rm -f app/api/test.csv
rm -f app/api/test_comma.csv
rm -f app/api/test_proper.csv
echo "   ✓ Removed test CSV files"

echo ""
echo "3. Cleaning up test database entries..."

# Remove test companies and users from database
sudo -u postgres psql sales_crm << 'EOF'

-- Start transaction
BEGIN;

-- Show what will be deleted
\echo 'Test companies to be removed:'
SELECT id, name FROM companies WHERE name IN ('Test Company Inc', 'testing', 'test', 'tech', 'tt', 'll', 'tester');

\echo ''
\echo 'Test users to be removed:'
SELECT id, email FROM users WHERE email IN (
    'testadmin@example.com',
    'tsting@gmail.com',
    'testing@gmail.com',
    'tz@gmail.com',
    'x@gmail.com',
    'll@gmail.com',
    't@gmail.com',
    '12@gmail.com',
    'test_admin2@gmail.com',
    'test@gmail.com',
    'test_admin@gmail.com',
    'script@gmail.com',
    'script_1@gmail.com',
    'Script@gmail.com'
);

\echo ''
\echo 'Deleting test data...'

-- Delete test users (this will cascade to their data)
DELETE FROM users WHERE email IN (
    'testadmin@example.com',
    'tsting@gmail.com',
    'testing@gmail.com',
    'tz@gmail.com',
    'x@gmail.com',
    'll@gmail.com',
    't@gmail.com',
    '12@gmail.com',
    'test_admin2@gmail.com',
    'test@gmail.com',
    'test_admin@gmail.com',
    'script@gmail.com',
    'script_1@gmail.com',
    'Script@gmail.com'
);

-- Delete test companies (after users are deleted)
DELETE FROM companies WHERE name IN (
    'Test Company Inc',
    'testing',
    'test',
    'tech',
    'tt',
    'll',
    'tester'
);

-- Commit transaction
COMMIT;

\echo ''
\echo '✓ Test data cleanup complete!'

-- Show remaining companies
\echo ''
\echo 'Remaining companies:'
SELECT id, name, (SELECT COUNT(*) FROM users WHERE company_id = companies.id) as user_count
FROM companies
ORDER BY name;

EOF

echo ""
echo "=============================================="
echo "Cleanup Complete!"
echo "=============================================="
echo ""
echo "Summary:"
echo "✓ Removed test documentation files"
echo "✓ Removed test router and CSV files"
echo "✓ Removed test companies and users from database"
echo ""
echo "Remaining production companies:"
echo "- nadan (13 users)"
echo "- Sunstone (8 users)"
echo ""
echo "=============================================="
