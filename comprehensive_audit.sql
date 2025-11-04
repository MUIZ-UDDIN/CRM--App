-- ============================================================
-- COMPREHENSIVE MULTI-TENANCY AUDIT
-- ============================================================
-- This script performs a complete audit of the entire database
-- to ensure 100% multi-tenancy compliance
-- ============================================================

\echo '============================================================'
\echo 'COMPREHENSIVE MULTI-TENANCY AUDIT'
\echo '============================================================'
\echo ''

-- ============================================================
-- PART 1: DATABASE SCHEMA AUDIT
-- ============================================================
\echo '============================================================'
\echo 'PART 1: DATABASE SCHEMA AUDIT'
\echo '============================================================'
\echo ''

-- List all tables
\echo '1.1 All Tables in Database:'
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
  AND table_name NOT LIKE 'alembic%'
ORDER BY table_name;

\echo ''
\echo '1.2 Tables WITH company_id column:'
SELECT DISTINCT table_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'company_id'
  AND table_name NOT LIKE 'alembic%'
ORDER BY table_name;

\echo ''
\echo '1.3 Tables WITHOUT company_id column:'
SELECT DISTINCT t.table_name
FROM information_schema.tables t
WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
  AND t.table_name NOT LIKE 'alembic%'
  AND t.table_name NOT IN (
    SELECT DISTINCT table_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name = 'company_id'
  )
ORDER BY t.table_name;

-- ============================================================
-- PART 2: DATA INTEGRITY AUDIT
-- ============================================================
\echo ''
\echo '============================================================'
\echo 'PART 2: DATA INTEGRITY AUDIT'
\echo '============================================================'
\echo ''

\echo '2.1 Users without company_id:'
SELECT COUNT(*) as count FROM users WHERE company_id IS NULL;

\echo ''
\echo '2.2 Data Records without company_id:'
SELECT 
    'sms_messages' as table_name,
    COUNT(*) as total,
    COUNT(company_id) as with_company,
    COUNT(*) - COUNT(company_id) as missing_company
FROM sms_messages
UNION ALL
SELECT 'calls', COUNT(*), COUNT(company_id), COUNT(*) - COUNT(company_id) FROM calls
UNION ALL
SELECT 'emails', COUNT(*), COUNT(company_id), COUNT(*) - COUNT(company_id) FROM emails
UNION ALL
SELECT 'contacts', COUNT(*), COUNT(company_id), COUNT(*) - COUNT(company_id) FROM contacts
UNION ALL
SELECT 'deals', COUNT(*), COUNT(company_id), COUNT(*) - COUNT(company_id) FROM deals
UNION ALL
SELECT 'activities', COUNT(*), COUNT(company_id), COUNT(*) - COUNT(company_id) FROM activities
UNION ALL
SELECT 'files', COUNT(*), COUNT(company_id), COUNT(*) - COUNT(company_id) FROM files
UNION ALL
SELECT 'quotes', COUNT(*), COUNT(company_id), COUNT(*) - COUNT(company_id) FROM quotes
UNION ALL
SELECT 'workflows', COUNT(*), COUNT(company_id), COUNT(*) - COUNT(company_id) FROM workflows
UNION ALL
SELECT 'pipelines', COUNT(*), COUNT(company_id), COUNT(*) - COUNT(company_id) FROM pipelines
UNION ALL
SELECT 'pipeline_stages', COUNT(*), COUNT(company_id), COUNT(*) - COUNT(company_id) FROM pipeline_stages
UNION ALL
SELECT 'bulk_email_campaigns', COUNT(*), COUNT(company_id), COUNT(*) - COUNT(company_id) FROM bulk_email_campaigns
UNION ALL
SELECT 'user_conversations', COUNT(*), COUNT(company_id), COUNT(*) - COUNT(company_id) FROM user_conversations
UNION ALL
SELECT 'workflow_executions', COUNT(*), COUNT(company_id), COUNT(*) - COUNT(company_id) FROM workflow_executions
UNION ALL
SELECT 'phone_numbers', COUNT(*), COUNT(company_id), COUNT(*) - COUNT(company_id) FROM phone_numbers
UNION ALL
SELECT 'sms_templates', COUNT(*), COUNT(company_id), COUNT(*) - COUNT(company_id) FROM sms_templates
UNION ALL
SELECT 'twilio_settings', COUNT(*), COUNT(company_id), COUNT(*) - COUNT(company_id) FROM twilio_settings
UNION ALL
SELECT 'inbox', COUNT(*), COUNT(company_id), COUNT(*) - COUNT(company_id) FROM inbox;

-- ============================================================
-- PART 3: CROSS-COMPANY DATA LEAK CHECK
-- ============================================================
\echo ''
\echo '============================================================'
\echo 'PART 3: CROSS-COMPANY DATA LEAK CHECK'
\echo '============================================================'
\echo ''

\echo '3.1 SMS Messages with mismatched company_id:'
SELECT COUNT(*) as leak_count
FROM sms_messages s
JOIN users u ON s.user_id = u.id
WHERE s.company_id != u.company_id;

\echo ''
\echo '3.2 Calls with mismatched company_id:'
SELECT COUNT(*) as leak_count
FROM calls c
JOIN users u ON c.user_id = u.id
WHERE c.company_id != u.company_id;

\echo ''
\echo '3.3 Emails with mismatched company_id:'
SELECT COUNT(*) as leak_count
FROM emails e
JOIN users u ON e.user_id = u.id
WHERE e.company_id != u.company_id;

\echo ''
\echo '3.4 Contacts with mismatched company_id:'
SELECT COUNT(*) as leak_count
FROM contacts c
JOIN users u ON c.user_id = u.id
WHERE c.company_id != u.company_id;

\echo ''
\echo '3.5 Deals with mismatched company_id:'
SELECT COUNT(*) as leak_count
FROM deals d
JOIN users u ON d.user_id = u.id
WHERE d.company_id != u.company_id;

-- ============================================================
-- PART 4: COMPANY DISTRIBUTION
-- ============================================================
\echo ''
\echo '============================================================'
\echo 'PART 4: COMPANY DISTRIBUTION'
\echo '============================================================'
\echo ''

\echo '4.1 Companies and User Count:'
SELECT 
    c.name as company,
    COUNT(u.id) as users,
    STRING_AGG(u.email, ', ') as user_emails
FROM companies c
LEFT JOIN users u ON u.company_id = c.id
GROUP BY c.id, c.name
ORDER BY c.name;

\echo ''
\echo '4.2 Data Distribution by Company:'
SELECT 
    c.name as company,
    (SELECT COUNT(*) FROM sms_messages WHERE company_id = c.id) as sms,
    (SELECT COUNT(*) FROM calls WHERE company_id = c.id) as calls,
    (SELECT COUNT(*) FROM emails WHERE company_id = c.id) as emails,
    (SELECT COUNT(*) FROM contacts WHERE company_id = c.id) as contacts,
    (SELECT COUNT(*) FROM deals WHERE company_id = c.id) as deals,
    (SELECT COUNT(*) FROM workflows WHERE company_id = c.id) as workflows,
    (SELECT COUNT(*) FROM pipelines WHERE company_id = c.id) as pipelines
FROM companies c
ORDER BY c.name;

-- ============================================================
-- PART 5: FOREIGN KEY CONSTRAINTS CHECK
-- ============================================================
\echo ''
\echo '============================================================'
\echo 'PART 5: FOREIGN KEY CONSTRAINTS CHECK'
\echo '============================================================'
\echo ''

\echo '5.1 Tables with company_id foreign key:'
SELECT 
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'company_id'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- ============================================================
-- PART 6: INDEX CHECK
-- ============================================================
\echo ''
\echo '============================================================'
\echo 'PART 6: INDEX CHECK'
\echo '============================================================'
\echo ''

\echo '6.1 Indexes on company_id column:'
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE indexdef LIKE '%company_id%'
    AND schemaname = 'public'
ORDER BY tablename;

-- ============================================================
-- PART 7: SUMMARY
-- ============================================================
\echo ''
\echo '============================================================'
\echo 'PART 7: AUDIT SUMMARY'
\echo '============================================================'
\echo ''

\echo 'Total Statistics:'
SELECT 
    'Total Companies' as metric,
    COUNT(*)::text as value
FROM companies
UNION ALL
SELECT 
    'Total Users',
    COUNT(*)::text
FROM users
UNION ALL
SELECT 
    'Users without company_id',
    COUNT(*)::text
FROM users WHERE company_id IS NULL
UNION ALL
SELECT 
    'Tables with company_id',
    COUNT(DISTINCT table_name)::text
FROM information_schema.columns
WHERE column_name = 'company_id'
    AND table_schema = 'public'
UNION ALL
SELECT 
    'Total SMS Messages',
    COUNT(*)::text
FROM sms_messages
UNION ALL
SELECT 
    'Total Calls',
    COUNT(*)::text
FROM calls
UNION ALL
SELECT 
    'Total Contacts',
    COUNT(*)::text
FROM contacts
UNION ALL
SELECT 
    'Total Deals',
    COUNT(*)::text
FROM deals;

\echo ''
\echo '============================================================'
\echo 'AUDIT COMPLETE!'
\echo '============================================================'
\echo ''
\echo 'Review the results above to ensure:'
\echo '- All critical tables have company_id column'
\echo '- All data records have company_id populated'
\echo '- No cross-company data leaks exist'
\echo '- Foreign keys and indexes are properly set'
\echo '============================================================'
