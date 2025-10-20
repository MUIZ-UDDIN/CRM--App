-- Migration: Add 'lead' and 'prospect' to ContactStatus enum
-- This migration adds new values to the existing contactstatus enum type

-- Add 'lead' value if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'lead' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'contactstatus')
    ) THEN
        ALTER TYPE contactstatus ADD VALUE 'lead' AFTER 'new';
    END IF;
END$$;

-- Add 'prospect' value if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'prospect' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'contactstatus')
    ) THEN
        ALTER TYPE contactstatus ADD VALUE 'prospect' AFTER 'lead';
    END IF;
END$$;
