-- ============================================================
-- COMPREHENSIVE MULTI-TENANCY DATABASE TEST SCRIPT
-- ============================================================
-- Run this script to verify complete data isolation between companies
-- Usage: sudo -u postgres psql sales_crm < test_multi_tenancy.sql
-- ============================================================

\echo '============================================================'
\echo 'MULTI-TENANCY DATABASE VERIFICATION TEST'
\echo '============================================================'
\echo ''

-- ============================================================
-- STEP 1: Check Company Setup
-- ============================================================
\echo '1. COMPANY SETUP'
\echo '----------------------------------------'
SELECT 
    id,
    name,
    created_at,
    (SELECT COUNT(*) FROM users WHERE company_id = companies.id) as user_count
FROM companies
ORDER BY created_at;
\echo ''

-- ============================================================
-- STEP 2: Check User Distribution
-- ============================================================
\echo '2. USER DISTRIBUTION BY COMPANY'
\echo '----------------------------------------'
SELECT 
    c.name as company_name,
    c.id as company_id,
    COUNT(u.id) as user_count,
    STRING_AGG(u.email, ', ') as users
FROM companies c
LEFT JOIN users u ON u.company_id = c.id
GROUP BY c.id, c.name
ORDER BY c.name;
\echo ''

-- ============================================================
-- STEP 3: Check Data Distribution
-- ============================================================
\echo '3. DATA DISTRIBUTION BY COMPANY'
\echo '----------------------------------------'

-- SMS Messages
\echo 'SMS Messages:'
SELECT 
    COALESCE(c.name, 'NO COMPANY') as company_name,
    COUNT(s.id) as sms_count
FROM sms_messages s
LEFT JOIN companies c ON s.company_id = c.id
GROUP BY c.name
ORDER BY c.name;
\echo ''

-- Calls
\echo 'Calls:'
SELECT 
    COALESCE(c.name, 'NO COMPANY') as company_name,
    COUNT(ca.id) as call_count
FROM calls ca
LEFT JOIN companies c ON ca.company_id = c.id
GROUP BY c.name
ORDER BY c.name;
\echo ''

-- Contacts
\echo 'Contacts:'
SELECT 
    COALESCE(c.name, 'NO COMPANY') as company_name,
    COUNT(co.id) as contact_count
FROM contacts co
LEFT JOIN companies c ON co.company_id = c.id
GROUP BY c.name
ORDER BY c.name;
\echo ''

-- Deals
\echo 'Deals:'
SELECT 
    COALESCE(c.name, 'NO COMPANY') as company_name,
    COUNT(d.id) as deal_count
FROM deals d
LEFT JOIN companies c ON d.company_id = c.id
GROUP BY c.name
ORDER BY c.name;
\echo ''

-- Emails
\echo 'Emails:'
SELECT 
    COALESCE(c.name, 'NO COMPANY') as company_name,
    COUNT(e.id) as email_count
FROM emails e
LEFT JOIN companies c ON e.company_id = c.id
GROUP BY c.name
ORDER BY c.name;
\echo ''

-- ============================================================
-- STEP 4: Check for NULL company_id (Data Leaks)
-- ============================================================
\echo '4. NULL COMPANY_ID CHECK (Potential Data Leaks)'
\echo '----------------------------------------'

\echo 'Tables with NULL company_id:'
SELECT 'sms_messages' as table_name, COUNT(*) as null_count FROM sms_messages WHERE company_id IS NULL
UNION ALL
SELECT 'calls', COUNT(*) FROM calls WHERE company_id IS NULL
UNION ALL
SELECT 'emails', COUNT(*) FROM emails WHERE company_id IS NULL
UNION ALL
SELECT 'contacts', COUNT(*) FROM contacts WHERE company_id IS NULL
UNION ALL
SELECT 'deals', COUNT(*) FROM deals WHERE company_id IS NULL
UNION ALL
SELECT 'activities', COUNT(*) FROM activities WHERE company_id IS NULL
UNION ALL
SELECT 'files', COUNT(*) FROM files WHERE company_id IS NULL
UNION ALL
SELECT 'quotes', COUNT(*) FROM quotes WHERE company_id IS NULL
UNION ALL
SELECT 'workflows', COUNT(*) FROM workflows WHERE company_id IS NULL
UNION ALL
SELECT 'pipelines', COUNT(*) FROM pipelines WHERE company_id IS NULL;
\echo ''

-- ============================================================
-- STEP 5: Cross-Company Data Leak Test
-- ============================================================
\echo '5. CROSS-COMPANY DATA LEAK TEST'
\echo '----------------------------------------'
\echo 'Checking if users can access data from other companies...'

-- Check if any user's data has a different company_id than the user
\echo 'SMS Messages with mismatched company_id:'
SELECT 
    u.email as user_email,
    u.company_id as user_company,
    s.company_id as sms_company,
    COUNT(*) as mismatch_count
FROM sms_messages s
JOIN users u ON s.user_id = u.id
WHERE s.company_id != u.company_id
GROUP BY u.email, u.company_id, s.company_id;
\echo ''

\echo 'Calls with mismatched company_id:'
SELECT 
    u.email as user_email,
    u.company_id as user_company,
    c.company_id as call_company,
    COUNT(*) as mismatch_count
FROM calls c
JOIN users u ON c.user_id = u.id
WHERE c.company_id != u.company_id
GROUP BY u.email, u.company_id, c.company_id;
\echo ''

-- ============================================================
-- STEP 6: Test Specific User Access
-- ============================================================
\echo '6. SPECIFIC USER DATA ACCESS TEST'
\echo '----------------------------------------'
\echo 'Testing admin@sunstonecrm.com access:'

-- Get admin's company
\set admin_company_id (SELECT company_id FROM users WHERE email = 'admin@sunstonecrm.com')

SELECT 
    'SMS Messages' as data_type,
    COUNT(*) as accessible_count
FROM sms_messages 
WHERE company_id = (SELECT company_id FROM users WHERE email = 'admin@sunstonecrm.com')
UNION ALL
SELECT 
    'Calls',
    COUNT(*)
FROM calls 
WHERE company_id = (SELECT company_id FROM users WHERE email = 'admin@sunstonecrm.com')
UNION ALL
SELECT 
    'Contacts',
    COUNT(*)
FROM contacts 
WHERE company_id = (SELECT company_id FROM users WHERE email = 'admin@sunstonecrm.com')
UNION ALL
SELECT 
    'Deals',
    COUNT(*)
FROM deals 
WHERE company_id = (SELECT company_id FROM users WHERE email = 'admin@sunstonecrm.com');
\echo ''

-- ============================================================
-- STEP 7: Summary Report
-- ============================================================
\echo '============================================================'
\echo 'MULTI-TENANCY TEST SUMMARY'
\echo '============================================================'

-- Count total companies
\echo 'Total Companies:'
SELECT COUNT(*) as total_companies FROM companies;
\echo ''

-- Count users without company
\echo 'Users WITHOUT company_id (CRITICAL):'
SELECT COUNT(*) as orphan_users FROM users WHERE company_id IS NULL;
\echo ''

-- Count records without company
\echo 'Records WITHOUT company_id (WARNING):'
SELECT 
    (SELECT COUNT(*) FROM sms_messages WHERE company_id IS NULL) +
    (SELECT COUNT(*) FROM calls WHERE company_id IS NULL) +
    (SELECT COUNT(*) FROM emails WHERE company_id IS NULL) +
    (SELECT COUNT(*) FROM contacts WHERE company_id IS NULL) +
    (SELECT COUNT(*) FROM deals WHERE company_id IS NULL) as total_orphan_records;
\echo ''

\echo '============================================================'
\echo 'TEST COMPLETE!'
\echo '============================================================'
\echo 'Review the results above:'
\echo '- All users should have a company_id'
\echo '- All data should have a company_id'
\echo '- No cross-company data leaks should exist'
\echo '- Each company should only see their own data'
\echo '============================================================'
