-- Migration: Add company_id to resources for multi-tenancy
-- Date: 2025-11-02

-- Add company_id to pipelines table
ALTER TABLE pipelines 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

CREATE INDEX IF NOT EXISTS idx_pipelines_company_id ON pipelines(company_id);

-- Add company_id to contacts table (if not exists)
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

CREATE INDEX IF NOT EXISTS idx_contacts_company_id ON contacts(company_id);

-- Add company_id to activities table (if not exists)
ALTER TABLE activities 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

CREATE INDEX IF NOT EXISTS idx_activities_company_id ON activities(company_id);

-- Add company_id to deals table (if not exists)
ALTER TABLE deals 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

CREATE INDEX IF NOT EXISTS idx_deals_company_id ON deals(company_id);

-- Update existing pipelines to belong to the first company (Default Company)
-- This is for existing data only
UPDATE pipelines 
SET company_id = (SELECT id FROM companies ORDER BY created_at LIMIT 1)
WHERE company_id IS NULL;

-- Update existing contacts to belong to the first company
UPDATE contacts 
SET company_id = (SELECT id FROM companies ORDER BY created_at LIMIT 1)
WHERE company_id IS NULL;

-- Update existing activities to belong to the first company
UPDATE activities 
SET company_id = (SELECT id FROM companies ORDER BY created_at LIMIT 1)
WHERE company_id IS NULL;

-- Update existing deals to belong to the first company
UPDATE deals 
SET company_id = (SELECT id FROM companies ORDER BY created_at LIMIT 1)
WHERE company_id IS NULL;
