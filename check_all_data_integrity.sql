-- ============================================================
-- COMPREHENSIVE DATA INTEGRITY CHECK
-- ============================================================
-- Check ALL tables for cross-company data contamination
-- Ensure users only have data in their own company
-- ============================================================

\echo '=============================================='
\echo 'COMPREHENSIVE DATA INTEGRITY CHECK'
\echo '=============================================='
\echo ''

-- Get company information
\echo '1. COMPANIES:'
SELECT 
    id,
    name,
    domain,
    created_at::date as created
FROM companies
ORDER BY name;

\echo ''
\echo '=============================================='
\echo ''

-- Get user information by company
\echo '2. USERS BY COMPANY:'
SELECT 
    c.name as company,
    u.email,
    u.first_name || ' ' || u.last_name as user_name,
    u.user_role,
    u.created_at::date as joined
FROM users u
LEFT JOIN companies c ON u.company_id = c.id
ORDER BY c.name, u.email;

\echo ''
\echo '=============================================='
\echo ''

-- Check DEALS
\echo '3. DEALS - Cross-Company Check:'
\echo 'Users creating deals in wrong companies:'
SELECT 
    u.email as user_email,
    uc.name as user_company,
    d.title as deal_title,
    dc.name as deal_company,
    'MISMATCH!' as status
FROM deals d
JOIN users u ON d.owner_id = u.id
JOIN companies uc ON u.company_id = uc.id
JOIN companies dc ON d.company_id = dc.id
WHERE u.company_id != d.company_id;

\echo ''
\echo 'Deals summary by company:'
SELECT 
    c.name as company,
    COUNT(d.id) as total_deals,
    COUNT(DISTINCT d.owner_id) as unique_owners
FROM deals d
JOIN companies c ON d.company_id = c.id
GROUP BY c.name
ORDER BY c.name;

\echo ''
\echo '=============================================='
\echo ''

-- Check CONTACTS
\echo '4. CONTACTS - Cross-Company Check:'
\echo 'Users creating contacts in wrong companies:'
SELECT 
    u.email as user_email,
    uc.name as user_company,
    co.first_name || ' ' || co.last_name as contact_name,
    cc.name as contact_company,
    'MISMATCH!' as status
FROM contacts co
JOIN users u ON co.owner_id = u.id
JOIN companies uc ON u.company_id = uc.id
JOIN companies cc ON co.company_id = cc.id
WHERE u.company_id != co.company_id;

\echo ''
\echo 'Contacts summary by company:'
SELECT 
    c.name as company,
    COUNT(co.id) as total_contacts,
    COUNT(DISTINCT co.owner_id) as unique_owners
FROM contacts co
JOIN companies c ON co.company_id = c.id
GROUP BY c.name
ORDER BY c.name;

\echo ''
\echo '=============================================='
\echo ''

-- Check PIPELINES
\echo '5. PIPELINES - Cross-Company Check:'
\echo 'Users creating pipelines in wrong companies:'
SELECT 
    u.email as user_email,
    uc.name as user_company,
    p.name as pipeline_name,
    pc.name as pipeline_company,
    'MISMATCH!' as status
FROM pipelines p
JOIN users u ON p.created_by = u.id
JOIN companies uc ON u.company_id = uc.id
JOIN companies pc ON p.company_id = pc.id
WHERE u.company_id != p.company_id;

\echo ''
\echo 'Pipelines summary by company:'
SELECT 
    c.name as company,
    COUNT(p.id) as total_pipelines,
    COUNT(DISTINCT p.created_by) as unique_creators
FROM pipelines p
JOIN companies c ON p.company_id = c.id
GROUP BY c.name
ORDER BY c.name;

\echo ''
\echo '=============================================='
\echo ''

-- Check ACTIVITIES
\echo '6. ACTIVITIES - Cross-Company Check:'
\echo 'Users creating activities in wrong companies:'
SELECT 
    u.email as user_email,
    uc.name as user_company,
    a.title as activity_title,
    ac.name as activity_company,
    'MISMATCH!' as status
FROM activities a
JOIN users u ON a.owner_id = u.id
JOIN companies uc ON u.company_id = uc.id
JOIN companies cc ON a.company_id = cc.id
WHERE u.company_id != a.company_id;

\echo ''
\echo 'Activities summary by company:'
SELECT 
    c.name as company,
    COUNT(a.id) as total_activities,
    COUNT(DISTINCT a.owner_id) as unique_owners
FROM activities a
JOIN companies c ON a.company_id = c.id
GROUP BY c.name
ORDER BY c.name;

\echo ''
\echo '=============================================='
\echo ''

-- Check WORKFLOWS
\echo '7. WORKFLOWS - Cross-Company Check:'
\echo 'Users creating workflows in wrong companies:'
SELECT 
    u.email as user_email,
    uc.name as user_company,
    w.name as workflow_name,
    wc.name as workflow_company,
    'MISMATCH!' as status
FROM workflows w
JOIN users u ON w.owner_id = u.id
JOIN companies uc ON u.company_id = uc.id
JOIN companies wc ON w.company_id = wc.id
WHERE u.company_id != w.company_id;

\echo ''
\echo 'Workflows summary by company:'
SELECT 
    c.name as company,
    COUNT(w.id) as total_workflows,
    COUNT(DISTINCT w.owner_id) as unique_owners
FROM workflows w
JOIN companies c ON w.company_id = c.id
GROUP BY c.name
ORDER BY c.name;

\echo ''
\echo '=============================================='
\echo ''

-- Check DOCUMENTS
\echo '8. DOCUMENTS - Cross-Company Check:'
\echo 'Users creating documents in wrong companies:'
SELECT 
    u.email as user_email,
    uc.name as user_company,
    doc.name as document_name,
    dc.name as document_company,
    'MISMATCH!' as status
FROM documents doc
JOIN users u ON doc.owner_id = u.id
JOIN companies uc ON u.company_id = uc.id
JOIN companies dc ON doc.company_id = dc.id
WHERE u.company_id != doc.company_id;

\echo ''
\echo 'Documents summary by company:'
SELECT 
    c.name as company,
    COUNT(doc.id) as total_documents,
    COUNT(DISTINCT doc.owner_id) as unique_owners
FROM documents doc
JOIN companies c ON doc.company_id = c.id
GROUP BY c.name
ORDER BY c.name;

\echo ''
\echo '=============================================='
\echo ''

-- Check PHONE_NUMBERS
\echo '9. PHONE NUMBERS - Cross-Company Check:'
\echo 'Users with phone numbers in wrong companies:'
SELECT 
    u.email as user_email,
    uc.name as user_company,
    pn.phone_number,
    pc.name as phone_company,
    'MISMATCH!' as status
FROM phone_numbers pn
JOIN users u ON pn.user_id = u.id
JOIN companies uc ON u.company_id = uc.id
JOIN companies pc ON pn.company_id = pc.id
WHERE u.company_id != pn.company_id;

\echo ''
\echo 'Phone numbers summary by company:'
SELECT 
    c.name as company,
    COUNT(pn.id) as total_phone_numbers,
    COUNT(DISTINCT pn.user_id) as unique_users
FROM phone_numbers pn
JOIN companies c ON pn.company_id = c.id
GROUP BY c.name
ORDER BY c.name;

\echo ''
\echo '=============================================='
\echo ''

-- Check TWILIO_SETTINGS
\echo '10. TWILIO SETTINGS - Cross-Company Check:'
\echo 'Users with Twilio settings in wrong companies:'
SELECT 
    u.email as user_email,
    uc.name as user_company,
    ts.account_sid,
    tc.name as twilio_company,
    'MISMATCH!' as status
FROM twilio_settings ts
JOIN users u ON ts.user_id = u.id
JOIN companies uc ON u.company_id = uc.id
JOIN companies tc ON ts.company_id = tc.id
WHERE u.company_id != ts.company_id;

\echo ''
\echo 'Twilio settings summary by company:'
SELECT 
    c.name as company,
    COUNT(ts.id) as total_settings,
    COUNT(DISTINCT ts.user_id) as unique_users
FROM twilio_settings ts
JOIN companies c ON ts.company_id = c.id
GROUP BY c.name
ORDER BY c.name;

\echo ''
\echo '=============================================='
\echo 'SUMMARY'
\echo '=============================================='
\echo ''

-- Overall summary
\echo 'CROSS-COMPANY CONTAMINATION SUMMARY:'
SELECT 
    'Deals' as table_name,
    COUNT(*) as mismatched_records
FROM deals d
JOIN users u ON d.owner_id = u.id
WHERE u.company_id != d.company_id
UNION ALL
SELECT 
    'Contacts',
    COUNT(*)
FROM contacts co
JOIN users u ON co.owner_id = u.id
WHERE u.company_id != co.company_id
UNION ALL
SELECT 
    'Pipelines',
    COUNT(*)
FROM pipelines p
JOIN users u ON p.created_by = u.id
WHERE u.company_id != p.company_id
UNION ALL
SELECT 
    'Activities',
    COUNT(*)
FROM activities a
JOIN users u ON a.owner_id = u.id
WHERE u.company_id != a.company_id
UNION ALL
SELECT 
    'Workflows',
    COUNT(*)
FROM workflows w
JOIN users u ON w.owner_id = u.id
WHERE u.company_id != w.company_id
UNION ALL
SELECT 
    'Documents',
    COUNT(*)
FROM documents doc
JOIN users u ON doc.owner_id = u.id
WHERE u.company_id != doc.company_id
UNION ALL
SELECT 
    'Phone Numbers',
    COUNT(*)
FROM phone_numbers pn
JOIN users u ON pn.user_id = u.id
WHERE u.company_id != pn.company_id
UNION ALL
SELECT 
    'Twilio Settings',
    COUNT(*)
FROM twilio_settings ts
JOIN users u ON ts.user_id = u.id
WHERE u.company_id != ts.company_id;

\echo ''
\echo '=============================================='
\echo 'CHECK COMPLETE!'
\echo '=============================================='
\echo ''
\echo 'If any table shows mismatched_records > 0, data cleanup is needed!'
\echo ''
