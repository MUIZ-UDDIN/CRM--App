-- Migration: Fix contact email uniqueness to be per-company
-- Date: 2025-11-02

-- Drop the global unique constraint on email
ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_email_key;

-- Create a composite unique index for email + company_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_contact_email_company ON contacts(email, company_id);
