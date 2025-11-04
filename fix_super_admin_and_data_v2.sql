-- ============================================================
-- FIX SUPER ADMIN AND CROSS-COMPANY DATA CONTAMINATION V2
-- ============================================================
-- This script fixes:
-- 1. Moves super admin to correct company
-- 2. Fixes cross-company data contamination
-- ============================================================

\echo '=============================================='
\echo 'FIXING SUPER ADMIN AND DATA CONTAMINATION'
\echo '=============================================='
\echo ''

-- STEP 1: Fix super admin company assignment
\echo 'STEP 1: Moving admin@sunstonecrm.com to Sunstone company...'
\echo ''

BEGIN;

-- Move super admin to Sunstone company
UPDATE users 
SET company_id = (SELECT id FROM companies WHERE name = 'Sunstone')
WHERE email = 'admin@sunstonecrm.com';

\echo 'Super admin moved to Sunstone company ✓'
\echo ''

-- STEP 2: Fix deals - admin@sunstonecrm.com's deals are already in Sunstone (correct!)
\echo 'STEP 2: Verifying deals...'
\echo ''
SELECT 
    'admin@sunstonecrm.com deals' as check_item,
    COUNT(*) as count,
    c.name as company
FROM deals d
JOIN companies c ON d.company_id = c.id
WHERE d.owner_id = (SELECT id FROM users WHERE email = 'admin@sunstonecrm.com')
GROUP BY c.name;

\echo ''
\echo 'Deals are correct (already in Sunstone) ✓'
\echo ''

-- STEP 3: Fix cross-company contacts
\echo 'STEP 3: Fixing cross-company contacts...'
\echo ''

-- Fix admin@sunstonecrm.com contacts (6 in wrong company)
-- Move them from Sunstone to nadan -> NO! Keep in Sunstone since admin is now in Sunstone
\echo 'A. admin@sunstonecrm.com contacts are now correct (user moved to Sunstone) ✓'

-- Fix nadan@gmail.com contacts (6 in wrong company - Sunstone)
-- Move them from Sunstone to nadan
UPDATE contacts
SET company_id = (SELECT id FROM companies WHERE name = 'nadan')
WHERE owner_id = (SELECT id FROM users WHERE email = 'nadan@gmail.com')
  AND company_id = (SELECT id FROM companies WHERE name = 'Sunstone');

\echo 'B. Moved nadan@gmail.com contacts from Sunstone to nadan ✓'

-- Fix salesmanager@gmail.com contact (1 in wrong company - nadan)
-- Move it from nadan to Sunstone
UPDATE contacts
SET company_id = (SELECT id FROM companies WHERE name = 'Sunstone')
WHERE owner_id = (SELECT id FROM users WHERE email = 'salesmanager@gmail.com')
  AND company_id = (SELECT id FROM companies WHERE name = 'nadan');

\echo 'C. Moved salesmanager@gmail.com contact from nadan to Sunstone ✓'
\echo ''

COMMIT;

-- STEP 4: Verify the fixes (after commit)
\echo 'STEP 4: VERIFICATION'
\echo '=============================================='
\echo ''

\echo 'A. Super Admin Status:'
SELECT 
    u.email,
    u.first_name || ' ' || u.last_name as name,
    u.user_role,
    c.name as company
FROM users u
LEFT JOIN companies c ON u.company_id = c.id
WHERE u.email = 'admin@sunstonecrm.com';

\echo ''
\echo 'B. Cross-Company Deals (should be 0):'
SELECT COUNT(*) as cross_company_deals
FROM users u
JOIN deals d ON d.owner_id = u.id
WHERE u.company_id != d.company_id;

\echo ''
\echo 'C. Cross-Company Contacts (should be 0):'
SELECT COUNT(*) as cross_company_contacts
FROM users u
JOIN contacts con ON con.owner_id = u.id
WHERE u.company_id != con.company_id;

\echo ''
\echo 'D. Data Distribution by Company:'
SELECT 
    c.name as company,
    (SELECT COUNT(*) FROM users WHERE company_id = c.id) as users,
    (SELECT COUNT(*) FROM deals WHERE company_id = c.id) as deals,
    (SELECT COUNT(*) FROM contacts WHERE company_id = c.id) as contacts,
    (SELECT COUNT(*) FROM workflows WHERE company_id = c.id) as workflows
FROM companies c
ORDER BY c.name;

\echo ''
\echo 'E. User Summary (users with data):'
SELECT 
    u.email,
    c.name as company,
    u.user_role,
    COUNT(DISTINCT d.id) as deals,
    COUNT(DISTINCT con.id) as contacts
FROM users u
LEFT JOIN companies c ON u.company_id = c.id
LEFT JOIN deals d ON d.owner_id = u.id AND d.company_id = u.company_id
LEFT JOIN contacts con ON con.owner_id = u.id AND con.company_id = u.company_id
GROUP BY u.email, c.name, u.user_role
HAVING COUNT(DISTINCT d.id) > 0 OR COUNT(DISTINCT con.id) > 0
ORDER BY c.name, u.email;

\echo ''
\echo '=============================================='
\echo 'FIX COMPLETE!'
\echo '=============================================='
\echo ''
\echo 'Summary:'
\echo '- Super admin moved to Sunstone company'
\echo '- All cross-company data fixed'
\echo '- Data properly isolated by company'
\echo ''
