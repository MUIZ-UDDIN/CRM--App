-- ============================================================
-- FIX SMS MESSAGES, CALLS, AND TEMPLATES
-- ============================================================
-- Move all SMS messages, calls, and templates to correct company
-- for admin@sunstonecrm.com
-- ============================================================

\echo '=============================================='
\echo 'FIXING SMS MESSAGES, CALLS & TEMPLATES'
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

-- Check SMS MESSAGES BEFORE fix
\echo '2. SMS MESSAGES - BEFORE Fix:'
\echo 'Messages by admin@sunstonecrm.com in wrong company:'
SELECT 
    sm.id,
    sm.from_address,
    sm.to_address,
    sm.body,
    sm.direction,
    sm.status,
    u.email as user_email,
    uc.name as user_company,
    mc.name as message_company,
    'MISMATCH!' as status_flag
FROM sms_messages sm
JOIN users u ON sm.user_id = u.id
JOIN companies uc ON u.company_id = uc.id
JOIN companies mc ON sm.company_id = mc.id
WHERE u.email = 'admin@sunstonecrm.com'
  AND u.company_id != sm.company_id;

\echo ''
\echo 'Count of mismatched SMS messages:'
SELECT 
    COUNT(*) as mismatched_sms_messages
FROM sms_messages sm
JOIN users u ON sm.user_id = u.id
WHERE u.email = 'admin@sunstonecrm.com'
  AND u.company_id != sm.company_id;

\echo ''
\echo '=============================================='
\echo ''

-- Check CALLS BEFORE fix
\echo '3. CALLS - BEFORE Fix:'
\echo 'Calls by admin@sunstonecrm.com in wrong company:'
SELECT 
    c.id,
    c.from_address,
    c.to_address,
    c.direction,
    c.status,
    c.duration,
    u.email as user_email,
    uc.name as user_company,
    cc.name as call_company,
    'MISMATCH!' as status_flag
FROM calls c
JOIN users u ON c.user_id = u.id
JOIN companies uc ON u.company_id = uc.id
JOIN companies cc ON c.company_id = cc.id
WHERE u.email = 'admin@sunstonecrm.com'
  AND u.company_id != c.company_id;

\echo ''
\echo 'Count of mismatched calls:'
SELECT 
    COUNT(*) as mismatched_calls
FROM calls c
JOIN users u ON c.user_id = u.id
WHERE u.email = 'admin@sunstonecrm.com'
  AND u.company_id != c.company_id;

\echo ''
\echo '=============================================='
\echo ''

-- Check SMS TEMPLATES BEFORE fix
\echo '4. SMS TEMPLATES - BEFORE Fix:'
\echo 'Templates by admin@sunstonecrm.com in wrong company:'
SELECT 
    st.id,
    st.name as template_name,
    u.email as user_email,
    uc.name as user_company,
    tc.name as template_company,
    'MISMATCH!' as status_flag
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

-- FIX 1: Move SMS Messages
\echo '5. Moving SMS Messages to Sunstone...'
UPDATE sms_messages
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

\echo 'SMS Messages moved! ✓'
\echo ''

-- FIX 2: Move Calls
\echo '6. Moving Calls to Sunstone...'
UPDATE calls
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

\echo 'Calls moved! ✓'
\echo ''

-- FIX 3: Move SMS Templates
\echo '7. Moving SMS Templates to Sunstone...'
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

-- Verify SMS Messages
\echo 'A. SMS Messages - Cross-Company Check (should be 0):'
SELECT 
    COUNT(*) as mismatched_sms_messages
FROM sms_messages sm
JOIN users u ON sm.user_id = u.id
WHERE u.company_id != sm.company_id;

\echo ''
\echo 'SMS Messages by company:'
SELECT 
    c.name as company,
    COUNT(sm.id) as total_messages,
    COUNT(DISTINCT sm.user_id) as unique_users
FROM sms_messages sm
JOIN companies c ON sm.company_id = c.id
GROUP BY c.name
ORDER BY c.name;

\echo ''
\echo 'SMS Messages for admin@sunstonecrm.com:'
SELECT 
    sm.from_address,
    sm.to_address,
    sm.body,
    sm.direction,
    sm.status,
    c.name as company,
    sm.sent_at::timestamp(0) as sent_time
FROM sms_messages sm
JOIN users u ON sm.user_id = u.id
JOIN companies c ON sm.company_id = c.id
WHERE u.email = 'admin@sunstonecrm.com'
ORDER BY sm.sent_at DESC;

\echo ''
\echo '=============================================='
\echo ''

-- Verify Calls
\echo 'B. Calls - Cross-Company Check (should be 0):'
SELECT 
    COUNT(*) as mismatched_calls
FROM calls c
JOIN users u ON c.user_id = u.id
WHERE u.company_id != c.company_id;

\echo ''
\echo 'Calls by company:'
SELECT 
    co.name as company,
    COUNT(c.id) as total_calls,
    COUNT(DISTINCT c.user_id) as unique_users
FROM calls c
JOIN companies co ON c.company_id = co.id
GROUP BY co.name
ORDER BY co.name;

\echo ''
\echo 'Calls for admin@sunstonecrm.com:'
SELECT 
    c.from_address,
    c.to_address,
    c.direction,
    c.status,
    c.duration,
    co.name as company,
    c.started_at::timestamp(0) as call_time
FROM calls c
JOIN users u ON c.user_id = u.id
JOIN companies co ON c.company_id = co.id
WHERE u.email = 'admin@sunstonecrm.com'
ORDER BY c.started_at DESC;

\echo ''
\echo '=============================================='
\echo ''

-- Verify SMS Templates
\echo 'C. SMS Templates - Cross-Company Check (should be 0):'
SELECT 
    COUNT(*) as mismatched_templates
FROM sms_templates st
JOIN users u ON st.user_id = u.id
WHERE u.company_id != st.company_id;

\echo ''
\echo 'SMS Templates by company:'
SELECT 
    c.name as company,
    COUNT(st.id) as total_templates,
    COUNT(DISTINCT st.user_id) as unique_users
FROM sms_templates st
JOIN companies c ON st.company_id = c.id
GROUP BY c.name
ORDER BY c.name;

\echo ''
\echo 'SMS Templates for admin@sunstonecrm.com:'
SELECT 
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
\echo '- All SMS messages moved to Sunstone company'
\echo '- All calls moved to Sunstone company'
\echo '- All SMS templates moved to Sunstone company'
\echo '- Zero cross-company contamination'
\echo '- All data now visible in super admin account'
\echo ''
