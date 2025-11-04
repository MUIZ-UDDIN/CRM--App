-- ============================================================
-- Check Company Data Issue (Fixed)
-- ============================================================
-- This script checks the company assignments for users and data
-- ============================================================

\echo '=============================================='
\echo 'Checking Company Data Issue'
\echo '=============================================='
\echo ''

-- 1. Check all companies
\echo '1. All Companies:'
SELECT id, name, created_at 
FROM companies 
ORDER BY created_at;

\echo ''
\echo '=============================================='
\echo ''

-- 2. Check all users with their companies
\echo '2. All Users with Company Info:'
SELECT 
    u.id,
    u.email,
    u.name,
    u.role,
    u.company_id,
    c.name as company_name
FROM users u
LEFT JOIN companies c ON u.company_id = c.id
ORDER BY c.name, u.email;

\echo ''
\echo '=============================================='
\echo ''

-- 3. Check deals by company
\echo '3. Deals by Company:'
SELECT 
    c.name as company_name,
    COUNT(d.id) as deal_count,
    STRING_AGG(DISTINCT u.email, ', ') as users
FROM companies c
LEFT JOIN deals d ON d.company_id = c.id
LEFT JOIN users u ON d.owner_id = u.id
GROUP BY c.id, c.name
ORDER BY c.name;

\echo ''
\echo '=============================================='
\echo ''

-- 4. Check pipelines by company
\echo '4. Pipelines by Company:'
SELECT 
    c.name as company_name,
    p.name as pipeline_name,
    p.id as pipeline_id,
    p.company_id
FROM companies c
LEFT JOIN pipelines p ON p.company_id = c.id
ORDER BY c.name, p.name;

\echo ''
\echo '=============================================='
\echo ''

-- 5. Check contacts by company
\echo '5. Contacts by Company:'
SELECT 
    c.name as company_name,
    COUNT(con.id) as contact_count,
    STRING_AGG(DISTINCT u.email, ', ') as users
FROM companies c
LEFT JOIN contacts con ON con.company_id = c.id
LEFT JOIN users u ON con.owner_id = u.id
GROUP BY c.id, c.name
ORDER BY c.name;

\echo ''
\echo '=============================================='
\echo ''

-- 6. Check workflows by company
\echo '6. Workflows by Company:'
SELECT 
    c.name as company_name,
    COUNT(w.id) as workflow_count,
    STRING_AGG(DISTINCT u.email, ', ') as users
FROM companies c
LEFT JOIN workflows w ON w.company_id = c.id
LEFT JOIN users u ON w.owner_id = u.id
GROUP BY c.id, c.name
ORDER BY c.name;

\echo ''
\echo '=============================================='
\echo ''

-- 7. Detailed user info
\echo '7. Detailed User Information:'
SELECT 
    u.email,
    u.name,
    u.role,
    c.name as company_name,
    c.id as company_id,
    (SELECT COUNT(*) FROM deals WHERE owner_id = u.id) as deals_owned,
    (SELECT COUNT(*) FROM contacts WHERE owner_id = u.id) as contacts_owned,
    (SELECT COUNT(*) FROM workflows WHERE owner_id = u.id) as workflows_owned
FROM users u
LEFT JOIN companies c ON u.company_id = c.id
ORDER BY c.name, u.email;

\echo ''
\echo '=============================================='
\echo ''

-- 8. Check for data cross-contamination
\echo '8. Cross-Company Data Issues:'
\echo ''
\echo 'A. Users in one company with data in another company:'
SELECT 
    u.email,
    u.company_id as user_company_id,
    uc.name as user_company_name,
    d.company_id as deal_company_id,
    dc.name as deal_company_name,
    COUNT(d.id) as deal_count
FROM users u
LEFT JOIN companies uc ON u.company_id = uc.id
LEFT JOIN deals d ON d.owner_id = u.id
LEFT JOIN companies dc ON d.company_id = dc.id
WHERE u.company_id != d.company_id
GROUP BY u.email, u.company_id, uc.name, d.company_id, dc.name;

\echo ''
\echo 'B. Contacts cross-contamination:'
SELECT 
    u.email,
    u.company_id as user_company_id,
    uc.name as user_company_name,
    con.company_id as contact_company_id,
    cc.name as contact_company_name,
    COUNT(con.id) as contact_count
FROM users u
LEFT JOIN companies uc ON u.company_id = uc.id
LEFT JOIN contacts con ON con.owner_id = u.id
LEFT JOIN companies cc ON con.company_id = cc.id
WHERE u.company_id != con.company_id
GROUP BY u.email, u.company_id, uc.name, con.company_id, cc.name;

\echo ''
\echo '=============================================='
\echo ''

-- 9. Show which user created what
\echo '9. User Activity Summary:'
SELECT 
    u.email,
    c.name as company,
    u.role,
    COUNT(DISTINCT d.id) as deals,
    COUNT(DISTINCT con.id) as contacts,
    COUNT(DISTINCT w.id) as workflows,
    COUNT(DISTINCT sm.id) as sms_messages
FROM users u
LEFT JOIN companies c ON u.company_id = c.id
LEFT JOIN deals d ON d.owner_id = u.id
LEFT JOIN contacts con ON con.owner_id = u.id
LEFT JOIN workflows w ON w.owner_id = u.id
LEFT JOIN sms_messages sm ON sm.user_id = u.id
GROUP BY u.email, c.name, u.role
ORDER BY c.name, u.email;

\echo ''
\echo '=============================================='
\echo 'Analysis Complete'
\echo '=============================================='
