-- Migration: Change contact status from ENUM to String for custom statuses
-- This allows users to add their own custom status values

-- Step 1: Add a temporary column
ALTER TABLE contacts ADD COLUMN status_temp VARCHAR(50);

-- Step 2: Copy data from old column to new column (convert ENUM to lowercase string)
UPDATE contacts SET status_temp = LOWER(status::text);

-- Step 3: Drop the old ENUM column
ALTER TABLE contacts DROP COLUMN status;

-- Step 4: Rename the temporary column to status
ALTER TABLE contacts RENAME COLUMN status_temp TO status;

-- Step 5: Set default value and NOT NULL constraint
ALTER TABLE contacts ALTER COLUMN status SET DEFAULT 'new';
ALTER TABLE contacts ALTER COLUMN status SET NOT NULL;

-- Step 6: Create index on status column
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);

-- Step 7: Drop the old ENUM type if it exists (optional, for cleanup)
-- Note: This will fail if other tables use this ENUM, so we'll make it optional
DO $$ 
BEGIN
    DROP TYPE IF EXISTS contactstatus CASCADE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not drop ContactStatus ENUM type, it may be in use elsewhere';
END $$;

-- Verify the migration
SELECT column_name, data_type, column_default, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'contacts' AND column_name = 'status';
