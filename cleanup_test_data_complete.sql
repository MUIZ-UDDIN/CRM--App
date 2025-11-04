-- ============================================================
-- Complete Test Data Cleanup Script
-- ============================================================
-- This script removes all test companies and their associated data
-- Handles all foreign key dependencies properly
-- ============================================================

BEGIN;

\echo '=============================================='
\echo 'Complete Test Data Cleanup'
\echo '=============================================='
\echo ''

-- Get test company IDs
\echo 'Test companies to be removed:'
SELECT id, name FROM companies WHERE name IN (
    'Test Company Inc', 'testing', 'test', 'tech', 'tt', 'll', 'tester'
);

\echo ''
\echo 'Step 1: Deleting pipelines for test companies...'
DELETE FROM pipelines WHERE company_id IN (
    SELECT id FROM companies WHERE name IN (
        'Test Company Inc', 'testing', 'test', 'tech', 'tt', 'll', 'tester'
    )
);

\echo 'Step 2: Deleting activities for test companies...'
DELETE FROM activities WHERE company_id IN (
    SELECT id FROM companies WHERE name IN (
        'Test Company Inc', 'testing', 'test', 'tech', 'tt', 'll', 'tester'
    )
);

\echo 'Step 3: Deleting deals for test companies...'
DELETE FROM deals WHERE company_id IN (
    SELECT id FROM companies WHERE name IN (
        'Test Company Inc', 'testing', 'test', 'tech', 'tt', 'll', 'tester'
    )
);

\echo 'Step 4: Deleting contacts for test companies...'
DELETE FROM contacts WHERE company_id IN (
    SELECT id FROM companies WHERE name IN (
        'Test Company Inc', 'testing', 'test', 'tech', 'tt', 'll', 'tester'
    )
);

\echo 'Step 5: Deleting SMS messages for test companies...'
DELETE FROM sms_messages WHERE company_id IN (
    SELECT id FROM companies WHERE name IN (
        'Test Company Inc', 'testing', 'test', 'tech', 'tt', 'll', 'tester'
    )
);

\echo 'Step 6: Deleting calls for test companies...'
DELETE FROM calls WHERE company_id IN (
    SELECT id FROM companies WHERE name IN (
        'Test Company Inc', 'testing', 'test', 'tech', 'tt', 'll', 'tester'
    )
);

\echo 'Step 7: Deleting emails for test companies...'
DELETE FROM emails WHERE company_id IN (
    SELECT id FROM companies WHERE name IN (
        'Test Company Inc', 'testing', 'test', 'tech', 'tt', 'll', 'tester'
    )
);

\echo 'Step 8: Deleting files for test companies...'
DELETE FROM files WHERE company_id IN (
    SELECT id FROM companies WHERE name IN (
        'Test Company Inc', 'testing', 'test', 'tech', 'tt', 'll', 'tester'
    )
);

\echo 'Step 9: Deleting folders for test companies...'
DELETE FROM folders WHERE company_id IN (
    SELECT id FROM companies WHERE name IN (
        'Test Company Inc', 'testing', 'test', 'tech', 'tt', 'll', 'tester'
    )
);

\echo 'Step 10: Deleting quotes for test companies...'
DELETE FROM quotes WHERE company_id IN (
    SELECT id FROM companies WHERE name IN (
        'Test Company Inc', 'testing', 'test', 'tech', 'tt', 'll', 'tester'
    )
);

\echo 'Step 11: Deleting workflows for test companies...'
DELETE FROM workflows WHERE company_id IN (
    SELECT id FROM companies WHERE name IN (
        'Test Company Inc', 'testing', 'test', 'tech', 'tt', 'll', 'tester'
    )
);

\echo 'Step 12: Deleting bulk email campaigns for test companies...'
DELETE FROM bulk_email_campaigns WHERE company_id IN (
    SELECT id FROM companies WHERE name IN (
        'Test Company Inc', 'testing', 'test', 'tech', 'tt', 'll', 'tester'
    )
);

\echo 'Step 13: Deleting conversations for test companies...'
DELETE FROM user_conversations WHERE company_id IN (
    SELECT id FROM companies WHERE name IN (
        'Test Company Inc', 'testing', 'test', 'tech', 'tt', 'll', 'tester'
    )
);

\echo 'Step 14: Deleting inbox messages for test companies...'
DELETE FROM inbox WHERE company_id IN (
    SELECT id FROM companies WHERE name IN (
        'Test Company Inc', 'testing', 'test', 'tech', 'tt', 'll', 'tester'
    )
);

\echo 'Step 15: Deleting test users...'
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

\echo 'Step 16: Deleting test companies...'
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
\echo 'Cleanup Complete!'
\echo '=============================================='
\echo ''
\echo 'Remaining companies:'
SELECT 
    id,
    name,
    (SELECT COUNT(*) FROM users WHERE company_id = companies.id) as user_count,
    (SELECT COUNT(*) FROM contacts WHERE company_id = companies.id) as contact_count,
    (SELECT COUNT(*) FROM deals WHERE company_id = companies.id) as deal_count
FROM companies
ORDER BY name;

\echo ''
\echo 'Total companies remaining:'
SELECT COUNT(*) as total_companies FROM companies;
