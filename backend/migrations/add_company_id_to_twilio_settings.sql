-- Migration: Add company_id to twilio_settings for company-based integration
-- Date: 2025-11-02

-- Add company_id column
ALTER TABLE twilio_settings 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

-- Create index
CREATE INDEX IF NOT EXISTS idx_twilio_settings_company_id ON twilio_settings(company_id);

-- Migrate existing data: assign to user's company
UPDATE twilio_settings ts
SET company_id = u.company_id
FROM users u
WHERE ts.user_id = u.id AND ts.company_id IS NULL;

-- Make user_id nullable (it's now optional)
ALTER TABLE twilio_settings 
ALTER COLUMN user_id DROP NOT NULL;

-- Drop old unique constraint on user_id if it exists
ALTER TABLE twilio_settings 
DROP CONSTRAINT IF EXISTS twilio_settings_user_id_key;

-- Add unique constraint on company_id
ALTER TABLE twilio_settings 
ADD CONSTRAINT twilio_settings_company_id_key UNIQUE (company_id);
