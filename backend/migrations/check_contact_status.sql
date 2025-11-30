-- Check current contact status column configuration
-- Run this BEFORE making any changes

-- 1. Check the status column details
SELECT 
    column_name,
    data_type,
    udt_name,
    column_default,
    is_nullable,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'contacts' AND column_name = 'status';

-- 2. Check if ContactStatus ENUM type exists
SELECT 
    t.typname AS enum_name,
    e.enumlabel AS enum_value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname = 'contactstatus'
ORDER BY e.enumsortorder;

-- 3. Check sample status values in contacts table
SELECT 
    status,
    COUNT(*) as count
FROM contacts
WHERE is_deleted = false
GROUP BY status
ORDER BY count DESC;

-- 4. Check total contacts count
SELECT COUNT(*) as total_contacts FROM contacts WHERE is_deleted = false;
