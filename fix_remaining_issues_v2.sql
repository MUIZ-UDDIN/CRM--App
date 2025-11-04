-- ============================================================
-- Fix Remaining Multi-Tenancy Issues (V2 - Fixed)
-- ============================================================
-- This script fixes the 2 NULL company_id records found in audit
-- Handles the unique constraint on twilio_settings.company_id
-- ============================================================

BEGIN;

\echo '=============================================='
\echo 'Fixing Remaining Multi-Tenancy Issues (V2)'
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

-- Show the NULL record
\echo '   Record with NULL company_id:'
SELECT 
    ts.id,
    ts.user_id,
    ts.company_id as current_company_id,
    u.email as user_email,
    u.company_id as user_company_id,
    c.name as company_name
FROM twilio_settings ts
JOIN users u ON ts.user_id = u.id
LEFT JOIN companies c ON u.company_id = c.id
WHERE ts.company_id IS NULL;

-- Check if this company already has twilio_settings
\echo ''
\echo '   Checking for existing twilio_settings for this company:'
SELECT 
    ts.id,
    ts.user_id,
    ts.company_id,
    u.email as user_email,
    c.name as company_name
FROM twilio_settings ts
JOIN users u ON ts.user_id = u.id
JOIN companies c ON ts.company_id = c.id
WHERE ts.company_id = (
    SELECT u2.company_id 
    FROM twilio_settings ts2
    JOIN users u2 ON ts2.user_id = u2.id
    WHERE ts2.company_id IS NULL
    LIMIT 1
);

-- Since company_id has UNIQUE constraint, we need to DELETE the duplicate
-- The company already has valid twilio_settings, so we delete the orphaned one
\echo ''
\echo '   Deleting duplicate twilio_settings record (company already has one)...'
DELETE FROM twilio_settings 
WHERE company_id IS NULL;

\echo '   ✓ twilio_settings fixed (duplicate removed)'

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
\echo 'Company-wise twilio_settings distribution:'
SELECT 
    c.name as company,
    COUNT(ts.id) as twilio_settings_count,
    STRING_AGG(u.email, ', ') as users
FROM companies c
LEFT JOIN twilio_settings ts ON ts.company_id = c.id
LEFT JOIN users u ON ts.user_id = u.id
GROUP BY c.id, c.name
ORDER BY c.name;

\echo ''
\echo '=============================================='
\echo 'Expected: All tables should have 0 missing_company_id'
\echo 'Expected: Each company should have 1 twilio_settings record'
\echo '=============================================='
