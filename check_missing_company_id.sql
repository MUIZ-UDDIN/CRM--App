-- ============================================================
-- Check All Tables for Missing company_id Column
-- ============================================================

\echo '=============================================='
\echo 'Checking All Tables for company_id Column'
\echo '=============================================='
\echo ''

-- Get all tables in the public schema
\echo 'Tables WITH company_id column:'
SELECT DISTINCT table_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'company_id'
  AND table_name NOT LIKE 'alembic%'
ORDER BY table_name;

\echo ''
\echo 'Tables WITHOUT company_id column (excluding system tables):'
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

\echo ''
\echo '=============================================='
\echo 'Detailed Check: Key Tables'
\echo '=============================================='

-- Check specific tables
\echo ''
\echo 'bulk_email_campaigns:'
SELECT 
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bulk_email_campaigns' AND column_name = 'company_id'
    ) THEN '✅ HAS company_id' ELSE '❌ MISSING company_id' END as status;

\echo ''
\echo 'sms_templates:'
SELECT 
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sms_templates' AND column_name = 'company_id'
    ) THEN '✅ HAS company_id' ELSE '❌ MISSING company_id' END as status;

\echo ''
\echo 'phone_numbers:'
SELECT 
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'phone_numbers' AND column_name = 'company_id'
    ) THEN '✅ HAS company_id' ELSE '❌ MISSING company_id' END as status;

\echo ''
\echo 'twilio_settings:'
SELECT 
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'twilio_settings' AND column_name = 'company_id'
    ) THEN '✅ HAS company_id' ELSE '❌ MISSING company_id' END as status;

\echo ''
\echo 'user_conversations:'
SELECT 
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_conversations' AND column_name = 'company_id'
    ) THEN '✅ HAS company_id' ELSE '❌ MISSING company_id' END as status;

\echo ''
\echo 'inbox:'
SELECT 
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inbox' AND column_name = 'company_id'
    ) THEN '✅ HAS company_id' ELSE '❌ MISSING company_id' END as status;

\echo ''
\echo '=============================================='
