-- Migration: Add Global Defaults Tables for Super Admin
-- Description: Adds tables for global pipeline defaults, custom field defaults, and integration templates
-- Date: 2025-11-18

-- ============================================
-- Global Pipeline Defaults Table
-- ============================================
CREATE TABLE IF NOT EXISTS global_pipeline_defaults (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    stages JSONB NOT NULL DEFAULT '[]',
    is_active BOOLEAN DEFAULT TRUE,
    apply_to_new_companies BOOLEAN DEFAULT TRUE,
    created_by_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes for global_pipeline_defaults
CREATE INDEX IF NOT EXISTS idx_global_pipeline_defaults_active 
    ON global_pipeline_defaults(is_active);
CREATE INDEX IF NOT EXISTS idx_global_pipeline_defaults_auto_apply 
    ON global_pipeline_defaults(apply_to_new_companies);

-- ============================================
-- Global Field Defaults Table
-- ============================================
CREATE TABLE IF NOT EXISTS global_field_defaults (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    field_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    is_required BOOLEAN DEFAULT FALSE,
    default_value TEXT,
    options JSONB,
    placeholder VARCHAR(255),
    help_text TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    apply_to_new_companies BOOLEAN DEFAULT TRUE,
    created_by_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes for global_field_defaults
CREATE INDEX IF NOT EXISTS idx_global_field_defaults_active 
    ON global_field_defaults(is_active);
CREATE INDEX IF NOT EXISTS idx_global_field_defaults_entity 
    ON global_field_defaults(entity_type);
CREATE INDEX IF NOT EXISTS idx_global_field_defaults_auto_apply 
    ON global_field_defaults(apply_to_new_companies);

-- ============================================
-- Global Integration Templates Table
-- ============================================
CREATE TABLE IF NOT EXISTS global_integration_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    provider VARCHAR(100) NOT NULL,
    integration_type VARCHAR(50) NOT NULL,
    config_template JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    apply_to_new_companies BOOLEAN DEFAULT FALSE,
    created_by_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes for global_integration_templates
CREATE INDEX IF NOT EXISTS idx_global_integration_templates_active 
    ON global_integration_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_global_integration_templates_type 
    ON global_integration_templates(integration_type);
CREATE INDEX IF NOT EXISTS idx_global_integration_templates_provider 
    ON global_integration_templates(provider);
CREATE INDEX IF NOT EXISTS idx_global_integration_templates_auto_apply 
    ON global_integration_templates(apply_to_new_companies);

-- ============================================
-- Comments for Documentation
-- ============================================
COMMENT ON TABLE global_pipeline_defaults IS 'Global pipeline templates that Super Admin can create and apply to companies';
COMMENT ON TABLE global_field_defaults IS 'Global custom field templates that Super Admin can create and apply to companies';
COMMENT ON TABLE global_integration_templates IS 'Global integration templates that Super Admin can create and apply to companies';

COMMENT ON COLUMN global_pipeline_defaults.stages IS 'JSON array of stage configurations with name, probability, and color';
COMMENT ON COLUMN global_pipeline_defaults.apply_to_new_companies IS 'If true, automatically apply to newly created companies';
COMMENT ON COLUMN global_field_defaults.apply_to_new_companies IS 'If true, automatically apply to newly created companies';
COMMENT ON COLUMN global_integration_templates.apply_to_new_companies IS 'If true, automatically apply to newly created companies';

-- ============================================
-- Grant Permissions (if using role-based DB access)
-- ============================================
-- GRANT SELECT, INSERT, UPDATE, DELETE ON global_pipeline_defaults TO crm_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON global_field_defaults TO crm_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON global_integration_templates TO crm_app_user;

-- ============================================
-- Sample Data (Optional - for testing)
-- ============================================
-- Uncomment to insert sample global defaults

-- Sample Global Pipeline Default
-- INSERT INTO global_pipeline_defaults (name, description, stages, created_by_id)
-- VALUES (
--     'Standard Sales Pipeline',
--     'Default sales pipeline for new companies',
--     '[
--         {"name": "Lead", "probability": 10, "color": "#3B82F6"},
--         {"name": "Qualified", "probability": 25, "color": "#8B5CF6"},
--         {"name": "Proposal", "probability": 50, "color": "#F59E0B"},
--         {"name": "Negotiation", "probability": 75, "color": "#10B981"},
--         {"name": "Closed Won", "probability": 100, "color": "#22C55E"}
--     ]'::jsonb,
--     (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1)
-- );

-- Sample Global Field Defaults
-- INSERT INTO global_field_defaults (name, field_type, entity_type, is_required, created_by_id)
-- VALUES 
--     ('Industry', 'dropdown', 'contact', false, (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1)),
--     ('Company Size', 'dropdown', 'contact', false, (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1)),
--     ('Lead Source', 'dropdown', 'deal', true, (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1));

COMMIT;
