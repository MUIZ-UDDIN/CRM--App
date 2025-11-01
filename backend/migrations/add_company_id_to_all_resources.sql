-- Migration: Add company_id to all remaining resources for complete multi-tenancy
-- Date: 2025-11-02

-- Add company_id to emails table
ALTER TABLE emails 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_emails_company_id ON emails(company_id);

-- Add company_id to email_templates table
ALTER TABLE email_templates 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_email_templates_company_id ON email_templates(company_id);

-- Add company_id to email_campaigns table
ALTER TABLE email_campaigns 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_company_id ON email_campaigns(company_id);

-- Add company_id to sms_messages table
ALTER TABLE sms_messages 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_sms_messages_company_id ON sms_messages(company_id);

-- Add company_id to calls table
ALTER TABLE calls 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_calls_company_id ON calls(company_id);

-- Add company_id to documents table
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_documents_company_id ON documents(company_id);

-- Add company_id to quotes table
ALTER TABLE quotes 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_quotes_company_id ON quotes(company_id);

-- Add company_id to workflows table
ALTER TABLE workflows 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_workflows_company_id ON workflows(company_id);

-- Add company_id to files table
ALTER TABLE files 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_files_company_id ON files(company_id);

-- Add company_id to folders table
ALTER TABLE folders 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_folders_company_id ON folders(company_id);

-- Add company_id to phone_numbers table
ALTER TABLE phone_numbers 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_phone_numbers_company_id ON phone_numbers(company_id);

-- Add company_id to sms_templates table
ALTER TABLE sms_templates 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_sms_templates_company_id ON sms_templates(company_id);

-- Add company_id to inbox table
ALTER TABLE inbox 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_inbox_company_id ON inbox(company_id);

-- Add company_id to notifications table
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_notifications_company_id ON notifications(company_id);

-- Migrate existing data: assign to user's company where possible
UPDATE emails e
SET company_id = u.company_id
FROM users u
WHERE e.sender_id = u.id AND e.company_id IS NULL;

UPDATE sms_messages s
SET company_id = u.company_id
FROM users u
WHERE s.sender_id = u.id AND s.company_id IS NULL;

UPDATE calls c
SET company_id = u.company_id
FROM users u
WHERE c.user_id = u.id AND c.company_id IS NULL;

UPDATE documents d
SET company_id = u.company_id
FROM users u
WHERE d.owner_id = u.id AND d.company_id IS NULL;

UPDATE quotes q
SET company_id = u.company_id
FROM users u
WHERE q.owner_id = u.id AND q.company_id IS NULL;

UPDATE workflows w
SET company_id = u.company_id
FROM users u
WHERE w.created_by = u.id AND w.company_id IS NULL;

UPDATE files f
SET company_id = u.company_id
FROM users u
WHERE f.uploaded_by = u.id AND f.company_id IS NULL;

UPDATE phone_numbers p
SET company_id = (SELECT company_id FROM twilio_settings WHERE id = p.twilio_settings_id LIMIT 1)
WHERE p.company_id IS NULL;

-- Assign remaining orphaned records to first company
UPDATE emails SET company_id = (SELECT id FROM companies ORDER BY created_at LIMIT 1) WHERE company_id IS NULL;
UPDATE email_templates SET company_id = (SELECT id FROM companies ORDER BY created_at LIMIT 1) WHERE company_id IS NULL;
UPDATE email_campaigns SET company_id = (SELECT id FROM companies ORDER BY created_at LIMIT 1) WHERE company_id IS NULL;
UPDATE sms_messages SET company_id = (SELECT id FROM companies ORDER BY created_at LIMIT 1) WHERE company_id IS NULL;
UPDATE calls SET company_id = (SELECT id FROM companies ORDER BY created_at LIMIT 1) WHERE company_id IS NULL;
UPDATE documents SET company_id = (SELECT id FROM companies ORDER BY created_at LIMIT 1) WHERE company_id IS NULL;
UPDATE quotes SET company_id = (SELECT id FROM companies ORDER BY created_at LIMIT 1) WHERE company_id IS NULL;
UPDATE workflows SET company_id = (SELECT id FROM companies ORDER BY created_at LIMIT 1) WHERE company_id IS NULL;
UPDATE files SET company_id = (SELECT id FROM companies ORDER BY created_at LIMIT 1) WHERE company_id IS NULL;
UPDATE folders SET company_id = (SELECT id FROM companies ORDER BY created_at LIMIT 1) WHERE company_id IS NULL;
UPDATE phone_numbers SET company_id = (SELECT id FROM companies ORDER BY created_at LIMIT 1) WHERE company_id IS NULL;
UPDATE sms_templates SET company_id = (SELECT id FROM companies ORDER BY created_at LIMIT 1) WHERE company_id IS NULL;
UPDATE inbox SET company_id = (SELECT id FROM companies ORDER BY created_at LIMIT 1) WHERE company_id IS NULL;
UPDATE notifications SET company_id = (SELECT id FROM companies ORDER BY created_at LIMIT 1) WHERE company_id IS NULL;
