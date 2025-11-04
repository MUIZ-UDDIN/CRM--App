-- ============================================================
-- Simple Test Data Cleanup - Delete Users and Companies Only
-- ============================================================
-- This script deletes test users and companies
-- All their data will be cascade deleted automatically
-- ============================================================

BEGIN;

\echo '=============================================='
\echo 'Simple Test Data Cleanup'
\echo '=============================================='
\echo ''

-- Show test companies
\echo 'Test companies to be removed:'
SELECT id, name FROM companies WHERE name IN (
    'Test Company Inc', 'testing', 'test', 'tech', 'tt', 'll', 'tester'
);

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
\echo 'Step 1: Deleting pipeline stages for test companies...'
DELETE FROM pipeline_stages WHERE pipeline_id IN (
    SELECT id FROM pipelines WHERE company_id IN (
        SELECT id FROM companies WHERE name IN (
            'Test Company Inc', 'testing', 'test', 'tech', 'tt', 'll', 'tester'
        )
    )
);

\echo 'Step 2: Deleting test users (will cascade delete their data)...'
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

\echo 'Step 3: Deleting remaining data for test companies...'

-- Delete any remaining pipelines
DELETE FROM pipelines WHERE company_id IN (
    SELECT id FROM companies WHERE name IN (
        'Test Company Inc', 'testing', 'test', 'tech', 'tt', 'll', 'tester'
    )
);

-- Delete any remaining contacts
DELETE FROM contacts WHERE company_id IN (
    SELECT id FROM companies WHERE name IN (
        'Test Company Inc', 'testing', 'test', 'tech', 'tt', 'll', 'tester'
    )
);

-- Delete any remaining deals
DELETE FROM deals WHERE company_id IN (
    SELECT id FROM companies WHERE name IN (
        'Test Company Inc', 'testing', 'test', 'tech', 'tt', 'll', 'tester'
    )
);

\echo 'Step 4: Deleting test companies...'
DELETE FROM companies WHERE name IN (
    'Test Company Inc',
    'testing',
    'test',
    'tech',
    'tt',
    'll',
    'tester'
);

COMMIT;

\echo ''
\echo '=============================================='
\echo '✅ Cleanup Successfully Completed!'
\echo '=============================================='
\echo ''
\echo 'Remaining production companies:'
SELECT 
    name,
    (SELECT COUNT(*) FROM users WHERE company_id = companies.id) as users,
    (SELECT COUNT(*) FROM contacts WHERE company_id = companies.id) as contacts,
    (SELECT COUNT(*) FROM deals WHERE company_id = companies.id) as deals,
    (SELECT COUNT(*) FROM sms_messages WHERE company_id = companies.id) as sms,
    (SELECT COUNT(*) FROM calls WHERE company_id = companies.id) as calls
FROM companies
ORDER BY name;

\echo ''
\echo 'Total companies:'
SELECT COUNT(*) as total FROM companies;

\echo ''
\echo '=============================================='
