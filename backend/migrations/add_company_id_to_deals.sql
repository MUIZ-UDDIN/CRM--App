-- Migration: Add company_id to deals table for multi-tenancy
-- Date: 2025-11-02

-- Add company_id column to deals table
ALTER TABLE deals ADD COLUMN IF NOT EXISTS company_id UUID;

-- Add foreign key constraint
ALTER TABLE deals ADD CONSTRAINT fk_deals_company_id 
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_deals_company_id ON deals(company_id);

-- Update existing deals to have company_id based on their owner's company
UPDATE deals 
SET company_id = users.company_id 
FROM users 
WHERE deals.owner_id = users.id AND deals.company_id IS NULL;
