-- Fix contact email unique constraint to allow soft-deleted duplicates
-- This allows the same email to exist multiple times if is_deleted=true

-- Drop the old unique constraint
ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_email_key;
DROP INDEX IF EXISTS ix_contacts_email;

-- Create a partial unique index that only applies to non-deleted contacts
CREATE UNIQUE INDEX ix_contacts_email_active ON contacts (email) WHERE is_deleted = false;

-- Verify the change
SELECT 
    indexname, 
    indexdef 
FROM 
    pg_indexes 
WHERE 
    tablename = 'contacts' 
    AND indexname = 'ix_contacts_email_active';
