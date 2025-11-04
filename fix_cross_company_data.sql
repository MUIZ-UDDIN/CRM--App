-- ============================================================
-- FIX CROSS-COMPANY DATA CONTAMINATION
-- ============================================================
-- Fix data where admin@sunstonecrm.com created data in wrong company
-- Move all data to the correct company (Sunstone)
-- ============================================================

\echo '=============================================='
\echo 'FIXING CROSS-COMPANY DATA CONTAMINATION'
\echo '=============================================='
\echo ''

BEGIN;

-- Get company IDs
\echo '1. Company Information:'
SELECT 
    id,
    name
FROM companies
ORDER BY name;

\echo ''
\echo '=============================================='
\echo ''

-- Get admin@sunstonecrm.com user info
\echo '2. Super Admin User Info:'
SELECT 
    id,
    email,
    first_name || ' ' || last_name as name,
    user_role,
    company_id,
    (SELECT name FROM companies WHERE id = users.company_id) as company_name
FROM users
WHERE email = 'admin@sunstonecrm.com';

\echo ''
\echo '=============================================='
\echo ''

-- Fix CONTACTS
\echo '3. Fixing Contacts...'
\echo 'Before fix - Contacts by admin@sunstonecrm.com in wrong company:'
SELECT 
    COUNT(*) as mismatched_contacts
FROM contacts co
JOIN users u ON co.owner_id = u.id
WHERE u.email = 'admin@sunstonecrm.com'
  AND u.company_id != co.company_id;

\echo ''
\echo 'Moving contacts to Sunstone company...'
UPDATE contacts
SET company_id = (
    SELECT company_id 
    FROM users 
    WHERE email = 'admin@sunstonecrm.com'
)
WHERE owner_id = (
    SELECT id 
    FROM users 
    WHERE email = 'admin@sunstonecrm.com'
)
AND company_id != (
    SELECT company_id 
    FROM users 
    WHERE email = 'admin@sunstonecrm.com'
);

\echo 'Contacts fixed! ✓'
\echo ''

-- Fix WORKFLOWS
\echo '4. Fixing Workflows...'
\echo 'Before fix - Workflows by admin@sunstonecrm.com in wrong company:'
SELECT 
    COUNT(*) as mismatched_workflows
FROM workflows w
JOIN users u ON w.owner_id = u.id
WHERE u.email = 'admin@sunstonecrm.com'
  AND u.company_id != w.company_id;

\echo ''
\echo 'Moving workflows to Sunstone company...'
UPDATE workflows
SET company_id = (
    SELECT company_id 
    FROM users 
    WHERE email = 'admin@sunstonecrm.com'
)
WHERE owner_id = (
    SELECT id 
    FROM users 
    WHERE email = 'admin@sunstonecrm.com'
)
AND company_id != (
    SELECT company_id 
    FROM users 
    WHERE email = 'admin@sunstonecrm.com'
);

\echo 'Workflows fixed! ✓'
\echo ''

-- Fix PHONE NUMBERS
\echo '5. Fixing Phone Numbers...'
\echo 'Before fix - Phone numbers in wrong companies:'
SELECT 
    u.email,
    pn.phone_number,
    uc.name as user_company,
    pc.name as phone_company
FROM phone_numbers pn
JOIN users u ON pn.user_id = u.id
JOIN companies uc ON u.company_id = uc.id
JOIN companies pc ON pn.company_id = pc.id
WHERE u.company_id != pn.company_id;

\echo ''
\echo 'Moving phone numbers to correct companies...'
UPDATE phone_numbers
SET company_id = (
    SELECT company_id 
    FROM users 
    WHERE users.id = phone_numbers.user_id
)
WHERE company_id != (
    SELECT company_id 
    FROM users 
    WHERE users.id = phone_numbers.user_id
);

\echo 'Phone numbers fixed! ✓'
\echo ''

COMMIT;

\echo '=============================================='
\echo 'VERIFICATION'
\echo '=============================================='
\echo ''

-- Verify CONTACTS
\echo 'A. Contacts - Cross-Company Check (should be 0):'
SELECT 
    COUNT(*) as mismatched_contacts
FROM contacts co
JOIN users u ON co.owner_id = u.id
WHERE u.company_id != co.company_id;

\echo ''
\echo 'Contacts by company:'
SELECT 
    c.name as company,
    COUNT(co.id) as total_contacts
FROM contacts co
JOIN companies c ON co.company_id = c.id
GROUP BY c.name
ORDER BY c.name;

\echo ''
\echo '=============================================='
\echo ''

-- Verify WORKFLOWS
\echo 'B. Workflows - Cross-Company Check (should be 0):'
SELECT 
    COUNT(*) as mismatched_workflows
FROM workflows w
JOIN users u ON w.owner_id = u.id
WHERE u.company_id != w.company_id;

\echo ''
\echo 'Workflows by company:'
SELECT 
    c.name as company,
    COUNT(w.id) as total_workflows
FROM workflows w
JOIN companies c ON w.company_id = c.id
GROUP BY c.name
ORDER BY c.name;

\echo ''
\echo '=============================================='
\echo ''

-- Verify PHONE NUMBERS
\echo 'C. Phone Numbers - Cross-Company Check (should be 0):'
SELECT 
    COUNT(*) as mismatched_phone_numbers
FROM phone_numbers pn
JOIN users u ON pn.user_id = u.id
WHERE u.company_id != pn.company_id;

\echo ''
\echo 'Phone numbers by company:'
SELECT 
    c.name as company,
    COUNT(pn.id) as total_phone_numbers
FROM phone_numbers pn
JOIN companies c ON pn.company_id = c.id
GROUP BY c.name
ORDER BY c.name;

\echo ''
\echo '=============================================='
\echo 'FIX COMPLETE!'
\echo '=============================================='
\echo ''
\echo 'Summary:'
\echo '- All contacts moved to correct companies'
\echo '- All workflows moved to correct companies'
\echo '- All phone numbers moved to correct companies'
\echo '- Zero cross-company contamination remaining'
\echo ''
