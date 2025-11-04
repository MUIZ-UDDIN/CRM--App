-- ============================================================
-- Diagnose Cross-Company Data Issue
-- ============================================================

\echo '=============================================='
\echo 'CROSS-COMPANY DATA CONTAMINATION DIAGNOSIS'
\echo '=============================================='
\echo ''

-- 1. Show all users
\echo '1. ALL USERS:'
SELECT 
    u.email,
    u.first_name || ' ' || u.last_name as full_name,
    u.user_role,
    u.role as legacy_role,
    c.name as company_name,
    u.company_id
FROM users u
LEFT JOIN companies c ON u.company_id = c.id
ORDER BY c.name, u.email;

\echo ''
\echo '=============================================='
\echo ''

-- 2. Show cross-company DEALS contamination
\echo '2. CROSS-COMPANY DEALS ISSUE:'
\echo '   (Users creating deals in companies they dont belong to)'
\echo ''
SELECT 
    u.email as user_email,
    uc.name as user_company,
    d.company_id as deal_company_id,
    dc.name as deal_company,
    COUNT(d.id) as wrong_company_deals
FROM users u
JOIN companies uc ON u.company_id = uc.id
JOIN deals d ON d.owner_id = u.id
JOIN companies dc ON d.company_id = dc.id
WHERE u.company_id != d.company_id
GROUP BY u.email, uc.name, d.company_id, dc.name
ORDER BY wrong_company_deals DESC;

\echo ''
\echo '=============================================='
\echo ''

-- 3. Show cross-company CONTACTS contamination
\echo '3. CROSS-COMPANY CONTACTS ISSUE:'
\echo '   (Users creating contacts in companies they dont belong to)'
\echo ''
SELECT 
    u.email as user_email,
    uc.name as user_company,
    con.company_id as contact_company_id,
    cc.name as contact_company,
    COUNT(con.id) as wrong_company_contacts
FROM users u
JOIN companies uc ON u.company_id = uc.id
JOIN contacts con ON con.owner_id = u.id
JOIN companies cc ON con.company_id = cc.id
WHERE u.company_id != con.company_id
GROUP BY u.email, uc.name, con.company_id, cc.name
ORDER BY wrong_company_contacts DESC;

\echo ''
\echo '=============================================='
\echo ''

-- 4. Show cross-company WORKFLOWS contamination
\echo '4. CROSS-COMPANY WORKFLOWS ISSUE:'
\echo '   (Users creating workflows in companies they dont belong to)'
\echo ''
SELECT 
    u.email as user_email,
    uc.name as user_company,
    w.company_id as workflow_company_id,
    wc.name as workflow_company,
    COUNT(w.id) as wrong_company_workflows
FROM users u
JOIN companies uc ON u.company_id = uc.id
JOIN workflows w ON w.owner_id = u.id
JOIN companies wc ON w.company_id = wc.id
WHERE u.company_id != w.company_id
GROUP BY u.email, uc.name, w.company_id, wc.name
ORDER BY wrong_company_workflows DESC;

\echo ''
\echo '=============================================='
\echo ''

-- 5. Summary by user
\echo '5. USER DATA SUMMARY:'
SELECT 
    u.email,
    c.name as company,
    u.user_role,
    COUNT(DISTINCT d.id) as total_deals,
    COUNT(DISTINCT CASE WHEN d.company_id = u.company_id THEN d.id END) as correct_deals,
    COUNT(DISTINCT CASE WHEN d.company_id != u.company_id THEN d.id END) as wrong_deals,
    COUNT(DISTINCT con.id) as total_contacts,
    COUNT(DISTINCT CASE WHEN con.company_id = u.company_id THEN con.id END) as correct_contacts,
    COUNT(DISTINCT CASE WHEN con.company_id != u.company_id THEN con.id END) as wrong_contacts
FROM users u
LEFT JOIN companies c ON u.company_id = c.id
LEFT JOIN deals d ON d.owner_id = u.id
LEFT JOIN contacts con ON con.owner_id = u.id
GROUP BY u.email, c.name, u.user_role
ORDER BY c.name, u.email;

\echo ''
\echo '=============================================='
\echo ''

-- 6. Show what data belongs to which company (SHOULD BE)
\echo '6. CORRECT DATA DISTRIBUTION (What it SHOULD be):'
SELECT 
    c.name as company,
    (SELECT COUNT(*) FROM users WHERE company_id = c.id) as users,
    (SELECT COUNT(*) FROM deals WHERE company_id = c.id) as deals,
    (SELECT COUNT(*) FROM contacts WHERE company_id = c.id) as contacts,
    (SELECT COUNT(*) FROM workflows WHERE company_id = c.id) as workflows,
    (SELECT COUNT(*) FROM pipelines WHERE company_id = c.id) as pipelines
FROM companies c
ORDER BY c.name;

\echo ''
\echo '=============================================='
\echo 'DIAGNOSIS COMPLETE'
\echo '=============================================='
