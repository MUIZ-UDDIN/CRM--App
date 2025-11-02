-- Migration: Add contact information fields to companies table
-- Date: 2025-11-02

-- Add email, phone, and address fields to companies
ALTER TABLE companies ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS address VARCHAR(255);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS state VARCHAR(100);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS zip VARCHAR(20);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_companies_email ON companies(email);
CREATE INDEX IF NOT EXISTS idx_companies_phone ON companies(phone);
