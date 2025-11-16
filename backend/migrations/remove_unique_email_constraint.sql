-- Remove unique constraint on email and add composite unique constraint for email + company_id
-- This allows the same email to exist in different companies (multi-tenant support)

-- Drop the existing unique constraint on email
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;

-- Drop the existing index on email
DROP INDEX IF EXISTS ix_users_email;

-- Create a new composite unique index on email + company_id
-- This ensures email is unique within a company, but can exist in multiple companies
CREATE UNIQUE INDEX idx_users_email_company ON users (email, company_id) WHERE is_deleted = false;

-- Create a regular index on email for faster lookups
CREATE INDEX idx_users_email ON users (email) WHERE is_deleted = false;

-- Add comment
COMMENT ON INDEX idx_users_email_company IS 'Ensures email is unique per company (multi-tenant support)';
