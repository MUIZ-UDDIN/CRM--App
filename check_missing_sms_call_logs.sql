-- ============================================================
-- CHECK MISSING SMS TEMPLATES AND CALL LOGS
-- ============================================================
-- Check if SMS templates and call logs were moved or deleted
-- ============================================================

\echo '=============================================='
\echo 'CHECKING SMS TEMPLATES AND CALL LOGS'
\echo '=============================================='
\echo ''

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

-- Check SMS templates table
\echo '2. SMS Templates - All Records:'
SELECT 
    id,
    name,
    content,
    user_id,
    company_id,
    (SELECT email FROM users WHERE id = sms_templates.user_id) as user_email,
    (SELECT name FROM companies WHERE id = sms_templates.company_id) as company_name,
    created_at::date as created
FROM sms_templates
ORDER BY created_at DESC;

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
\echo '=============================================='
\echo ''

-- Check call logs table
\echo '3. Call Logs - All Records:'
SELECT 
    id,
    from_number,
    to_number,
    direction,
    status,
    duration,
    user_id,
    company_id,
    (SELECT email FROM users WHERE id = call_logs.user_id) as user_email,
    (SELECT name FROM companies WHERE id = call_logs.company_id) as company_name,
    created_at::date as created
FROM call_logs
ORDER BY created_at DESC
LIMIT 50;

\echo ''
\echo 'Call Logs by company:'
SELECT 
    c.name as company,
    COUNT(cl.id) as total_call_logs,
    COUNT(DISTINCT cl.user_id) as unique_users
FROM call_logs cl
JOIN companies c ON cl.company_id = c.id
GROUP BY c.name
ORDER BY c.name;

\echo ''
\echo '=============================================='
\echo ''

-- Check SMS logs table
\echo '4. SMS Logs - All Records:'
SELECT 
    id,
    from_number,
    to_number,
    message_body,
    direction,
    status,
    user_id,
    company_id,
    (SELECT email FROM users WHERE id = sms_logs.user_id) as user_email,
    (SELECT name FROM companies WHERE id = sms_logs.company_id) as company_name,
    created_at::date as created
FROM sms_logs
ORDER BY created_at DESC
LIMIT 50;

\echo ''
\echo 'SMS Logs by company:'
SELECT 
    c.name as company,
    COUNT(sl.id) as total_sms_logs,
    COUNT(DISTINCT sl.user_id) as unique_users
FROM sms_logs sl
JOIN companies c ON sl.company_id = c.id
GROUP BY c.name
ORDER BY c.name;

\echo ''
\echo '=============================================='
\echo ''

-- Check for cross-company issues
\echo '5. Cross-Company Check - SMS Templates:'
SELECT 
    u.email as user_email,
    uc.name as user_company,
    st.name as template_name,
    tc.name as template_company,
    'MISMATCH!' as status
FROM sms_templates st
JOIN users u ON st.user_id = u.id
JOIN companies uc ON u.company_id = uc.id
JOIN companies tc ON st.company_id = tc.id
WHERE u.company_id != st.company_id;

\echo ''
\echo '6. Cross-Company Check - Call Logs:'
SELECT 
    u.email as user_email,
    uc.name as user_company,
    cl.from_number,
    cl.to_number,
    cc.name as call_company,
    'MISMATCH!' as status
FROM call_logs cl
JOIN users u ON cl.user_id = u.id
JOIN companies uc ON u.company_id = uc.id
JOIN companies cc ON cl.company_id = cc.id
WHERE u.company_id != cl.company_id;

\echo ''
\echo '7. Cross-Company Check - SMS Logs:'
SELECT 
    u.email as user_email,
    uc.name as user_company,
    sl.from_number,
    sl.to_number,
    sc.name as sms_company,
    'MISMATCH!' as status
FROM sms_logs sl
JOIN users u ON sl.user_id = u.id
JOIN companies uc ON u.company_id = uc.id
JOIN companies sc ON sl.company_id = sc.id
WHERE u.company_id != sl.company_id;

\echo ''
\echo '=============================================='
\echo 'CHECK COMPLETE!'
\echo '=============================================='
\echo ''
