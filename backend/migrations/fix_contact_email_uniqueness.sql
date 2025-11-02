-- Migration: Fix contact email uniqueness to be per-company
-- Date: 2025-11-02

-- Drop the global unique constraint on email
ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_email_key;

-- First, find and handle duplicate emails within the same company
-- Keep the oldest contact and mark others as deleted
WITH duplicates AS (
  SELECT id, email, company_id,
         ROW_NUMBER() OVER (PARTITION BY email, company_id ORDER BY created_at ASC) as rn
  FROM contacts
  WHERE company_id IS NOT NULL
)
UPDATE contacts
SET is_deleted = TRUE
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Create a composite unique index for email + company_id
-- This will only work after duplicates are removed
CREATE UNIQUE INDEX IF NOT EXISTS idx_contact_email_company ON contacts(email, company_id) WHERE is_deleted = FALSE;
