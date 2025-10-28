-- Fix notification type enum in PostgreSQL
-- Run this with: psql sales_crm < fix_notification_enum.sql

-- Check if enum exists
DO $$
BEGIN
    -- Check if the enum type exists
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notificationtype') THEN
        -- Create the enum type
        CREATE TYPE notificationtype AS ENUM ('info', 'success', 'warning', 'error');
        RAISE NOTICE 'Created notificationtype enum';
    ELSE
        RAISE NOTICE 'notificationtype enum already exists';
        
        -- Add missing values if needed
        BEGIN
            ALTER TYPE notificationtype ADD VALUE IF NOT EXISTS 'info';
            RAISE NOTICE 'Added info to enum';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'info already exists in enum';
        END;
        
        BEGIN
            ALTER TYPE notificationtype ADD VALUE IF NOT EXISTS 'success';
            RAISE NOTICE 'Added success to enum';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'success already exists in enum';
        END;
        
        BEGIN
            ALTER TYPE notificationtype ADD VALUE IF NOT EXISTS 'warning';
            RAISE NOTICE 'Added warning to enum';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'warning already exists in enum';
        END;
        
        BEGIN
            ALTER TYPE notificationtype ADD VALUE IF NOT EXISTS 'error';
            RAISE NOTICE 'Added error to enum';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'error already exists in enum';
        END;
    END IF;
END$$;

-- Show current enum values
SELECT enumlabel as "Current Enum Values"
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'notificationtype')
ORDER BY enumsortorder;

-- Show notifications table structure
SELECT 
    column_name, 
    data_type, 
    udt_name,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'notifications' 
ORDER BY ordinal_position;
