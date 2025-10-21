-- Add company column to deals table
-- This script is idempotent (safe to run multiple times)

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='deals' AND column_name='company'
    ) THEN
        ALTER TABLE deals ADD COLUMN company VARCHAR(255);
        CREATE INDEX IF NOT EXISTS idx_deals_company ON deals(company);
        RAISE NOTICE 'Added company column to deals table';
    ELSE
        RAISE NOTICE 'company column already exists in deals table';
    END IF;
END $$;
