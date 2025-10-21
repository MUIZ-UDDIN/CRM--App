-- Add password reset fields to users table
-- This script is idempotent (safe to run multiple times)

-- Add reset_code column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='users' AND column_name='reset_code'
    ) THEN
        ALTER TABLE users ADD COLUMN reset_code VARCHAR(6);
        RAISE NOTICE 'Added reset_code column';
    ELSE
        RAISE NOTICE 'reset_code column already exists';
    END IF;
END $$;

-- Add reset_code_expires column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='users' AND column_name='reset_code_expires'
    ) THEN
        ALTER TABLE users ADD COLUMN reset_code_expires TIMESTAMP;
        RAISE NOTICE 'Added reset_code_expires column';
    ELSE
        RAISE NOTICE 'reset_code_expires column already exists';
    END IF;
END $$;
