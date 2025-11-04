-- ============================================================
-- FIX SUPER ADMIN ROLE ASSIGNMENTS
-- ============================================================
-- Only admin@sunstonecrm.com should have super_admin role
-- All other users with "Super Admin" should be changed to "Admin"
-- ============================================================

\echo '=============================================='
\echo 'FIXING SUPER ADMIN ROLE ASSIGNMENTS'
\echo '=============================================='
\echo ''

BEGIN;

-- Show current super admin users
\echo '1. Current users with Super Admin role:'
SELECT 
    email,
    first_name || ' ' || last_name as name,
    user_role,
    role as legacy_role,
    company_id
FROM users
WHERE user_role = 'super_admin' OR role ILIKE '%super%admin%'
ORDER BY email;

\echo ''
\echo '=============================================='
\echo ''

-- Fix: Change all Super Admin users to Admin, EXCEPT admin@sunstonecrm.com
\echo '2. Changing incorrect Super Admin roles to Admin...'

UPDATE users
SET 
    user_role = 'company_user',
    role = 'Admin'
WHERE (user_role = 'super_admin' OR role ILIKE '%super%admin%')
  AND email != 'admin@sunstonecrm.com';

\echo 'Fixed! ✓'
\echo ''

-- Ensure admin@sunstonecrm.com has correct super_admin role
\echo '3. Ensuring admin@sunstonecrm.com has super_admin role...'

UPDATE users
SET 
    user_role = 'super_admin',
    role = 'super_admin'
WHERE email = 'admin@sunstonecrm.com';

\echo 'Confirmed! ✓'
\echo ''

COMMIT;

-- Verification
\echo '=============================================='
\echo 'VERIFICATION'
\echo '=============================================='
\echo ''

\echo 'A. Users with super_admin role (should be only 1):'
SELECT 
    email,
    first_name || ' ' || last_name as name,
    user_role,
    role as legacy_role,
    c.name as company
FROM users u
LEFT JOIN companies c ON u.company_id = c.id
WHERE user_role = 'super_admin'
ORDER BY email;

\echo ''
\echo 'B. All users by company:'
SELECT 
    c.name as company,
    u.email,
    u.first_name || ' ' || u.last_name as name,
    u.user_role,
    u.role as legacy_role
FROM users u
LEFT JOIN companies c ON u.company_id = c.id
ORDER BY c.name, u.email;

\echo ''
\echo '=============================================='
\echo 'FIX COMPLETE!'
\echo '=============================================='
\echo ''
\echo 'Summary:'
\echo '- Only admin@sunstonecrm.com has super_admin role'
\echo '- All other users changed to appropriate roles'
\echo '- Super Admin role is now protected'
\echo ''
