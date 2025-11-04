-- ============================================================
-- Fix Remaining Multi-Tenancy Issues
-- ============================================================
-- This script fixes the 2 NULL company_id records found in audit
-- ============================================================

BEGIN;

\echo '=============================================='
\echo 'Fixing Remaining Multi-Tenancy Issues'
\echo '=============================================='
\echo ''

-- ============================================================
-- Fix 1: phone_numbers missing company_id
-- ============================================================
\echo '1. Fixing phone_numbers with NULL company_id...'

-- Show records before fix
\echo '   Records with NULL company_id:'
SELECT id, phone_number, user_id, company_id 
FROM phone_numbers 
WHERE company_id IS NULL;

-- Fix the records
UPDATE phone_numbers 
SET company_id = (SELECT company_id FROM users WHERE users.id = phone_numbers.user_id)
WHERE company_id IS NULL;

\echo '   ✓ phone_numbers fixed'

-- ============================================================
-- Fix 2: twilio_settings missing company_id
-- ============================================================
\echo ''
\echo '2. Fixing twilio_settings with NULL company_id...'

-- Show records before fix
\echo '   Records with NULL company_id:'
SELECT id, user_id, company_id 
FROM twilio_settings 
WHERE company_id IS NULL;

-- Fix the records
UPDATE twilio_settings 
SET company_id = (SELECT company_id FROM users WHERE users.id = twilio_settings.user_id)
WHERE company_id IS NULL;

\echo '   ✓ twilio_settings fixed'

COMMIT;

\echo ''
\echo '=============================================='
\echo '✅ All Issues Fixed!'
\echo '=============================================='
\echo ''

-- Verify the fixes
\echo 'Verification:'
SELECT 
    'phone_numbers' as table_name,
    COUNT(*) as total_records,
    COUNT(company_id) as with_company_id,
    COUNT(*) - COUNT(company_id) as missing_company_id
FROM phone_numbers
UNION ALL
SELECT 
    'twilio_settings',
    COUNT(*),
    COUNT(company_id),
    COUNT(*) - COUNT(company_id)
FROM twilio_settings;

\echo ''
\echo '=============================================='
\echo 'Expected: All tables should have 0 missing_company_id'
\echo '=============================================='
