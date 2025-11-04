-- ============================================================
-- FINAL Complete Test Data Cleanup Script
-- ============================================================
-- This script removes all test companies and ALL associated data
-- Handles ALL foreign key dependencies in correct order
-- ============================================================

BEGIN;

\echo '=============================================='
\echo 'FINAL Complete Test Data Cleanup'
\echo '=============================================='
\echo ''

-- Get test company IDs
\echo 'Test companies to be removed:'
SELECT id, name FROM companies WHERE name IN (
    'Test Company Inc', 'testing', 'test', 'tech', 'tt', 'll', 'tester'
);

\echo ''
\echo 'Deleting all data for test companies...'
\echo ''

-- Step 0: Delete pipeline stages first (they reference pipelines)
\echo 'Step 0: Deleting pipeline stages...'
DELETE FROM pipeline_stages WHERE pipeline_id IN (
    SELECT id FROM pipelines WHERE company_id IN (
        SELECT id FROM companies WHERE name IN (
            'Test Company Inc', 'testing', 'test', 'tech', 'tt', 'll', 'tester'
        )
    )
);

-- Step 1: Delete pipelines
\echo 'Step 1: Deleting pipelines...'
DELETE FROM pipelines WHERE company_id IN (
    SELECT id FROM companies WHERE name IN (
        'Test Company Inc', 'testing', 'test', 'tech', 'tt', 'll', 'tester'
    )
);

-- Step 2: Delete activities
\echo 'Step 2: Deleting activities...'
DELETE FROM activities WHERE company_id IN (
    SELECT id FROM companies WHERE name IN (
        'Test Company Inc', 'testing', 'test', 'tech', 'tt', 'll', 'tester'
    )
);

-- Step 3: Delete deals
\echo 'Step 3: Deleting deals...'
DELETE FROM deals WHERE company_id IN (
    SELECT id FROM companies WHERE name IN (
        'Test Company Inc', 'testing', 'test', 'tech', 'tt', 'll', 'tester'
    )
);

-- Step 4: Delete contacts
\echo 'Step 4: Deleting contacts...'
DELETE FROM contacts WHERE company_id IN (
    SELECT id FROM companies WHERE name IN (
        'Test Company Inc', 'testing', 'test', 'tech', 'tt', 'll', 'tester'
    )
);

-- Step 5: Delete SMS messages
\echo 'Step 5: Deleting SMS messages...'
DELETE FROM sms_messages WHERE company_id IN (
    SELECT id FROM companies WHERE name IN (
        'Test Company Inc', 'testing', 'test', 'tech', 'tt', 'll', 'tester'
    )
);

-- Step 6: Delete calls
\echo 'Step 6: Deleting calls...'
DELETE FROM calls WHERE company_id IN (
    SELECT id FROM companies WHERE name IN (
        'Test Company Inc', 'testing', 'test', 'tech', 'tt', 'll', 'tester'
    )
);

-- Step 7: Delete emails
\echo 'Step 7: Deleting emails...'
DELETE FROM emails WHERE company_id IN (
    SELECT id FROM companies WHERE name IN (
        'Test Company Inc', 'testing', 'test', 'tech', 'tt', 'll', 'tester'
    )
);

-- Step 8: Delete files
\echo 'Step 8: Deleting files...'
DELETE FROM files WHERE company_id IN (
    SELECT id FROM companies WHERE name IN (
        'Test Company Inc', 'testing', 'test', 'tech', 'tt', 'll', 'tester'
    )
);

-- Step 9: Delete folders
\echo 'Step 9: Deleting folders...'
DELETE FROM folders WHERE company_id IN (
    SELECT id FROM companies WHERE name IN (
        'Test Company Inc', 'testing', 'test', 'tech', 'tt', 'll', 'tester'
    )
);

-- Step 10: Delete quotes
\echo 'Step 10: Deleting quotes...'
DELETE FROM quotes WHERE company_id IN (
    SELECT id FROM companies WHERE name IN (
        'Test Company Inc', 'testing', 'test', 'tech', 'tt', 'll', 'tester'
    )
);

-- Step 11: Delete workflows
\echo 'Step 11: Deleting workflows...'
DELETE FROM workflows WHERE company_id IN (
    SELECT id FROM companies WHERE name IN (
        'Test Company Inc', 'testing', 'test', 'tech', 'tt', 'll', 'tester'
    )
);

-- Step 12: Delete bulk email campaigns
\echo 'Step 12: Deleting bulk email campaigns...'
DELETE FROM bulk_email_campaigns WHERE company_id IN (
    SELECT id FROM companies WHERE name IN (
        'Test Company Inc', 'testing', 'test', 'tech', 'tt', 'll', 'tester'
    )
);

-- Step 13: Delete conversations
\echo 'Step 13: Deleting conversations...'
DELETE FROM user_conversations WHERE company_id IN (
    SELECT id FROM companies WHERE name IN (
        'Test Company Inc', 'testing', 'test', 'tech', 'tt', 'll', 'tester'
    )
);

-- Step 14: Delete inbox messages
\echo 'Step 14: Deleting inbox messages...'
DELETE FROM inbox WHERE company_id IN (
    SELECT id FROM companies WHERE name IN (
        'Test Company Inc', 'testing', 'test', 'tech', 'tt', 'll', 'tester'
    )
);

-- Step 15: Delete phone numbers for test companies
\echo 'Step 15: Deleting phone numbers...'
DELETE FROM phone_numbers WHERE company_id IN (
    SELECT id FROM companies WHERE name IN (
        'Test Company Inc', 'testing', 'test', 'tech', 'tt', 'll', 'tester'
    )
);

-- Step 16: Delete SMS templates for test companies
\echo 'Step 16: Deleting SMS templates...'
DELETE FROM sms_templates WHERE company_id IN (
    SELECT id FROM companies WHERE name IN (
        'Test Company Inc', 'testing', 'test', 'tech', 'tt', 'll', 'tester'
    )
);

-- Step 17: Delete test users
\echo 'Step 17: Deleting test users...'
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

-- Step 18: Finally delete test companies
\echo 'Step 18: Deleting test companies...'
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
