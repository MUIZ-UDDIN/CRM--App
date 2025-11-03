-- Migration: Add company_id to SMS-related tables for multi-tenancy
-- Date: 2025-11-04
-- Description: Adds company_id column to sms_messages, scheduled_sms, and sms_templates tables

-- 1. Add company_id to sms_messages table
ALTER TABLE sms_messages 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

CREATE INDEX IF NOT EXISTS idx_sms_messages_company_id ON sms_messages(company_id);

-- Update existing sms_messages to have company_id from their user
UPDATE sms_messages sm
SET company_id = u.company_id
FROM users u
WHERE sm.user_id = u.id AND sm.company_id IS NULL;

-- 2. Add company_id to scheduled_sms table
ALTER TABLE scheduled_sms 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

CREATE INDEX IF NOT EXISTS idx_scheduled_sms_company_id ON scheduled_sms(company_id);

-- Update existing scheduled_sms to have company_id from their user
UPDATE scheduled_sms ss
SET company_id = u.company_id
FROM users u
WHERE ss.user_id = u.id AND ss.company_id IS NULL;

-- 3. Add company_id to sms_templates table
ALTER TABLE sms_templates 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

CREATE INDEX IF NOT EXISTS idx_sms_templates_company_id ON sms_templates(company_id);

-- Update existing sms_templates to have company_id from their user
UPDATE sms_templates st
SET company_id = u.company_id
FROM users u
WHERE st.user_id = u.id AND st.company_id IS NULL;

-- 4. Verify the changes
SELECT 'sms_messages' as table_name, COUNT(*) as total, COUNT(company_id) as with_company_id
FROM sms_messages
UNION ALL
SELECT 'scheduled_sms', COUNT(*), COUNT(company_id)
FROM scheduled_sms
UNION ALL
SELECT 'sms_templates', COUNT(*), COUNT(company_id)
FROM sms_templates;
