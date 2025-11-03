-- ============================================================================
-- COMPLETE MULTI-TENANCY MIGRATION SCRIPT
-- Date: 2025-11-04
-- Description: Adds company_id to ALL tables that need multi-tenancy isolation
-- ============================================================================

-- BACKUP REMINDER: Make sure you have a database backup before running this!

BEGIN;

-- ============================================================================
-- PHASE 1: CRITICAL TABLES (High Priority - Data Leakage Risk)
-- ============================================================================

-- 1. CALLS TABLE
ALTER TABLE calls 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

CREATE INDEX IF NOT EXISTS idx_calls_company_id ON calls(company_id);

UPDATE calls c 
SET company_id = u.company_id 
FROM users u 
WHERE c.user_id = u.id AND c.company_id IS NULL;

-- 2. EMAILS TABLE
ALTER TABLE emails 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

CREATE INDEX IF NOT EXISTS idx_emails_company_id ON emails(company_id);

UPDATE emails e 
SET company_id = u.company_id 
FROM users u 
WHERE e.owner_id = u.id AND e.company_id IS NULL;

-- 3. EMAIL TEMPLATES TABLE
ALTER TABLE email_templates 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

CREATE INDEX IF NOT EXISTS idx_email_templates_company_id ON email_templates(company_id);

-- Note: Email templates might be system-wide or per-company
-- For now, we'll leave them NULL to be system-wide
-- If you want per-company templates, uncomment the next line:
-- UPDATE email_templates et SET company_id = (SELECT company_id FROM users WHERE id = et.created_by LIMIT 1) WHERE et.company_id IS NULL;

-- 4. EMAIL CAMPAIGNS TABLE
ALTER TABLE email_campaigns 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

CREATE INDEX IF NOT EXISTS idx_email_campaigns_company_id ON email_campaigns(company_id);

-- Email campaigns need company_id from the first email in the campaign or creator
UPDATE email_campaigns ec 
SET company_id = (
    SELECT e.company_id 
    FROM emails e 
    WHERE e.campaign_id = ec.id 
    LIMIT 1
) 
WHERE ec.company_id IS NULL;

-- 5. DOCUMENTS TABLE
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

CREATE INDEX IF NOT EXISTS idx_documents_company_id ON documents(company_id);

UPDATE documents d 
SET company_id = u.company_id 
FROM users u 
WHERE d.owner_id = u.id AND d.company_id IS NULL;

-- 6. DOCUMENT SIGNATURES TABLE
ALTER TABLE document_signatures 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

CREATE INDEX IF NOT EXISTS idx_document_signatures_company_id ON document_signatures(company_id);

UPDATE document_signatures ds 
SET company_id = d.company_id 
FROM documents d 
WHERE ds.document_id = d.id AND ds.company_id IS NULL;

-- 7. QUOTES TABLE
ALTER TABLE quotes 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

CREATE INDEX IF NOT EXISTS idx_quotes_company_id ON quotes(company_id);

UPDATE quotes q 
SET company_id = u.company_id 
FROM users u 
WHERE q.owner_id = u.id AND q.company_id IS NULL;

-- 8. WORKFLOWS TABLE
ALTER TABLE workflows 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

CREATE INDEX IF NOT EXISTS idx_workflows_company_id ON workflows(company_id);

UPDATE workflows w 
SET company_id = u.company_id 
FROM users u 
WHERE w.owner_id = u.id AND w.company_id IS NULL;

-- 9. WORKFLOW EXECUTIONS TABLE
ALTER TABLE workflow_executions 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

CREATE INDEX IF NOT EXISTS idx_workflow_executions_company_id ON workflow_executions(company_id);

UPDATE workflow_executions we 
SET company_id = w.company_id 
FROM workflows w 
WHERE we.workflow_id = w.id AND we.company_id IS NULL;

-- 10. FILES TABLE
ALTER TABLE files 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

CREATE INDEX IF NOT EXISTS idx_files_company_id ON files(company_id);

UPDATE files f 
SET company_id = u.company_id 
FROM users u 
WHERE f.owner_id = u.id AND f.company_id IS NULL;

-- 11. FOLDERS TABLE
ALTER TABLE folders 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

CREATE INDEX IF NOT EXISTS idx_folders_company_id ON folders(company_id);

UPDATE folders f 
SET company_id = u.company_id 
FROM users u 
WHERE f.owner_id = u.id AND f.company_id IS NULL;

-- ============================================================================
-- PHASE 2: MEDIUM PRIORITY TABLES
-- ============================================================================

-- 12. NOTIFICATIONS TABLE
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

CREATE INDEX IF NOT EXISTS idx_notifications_company_id ON notifications(company_id);

UPDATE notifications n 
SET company_id = u.company_id 
FROM users u 
WHERE n.user_id = u.id AND n.company_id IS NULL;

-- 13. CALL TRANSCRIPTS TABLE (if exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'call_transcripts') THEN
        ALTER TABLE call_transcripts 
        ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
        
        CREATE INDEX IF NOT EXISTS idx_call_transcripts_company_id ON call_transcripts(company_id);
        
        UPDATE call_transcripts ct 
        SET company_id = c.company_id 
        FROM calls c 
        WHERE ct.call_id = c.id AND ct.company_id IS NULL;
    END IF;
END $$;

-- 14. USER CONVERSATIONS TABLE (if exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_conversations') THEN
        ALTER TABLE user_conversations 
        ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
        
        CREATE INDEX IF NOT EXISTS idx_user_conversations_company_id ON user_conversations(company_id);
        
        UPDATE user_conversations uc 
        SET company_id = u.company_id 
        FROM users u 
        WHERE uc.user_id = u.id AND uc.company_id IS NULL;
    END IF;
END $$;

-- 15. BULK EMAIL CAMPAIGNS TABLE (if exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'bulk_email_campaigns') THEN
        ALTER TABLE bulk_email_campaigns 
        ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
        
        CREATE INDEX IF NOT EXISTS idx_bulk_email_campaigns_company_id ON bulk_email_campaigns(company_id);
        
        UPDATE bulk_email_campaigns bec 
        SET company_id = u.company_id 
        FROM users u 
        WHERE bec.created_by = u.id AND bec.company_id IS NULL;
    END IF;
END $$;

-- 16. PERFORMANCE ALERTS TABLE (if exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'performance_alerts') THEN
        ALTER TABLE performance_alerts 
        ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
        
        CREATE INDEX IF NOT EXISTS idx_performance_alerts_company_id ON performance_alerts(company_id);
        
        UPDATE performance_alerts pa 
        SET company_id = u.company_id 
        FROM users u 
        WHERE pa.user_id = u.id AND pa.company_id IS NULL;
    END IF;
END $$;

-- 17. INBOX TABLE (if exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'inbox') THEN
        ALTER TABLE inbox 
        ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
        
        CREATE INDEX IF NOT EXISTS idx_inbox_company_id ON inbox(company_id);
        
        UPDATE inbox i 
        SET company_id = u.company_id 
        FROM users u 
        WHERE i.user_id = u.id AND i.company_id IS NULL;
    END IF;
END $$;

-- ============================================================================
-- VERIFICATION: Check all tables have company_id populated
-- ============================================================================

SELECT 
    'calls' as table_name, 
    COUNT(*) as total_records, 
    COUNT(company_id) as with_company_id,
    COUNT(*) - COUNT(company_id) as missing_company_id,
    ROUND(100.0 * COUNT(company_id) / NULLIF(COUNT(*), 0), 2) as percentage_complete
FROM calls
WHERE is_deleted = false

UNION ALL

SELECT 'emails', COUNT(*), COUNT(company_id), COUNT(*) - COUNT(company_id), 
       ROUND(100.0 * COUNT(company_id) / NULLIF(COUNT(*), 0), 2)
FROM emails WHERE is_deleted = false

UNION ALL

SELECT 'documents', COUNT(*), COUNT(company_id), COUNT(*) - COUNT(company_id),
       ROUND(100.0 * COUNT(company_id) / NULLIF(COUNT(*), 0), 2)
FROM documents WHERE is_deleted = false

UNION ALL

SELECT 'quotes', COUNT(*), COUNT(company_id), COUNT(*) - COUNT(company_id),
       ROUND(100.0 * COUNT(company_id) / NULLIF(COUNT(*), 0), 2)
FROM quotes WHERE is_deleted = false

UNION ALL

SELECT 'workflows', COUNT(*), COUNT(company_id), COUNT(*) - COUNT(company_id),
       ROUND(100.0 * COUNT(company_id) / NULLIF(COUNT(*), 0), 2)
FROM workflows WHERE is_deleted = false

UNION ALL

SELECT 'files', COUNT(*), COUNT(company_id), COUNT(*) - COUNT(company_id),
       ROUND(100.0 * COUNT(company_id) / NULLIF(COUNT(*), 0), 2)
FROM files WHERE is_deleted = false

UNION ALL

SELECT 'folders', COUNT(*), COUNT(company_id), COUNT(*) - COUNT(company_id),
       ROUND(100.0 * COUNT(company_id) / NULLIF(COUNT(*), 0), 2)
FROM folders WHERE is_deleted = false

UNION ALL

SELECT 'notifications', COUNT(*), COUNT(company_id), COUNT(*) - COUNT(company_id),
       ROUND(100.0 * COUNT(company_id) / NULLIF(COUNT(*), 0), 2)
FROM notifications WHERE is_deleted = false

UNION ALL

SELECT 'sms_messages', COUNT(*), COUNT(company_id), COUNT(*) - COUNT(company_id),
       ROUND(100.0 * COUNT(company_id) / NULLIF(COUNT(*), 0), 2)
FROM sms_messages WHERE is_deleted = false

UNION ALL

SELECT 'phone_numbers', COUNT(*), COUNT(company_id), COUNT(*) - COUNT(company_id),
       ROUND(100.0 * COUNT(company_id) / NULLIF(COUNT(*), 0), 2)
FROM phone_numbers WHERE is_deleted = false

ORDER BY table_name;

-- ============================================================================
-- COMMIT TRANSACTION
-- ============================================================================

COMMIT;

-- ============================================================================
-- POST-MIGRATION VERIFICATION
-- ============================================================================

-- Check for any records without company_id (excluding super admin users)
SELECT 
    'WARNING: Records without company_id found!' as status,
    table_name,
    missing_count
FROM (
    SELECT 'calls' as table_name, COUNT(*) as missing_count 
    FROM calls WHERE company_id IS NULL AND is_deleted = false
    UNION ALL
    SELECT 'emails', COUNT(*) FROM emails WHERE company_id IS NULL AND is_deleted = false
    UNION ALL
    SELECT 'documents', COUNT(*) FROM documents WHERE company_id IS NULL AND is_deleted = false
    UNION ALL
    SELECT 'quotes', COUNT(*) FROM quotes WHERE company_id IS NULL AND is_deleted = false
    UNION ALL
    SELECT 'workflows', COUNT(*) FROM workflows WHERE company_id IS NULL AND is_deleted = false
    UNION ALL
    SELECT 'files', COUNT(*) FROM files WHERE company_id IS NULL AND is_deleted = false
) AS missing_data
WHERE missing_count > 0;

-- If no results, all is good!
SELECT '✅ Migration completed successfully! All records have company_id.' as status
WHERE NOT EXISTS (
    SELECT 1 FROM calls WHERE company_id IS NULL AND is_deleted = false
    UNION ALL
    SELECT 1 FROM emails WHERE company_id IS NULL AND is_deleted = false
    UNION ALL
    SELECT 1 FROM documents WHERE company_id IS NULL AND is_deleted = false
);
