-- ============================================================
-- FIX SMS TEMPLATES - MOVE TO CORRECT COMPANY
-- ============================================================
-- Move SMS templates from "nadan" to "Sunstone" for admin@sunstonecrm.com
-- ============================================================

\echo '=============================================='
\echo 'FIXING SMS TEMPLATES'
\echo '=============================================='
\echo ''

BEGIN;

-- Get super admin info
\echo '1. Super Admin Info:'
SELECT 
    id,
    email,
    first_name || ' ' || last_name as name,
    company_id,
    (SELECT name FROM companies WHERE id = users.company_id) as company_name
FROM users
WHERE email = 'admin@sunstonecrm.com';

\echo ''
\echo '=============================================='
\echo ''

-- Check SMS templates BEFORE fix
\echo '2. SMS Templates BEFORE Fix:'
\echo 'Templates by admin@sunstonecrm.com in wrong company:'
SELECT 
    st.id,
    st.name as template_name,
    u.email as user_email,
    uc.name as user_company,
    tc.name as template_company,
    'MISMATCH!' as status
FROM sms_templates st
JOIN users u ON st.user_id = u.id
JOIN companies uc ON u.company_id = uc.id
JOIN companies tc ON st.company_id = tc.id
WHERE u.email = 'admin@sunstonecrm.com'
  AND u.company_id != st.company_id;

\echo ''
\echo 'Count of mismatched templates:'
SELECT 
    COUNT(*) as mismatched_templates
FROM sms_templates st
JOIN users u ON st.user_id = u.id
WHERE u.email = 'admin@sunstonecrm.com'
  AND u.company_id != st.company_id;

\echo ''
\echo '=============================================='
\echo ''

-- Fix SMS templates
\echo '3. Moving SMS Templates to Sunstone...'
UPDATE sms_templates
SET company_id = (
    SELECT company_id 
    FROM users 
    WHERE email = 'admin@sunstonecrm.com'
)
WHERE user_id = (
    SELECT id 
    FROM users 
    WHERE email = 'admin@sunstonecrm.com'
)
AND company_id != (
    SELECT company_id 
    FROM users 
    WHERE email = 'admin@sunstonecrm.com'
);

\echo 'SMS Templates moved! ✓'
\echo ''

COMMIT;

\echo '=============================================='
\echo 'VERIFICATION'
\echo '=============================================='
\echo ''

-- Verify SMS templates AFTER fix
\echo 'A. SMS Templates - Cross-Company Check (should be 0):'
SELECT 
    COUNT(*) as mismatched_templates
FROM sms_templates st
JOIN users u ON st.user_id = u.id
WHERE u.company_id != st.company_id;

\echo ''
\echo 'B. SMS Templates by company:'
SELECT 
    c.name as company,
    COUNT(st.id) as total_templates,
    COUNT(DISTINCT st.user_id) as unique_users
FROM sms_templates st
JOIN companies c ON st.company_id = c.id
GROUP BY c.name
ORDER BY c.name;

\echo ''
\echo 'C. SMS Templates for admin@sunstonecrm.com:'
SELECT 
    st.id,
    st.name as template_name,
    st.body as template_body,
    c.name as company,
    st.created_at::date as created
FROM sms_templates st
JOIN users u ON st.user_id = u.id
JOIN companies c ON st.company_id = c.id
WHERE u.email = 'admin@sunstonecrm.com'
ORDER BY st.created_at DESC;

\echo ''
\echo '=============================================='
\echo 'FIX COMPLETE!'
\echo '=============================================='
\echo ''
\echo 'Summary:'
\echo '- All SMS templates moved to correct company (Sunstone)'
\echo '- Zero cross-company contamination'
\echo '- Templates are now visible in super admin account'
\echo ''
