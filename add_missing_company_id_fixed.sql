-- ============================================================
-- Add company_id to Missing Tables (FIXED)
-- ============================================================
-- This script adds company_id column to tables that need it
-- for proper multi-tenancy isolation
-- ============================================================

BEGIN;

\echo '=============================================='
\echo 'Adding company_id to Missing Tables'
\echo '=============================================='
\echo ''

-- ============================================================
-- 1. bulk_email_campaigns
-- ============================================================
\echo '1. Adding company_id to bulk_email_campaigns...'

-- Add column
ALTER TABLE bulk_email_campaigns 
ADD COLUMN IF NOT EXISTS company_id UUID;

-- Populate from user's company
UPDATE bulk_email_campaigns 
SET company_id = (SELECT company_id FROM users WHERE users.id = bulk_email_campaigns.user_id)
WHERE company_id IS NULL;

-- Add foreign key constraint
ALTER TABLE bulk_email_campaigns
DROP CONSTRAINT IF EXISTS fk_bulk_email_campaigns_company;

ALTER TABLE bulk_email_campaigns
ADD CONSTRAINT fk_bulk_email_campaigns_company 
FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

-- Create index
CREATE INDEX IF NOT EXISTS idx_bulk_email_campaigns_company_id 
ON bulk_email_campaigns(company_id);

\echo '   ✓ bulk_email_campaigns updated'

-- ============================================================
-- 2. user_conversations
-- ============================================================
\echo '2. Adding company_id to user_conversations...'

-- Add column
ALTER TABLE user_conversations 
ADD COLUMN IF NOT EXISTS company_id UUID;

-- Populate from user's company
UPDATE user_conversations 
SET company_id = (SELECT company_id FROM users WHERE users.id = user_conversations.user_id)
WHERE company_id IS NULL;

-- Add foreign key constraint
ALTER TABLE user_conversations
DROP CONSTRAINT IF EXISTS fk_user_conversations_company;

ALTER TABLE user_conversations
ADD CONSTRAINT fk_user_conversations_company 
FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

-- Create index
CREATE INDEX IF NOT EXISTS idx_user_conversations_company_id 
ON user_conversations(company_id);

\echo '   ✓ user_conversations updated'

-- ============================================================
-- 3. pipeline_stages
-- ============================================================
\echo '3. Adding company_id to pipeline_stages...'

-- Add column
ALTER TABLE pipeline_stages 
ADD COLUMN IF NOT EXISTS company_id UUID;

-- Populate from pipeline's company
UPDATE pipeline_stages 
SET company_id = (SELECT company_id FROM pipelines WHERE pipelines.id = pipeline_stages.pipeline_id)
WHERE company_id IS NULL;

-- Add foreign key constraint
ALTER TABLE pipeline_stages
DROP CONSTRAINT IF EXISTS fk_pipeline_stages_company;

ALTER TABLE pipeline_stages
ADD CONSTRAINT fk_pipeline_stages_company 
FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

-- Create index
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_company_id 
ON pipeline_stages(company_id);

\echo '   ✓ pipeline_stages updated'

-- ============================================================
-- 4. workflow_executions
-- ============================================================
\echo '4. Adding company_id to workflow_executions...'

-- Add column
ALTER TABLE workflow_executions 
ADD COLUMN IF NOT EXISTS company_id UUID;

-- Populate from workflow's company
UPDATE workflow_executions 
SET company_id = (SELECT company_id FROM workflows WHERE workflows.id = workflow_executions.workflow_id)
WHERE company_id IS NULL AND workflow_id IS NOT NULL;

-- Add foreign key constraint
ALTER TABLE workflow_executions
DROP CONSTRAINT IF EXISTS fk_workflow_executions_company;

ALTER TABLE workflow_executions
ADD CONSTRAINT fk_workflow_executions_company 
FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

-- Create index
CREATE INDEX IF NOT EXISTS idx_workflow_executions_company_id 
ON workflow_executions(company_id);

\echo '   ✓ workflow_executions updated'

COMMIT;

\echo ''
\echo '=============================================='
\echo '✅ All Critical Tables Updated!'
\echo '=============================================='
\echo ''

-- Verify the updates
\echo 'Verification:'
SELECT 
    'bulk_email_campaigns' as table_name,
    COUNT(*) as total_records,
    COUNT(company_id) as with_company_id,
    COUNT(*) - COUNT(company_id) as missing_company_id
FROM bulk_email_campaigns
UNION ALL
SELECT 
    'user_conversations',
    COUNT(*),
    COUNT(company_id),
    COUNT(*) - COUNT(company_id)
FROM user_conversations
UNION ALL
SELECT 
    'pipeline_stages',
    COUNT(*),
    COUNT(company_id),
    COUNT(*) - COUNT(company_id)
FROM pipeline_stages
UNION ALL
SELECT 
    'workflow_executions',
    COUNT(*),
    COUNT(company_id),
    COUNT(*) - COUNT(company_id)
FROM workflow_executions;

\echo ''
\echo '=============================================='
