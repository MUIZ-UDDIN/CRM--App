-- ============================================================
-- Check Company Data Issue
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
    u.full_name,
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
    u.email as created_by_user
FROM companies c
LEFT JOIN pipelines p ON p.company_id = c.id
LEFT JOIN users u ON p.user_id = u.id
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
LEFT JOIN users u ON w.user_id = u.id
GROUP BY c.id, c.name
ORDER BY c.name;

\echo ''
\echo '=============================================='
\echo ''

-- 7. Detailed user info
\echo '7. Detailed User Information:'
SELECT 
    u.email,
    u.full_name,
    u.role,
    c.name as company_name,
    c.id as company_id,
    (SELECT COUNT(*) FROM deals WHERE owner_id = u.id) as deals_owned,
    (SELECT COUNT(*) FROM contacts WHERE owner_id = u.id) as contacts_owned,
    (SELECT COUNT(*) FROM workflows WHERE user_id = u.id) as workflows_owned
FROM users u
LEFT JOIN companies c ON u.company_id = c.id
ORDER BY c.name, u.email;

\echo ''
\echo '=============================================='
\echo 'Analysis Complete'
\echo '=============================================='
