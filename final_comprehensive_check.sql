-- ============================================================
-- FINAL COMPREHENSIVE DATA INTEGRITY CHECK
-- ============================================================
-- Check ALL tables for cross-company contamination
-- Verify data direction/status correctness
-- ============================================================

\echo '=============================================='
\echo 'FINAL COMPREHENSIVE DATA INTEGRITY CHECK'
\echo '=============================================='
\echo ''

-- 1. Check ALL cross-company issues
\echo '1. CROSS-COMPANY CONTAMINATION CHECK:'
\echo ''

\echo 'A. Contacts:'
SELECT COUNT(*) as mismatched FROM contacts co JOIN users u ON co.owner_id = u.id WHERE u.company_id != co.company_id;

\echo 'B. Deals:'
SELECT COUNT(*) as mismatched FROM deals d JOIN users u ON d.owner_id = u.id WHERE u.company_id != d.company_id;

\echo 'C. Workflows:'
SELECT COUNT(*) as mismatched FROM workflows w JOIN users u ON w.owner_id = u.id WHERE u.company_id != w.company_id;

\echo 'D. Activities:'
SELECT COUNT(*) as mismatched FROM activities a JOIN users u ON a.owner_id = u.id WHERE u.company_id != a.company_id;

\echo 'E. Documents:'
SELECT COUNT(*) as mismatched FROM documents doc JOIN users u ON doc.owner_id = u.id WHERE u.company_id != doc.company_id;

\echo 'F. SMS Messages:'
SELECT COUNT(*) as mismatched FROM sms_messages sm JOIN users u ON sm.user_id = u.id WHERE u.company_id != sm.company_id;

\echo 'G. Calls:'
SELECT COUNT(*) as mismatched FROM calls c JOIN users u ON c.user_id = u.id WHERE u.company_id != c.company_id;

\echo 'H. SMS Templates:'
SELECT COUNT(*) as mismatched FROM sms_templates st JOIN users u ON st.user_id = u.id WHERE u.company_id != st.company_id;

\echo 'I. Phone Numbers:'
SELECT COUNT(*) as mismatched FROM phone_numbers pn JOIN users u ON pn.user_id = u.id WHERE u.company_id != pn.company_id;

\echo 'J. Twilio Settings:'
SELECT COUNT(*) as mismatched FROM twilio_settings ts JOIN users u ON ts.user_id = u.id WHERE u.company_id != ts.company_id;

\echo ''
\echo '=============================================='
\echo ''

-- 2. Check Call Direction Data Integrity
\echo '2. CALL DIRECTION INTEGRITY CHECK:'
\echo ''

\echo 'All calls by direction and status:'
SELECT 
    direction,
    status,
    COUNT(*) as count
FROM calls
GROUP BY direction, status
ORDER BY direction, status;

\echo ''
\echo 'Calls for admin@sunstonecrm.com:'
SELECT 
    c.id,
    c.direction,
    c.status,
    c.from_address,
    c.to_address,
    c.duration,
    c.started_at::timestamp(0) as call_time
FROM calls c
JOIN users u ON c.user_id = u.id
WHERE u.email = 'admin@sunstonecrm.com'
ORDER BY c.started_at DESC;

\echo ''
\echo '=============================================='
\echo ''

-- 3. Check SMS Direction Data Integrity
\echo '3. SMS DIRECTION INTEGRITY CHECK:'
\echo ''

\echo 'All SMS messages by direction and status:'
SELECT 
    direction,
    status,
    COUNT(*) as count
FROM sms_messages
GROUP BY direction, status
ORDER BY direction, status;

\echo ''
\echo 'SMS Messages for admin@sunstonecrm.com:'
SELECT 
    sm.id,
    sm.direction,
    sm.status,
    sm.from_address,
    sm.to_address,
    LEFT(sm.body, 50) as message_preview,
    sm.sent_at::timestamp(0) as sent_time
FROM sms_messages sm
JOIN users u ON sm.user_id = u.id
WHERE u.email = 'admin@sunstonecrm.com'
ORDER BY sm.sent_at DESC;

\echo ''
\echo '=============================================='
\echo ''

-- 4. Check User Conversations
\echo '4. USER CONVERSATIONS CHECK:'
\echo ''

\echo 'Conversations by company:'
SELECT 
    c.name as company,
    COUNT(uc.id) as total_conversations
FROM user_conversations uc
JOIN companies c ON uc.company_id = c.id
GROUP BY c.name
ORDER BY c.name;

\echo ''
\echo 'Cross-company conversations:'
SELECT COUNT(*) as mismatched 
FROM user_conversations uc 
JOIN users u ON uc.user_id = u.id 
WHERE u.company_id != uc.company_id;

\echo ''
\echo '=============================================='
\echo ''

-- 5. Check Bulk Email Campaigns
\echo '5. BULK EMAIL CAMPAIGNS CHECK:'
\echo ''

\echo 'Campaigns by company:'
SELECT 
    c.name as company,
    COUNT(bec.id) as total_campaigns
FROM bulk_email_campaigns bec
JOIN companies c ON bec.company_id = c.id
GROUP BY c.name
ORDER BY c.name;

\echo ''
\echo 'Cross-company campaigns:'
SELECT COUNT(*) as mismatched 
FROM bulk_email_campaigns bec 
JOIN users u ON bec.user_id = u.id 
WHERE u.company_id != bec.company_id;

\echo ''
\echo '=============================================='
\echo ''

-- 6. Summary of ALL cross-company issues
\echo '6. COMPLETE SUMMARY:'
\echo ''

SELECT 
    'Contacts' as table_name,
    COUNT(*) as mismatched_records
FROM contacts co
JOIN users u ON co.owner_id = u.id
WHERE u.company_id != co.company_id
UNION ALL
SELECT 
    'Deals',
    COUNT(*)
FROM deals d
JOIN users u ON d.owner_id = u.id
WHERE u.company_id != d.company_id
UNION ALL
SELECT 
    'Workflows',
    COUNT(*)
FROM workflows w
JOIN users u ON w.owner_id = u.id
WHERE u.company_id != w.company_id
UNION ALL
SELECT 
    'Activities',
    COUNT(*)
FROM activities a
JOIN users u ON a.owner_id = u.id
WHERE u.company_id != a.company_id
UNION ALL
SELECT 
    'Documents',
    COUNT(*)
FROM documents doc
JOIN users u ON doc.owner_id = u.id
WHERE u.company_id != doc.company_id
UNION ALL
SELECT 
    'SMS Messages',
    COUNT(*)
FROM sms_messages sm
JOIN users u ON sm.user_id = u.id
WHERE u.company_id != sm.company_id
UNION ALL
SELECT 
    'Calls',
    COUNT(*)
FROM calls c
JOIN users u ON c.user_id = u.id
WHERE u.company_id != c.company_id
UNION ALL
SELECT 
    'SMS Templates',
    COUNT(*)
FROM sms_templates st
JOIN users u ON st.user_id = u.id
WHERE u.company_id != st.company_id
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
WHERE u.company_id != ts.company_id
UNION ALL
SELECT 
    'User Conversations',
    COUNT(*)
FROM user_conversations uc
JOIN users u ON uc.user_id = u.id
WHERE u.company_id != uc.company_id
UNION ALL
SELECT 
    'Bulk Email Campaigns',
    COUNT(*)
FROM bulk_email_campaigns bec
JOIN users u ON bec.user_id = u.id
WHERE u.company_id != bec.company_id;

\echo ''
\echo '=============================================='
\echo 'CHECK COMPLETE!'
\echo '=============================================='
\echo ''
\echo 'All tables should show 0 mismatched_records'
\echo 'If any show > 0, data cleanup is needed'
\echo ''
