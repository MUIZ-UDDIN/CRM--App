-- Migration: Add Workflow Templates tables
-- Date: 2025-11-15

-- Workflow Templates Table
CREATE TABLE IF NOT EXISTS workflow_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    trigger_type VARCHAR(50) NOT NULL,
    trigger_config JSONB,
    actions JSONB NOT NULL,
    conditions JSONB,
    is_global BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    usage_count INTEGER DEFAULT 0,
    tags JSONB,
    created_by_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_workflow_templates_category ON workflow_templates(category);
CREATE INDEX idx_workflow_templates_global ON workflow_templates(is_global);
CREATE INDEX idx_workflow_templates_company ON workflow_templates(company_id);
CREATE INDEX idx_workflow_templates_active ON workflow_templates(is_active);

-- Template Usage Tracking
CREATE TABLE IF NOT EXISTS template_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES workflow_templates(id) ON DELETE CASCADE,
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    created_by_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_template_usage_template ON template_usage(template_id);
CREATE INDEX idx_template_usage_workflow ON template_usage(workflow_id);
CREATE INDEX idx_template_usage_company ON template_usage(company_id);

-- Add comments
COMMENT ON TABLE workflow_templates IS 'Global and company-specific workflow templates';
COMMENT ON TABLE template_usage IS 'Track which workflows were created from templates';
