-- ============================================================
-- Add company_id to performance_alerts table
-- ============================================================
-- This migration adds company_id column to performance_alerts
-- for complete multi-tenancy support
-- ============================================================

BEGIN;

\echo '=============================================='
\echo 'Adding company_id to performance_alerts'
\echo '=============================================='
\echo ''

-- Check if table exists
\echo '1. Checking if performance_alerts table exists...'
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'performance_alerts'
) as table_exists;

-- Add company_id column if it doesn't exist
\echo ''
\echo '2. Adding company_id column...'
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'performance_alerts' 
        AND column_name = 'company_id'
    ) THEN
        ALTER TABLE performance_alerts 
        ADD COLUMN company_id UUID;
        
        RAISE NOTICE 'company_id column added to performance_alerts';
    ELSE
        RAISE NOTICE 'company_id column already exists in performance_alerts';
    END IF;
END $$;

-- Populate company_id from users table
\echo ''
\echo '3. Populating company_id from users...'
UPDATE performance_alerts 
SET company_id = (
    SELECT company_id 
    FROM users 
    WHERE users.id = performance_alerts.user_id
)
WHERE company_id IS NULL;

\echo '   ✓ company_id populated'

-- Add foreign key constraint
\echo ''
\echo '4. Adding foreign key constraint...'
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'performance_alerts_company_id_fkey'
    ) THEN
        ALTER TABLE performance_alerts
        ADD CONSTRAINT performance_alerts_company_id_fkey
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Foreign key constraint added';
    ELSE
        RAISE NOTICE 'Foreign key constraint already exists';
    END IF;
END $$;

-- Add index on company_id
\echo ''
\echo '5. Adding index on company_id...'
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_performance_alerts_company_id'
    ) THEN
        CREATE INDEX idx_performance_alerts_company_id 
        ON performance_alerts(company_id);
        
        RAISE NOTICE 'Index created on company_id';
    ELSE
        RAISE NOTICE 'Index already exists on company_id';
    END IF;
END $$;

COMMIT;

\echo ''
\echo '=============================================='
\echo '✅ Migration Complete!'
\echo '=============================================='
\echo ''

-- Verify the changes
\echo 'Verification:'
SELECT 
    COUNT(*) as total_records,
    COUNT(company_id) as with_company_id,
    COUNT(*) - COUNT(company_id) as missing_company_id
FROM performance_alerts;

\echo ''
\echo 'Company-wise distribution:'
SELECT 
    c.name as company,
    COUNT(pa.id) as alert_count
FROM companies c
LEFT JOIN performance_alerts pa ON pa.company_id = c.id
GROUP BY c.id, c.name
ORDER BY c.name;

\echo ''
\echo '=============================================='
\echo 'Expected: All records should have company_id'
\echo '=============================================='
