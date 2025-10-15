-- Sales CRM Database Schema
-- PostgreSQL 14+ with advanced analytics support

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For better text search

-- ============================================
-- 1. USERS & AUTHENTICATION
-- ============================================

-- Roles and permissions
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB NOT NULL DEFAULT '{}', -- Flexible permissions storage
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    avatar_url TEXT,
    role_id UUID REFERENCES roles(id),
    team_id UUID, -- Self-reference for teams
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP WITH TIME ZONE,
    email_verified BOOLEAN DEFAULT FALSE,
    preferences JSONB DEFAULT '{}', -- User preferences
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Teams table
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    leader_id UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key for users.team_id
ALTER TABLE users ADD CONSTRAINT fk_users_team_id FOREIGN KEY (team_id) REFERENCES teams(id);

-- ============================================
-- 2. PIPELINE & DEALS
-- ============================================

-- Pipelines
CREATE TABLE pipelines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    owner_id UUID REFERENCES users(id),
    team_id UUID REFERENCES teams(id),
    currency VARCHAR(3) DEFAULT 'USD',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pipeline stages
CREATE TABLE pipeline_stages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pipeline_id UUID REFERENCES pipelines(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    stage_order INTEGER NOT NULL,
    probability DECIMAL(5,2) DEFAULT 0, -- Win probability (0-100%)
    color VARCHAR(7) DEFAULT '#6B7280', -- Hex color
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(pipeline_id, stage_order)
);

-- ============================================
-- 3. CONTACTS & LEADS
-- ============================================

-- Contact sources
CREATE TABLE contact_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#6B7280',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Organizations/Companies
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    website VARCHAR(255),
    industry VARCHAR(100),
    size_category VARCHAR(50), -- startup, small, medium, large, enterprise
    annual_revenue DECIMAL(15,2),
    phone VARCHAR(20),
    address JSONB, -- Flexible address storage
    social_profiles JSONB DEFAULT '{}', -- LinkedIn, Twitter, etc.
    custom_fields JSONB DEFAULT '{}',
    owner_id UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contacts table
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    job_title VARCHAR(100),
    organization_id UUID REFERENCES organizations(id),
    source_id UUID REFERENCES contact_sources(id),
    owner_id UUID REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'active', -- active, inactive, unqualified
    lead_score INTEGER DEFAULT 0, -- AI-generated lead score (0-100)
    tags TEXT[], -- Array of tags
    custom_fields JSONB DEFAULT '{}',
    social_profiles JSONB DEFAULT '{}',
    preferences JSONB DEFAULT '{}', -- Communication preferences
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 4. DEALS
-- ============================================

-- Deals table
CREATE TABLE deals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    value DECIMAL(12,2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    pipeline_id UUID REFERENCES pipelines(id),
    stage_id UUID REFERENCES pipeline_stages(id),
    contact_id UUID REFERENCES contacts(id),
    organization_id UUID REFERENCES organizations(id),
    owner_id UUID REFERENCES users(id),
    probability DECIMAL(5,2) DEFAULT 0, -- Override stage probability
    expected_close_date DATE,
    actual_close_date DATE,
    status VARCHAR(20) DEFAULT 'open', -- open, won, lost, deleted
    source VARCHAR(100),
    tags TEXT[],
    custom_fields JSONB DEFAULT '{}',
    stage_history JSONB DEFAULT '[]', -- Track stage movements
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 5. ACTIVITIES
-- ============================================

-- Activity types
CREATE TABLE activity_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    icon VARCHAR(50),
    color VARCHAR(7) DEFAULT '#6B7280',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activities
CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type_id UUID REFERENCES activity_types(id),
    subject VARCHAR(255) NOT NULL,
    description TEXT,
    due_date TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    contact_id UUID REFERENCES contacts(id),
    deal_id UUID REFERENCES deals(id),
    organization_id UUID REFERENCES organizations(id),
    assigned_to_id UUID REFERENCES users(id),
    created_by_id UUID REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'scheduled', -- scheduled, completed, cancelled
    priority VARCHAR(10) DEFAULT 'medium', -- low, medium, high
    location VARCHAR(255),
    participants JSONB DEFAULT '[]', -- Array of participant IDs
    attachments JSONB DEFAULT '[]',
    custom_fields JSONB DEFAULT '{}',
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 6. COMMUNICATIONS
-- ============================================

-- Email templates
CREATE TABLE email_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    template_type VARCHAR(50), -- welcome, follow_up, proposal, etc.
    variables JSONB DEFAULT '{}', -- Available template variables
    owner_id UUID REFERENCES users(id),
    is_shared BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Emails
CREATE TABLE emails (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id VARCHAR(255) UNIQUE, -- External email ID
    thread_id VARCHAR(255),
    subject VARCHAR(255),
    body_text TEXT,
    body_html TEXT,
    from_email VARCHAR(255) NOT NULL,
    to_emails TEXT[] NOT NULL,
    cc_emails TEXT[],
    bcc_emails TEXT[],
    contact_id UUID REFERENCES contacts(id),
    deal_id UUID REFERENCES deals(id),
    template_id UUID REFERENCES email_templates(id),
    sent_by_id UUID REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'sent', -- sent, delivered, opened, clicked, bounced
    direction VARCHAR(10) NOT NULL, -- inbound, outbound
    opened_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    attachments JSONB DEFAULT '[]',
    tracking_data JSONB DEFAULT '{}',
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Phone calls
CREATE TABLE calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id VARCHAR(255), -- Twilio/provider ID
    contact_id UUID REFERENCES contacts(id),
    deal_id UUID REFERENCES deals(id),
    user_id UUID REFERENCES users(id),
    direction VARCHAR(10) NOT NULL, -- inbound, outbound
    phone_number VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'completed', -- completed, missed, busy, failed
    duration_seconds INTEGER DEFAULT 0,
    recording_url TEXT,
    notes TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 7. DOCUMENTS & FILES
-- ============================================

-- Documents
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    document_type VARCHAR(50), -- contract, proposal, invoice, etc.
    contact_id UUID REFERENCES contacts(id),
    deal_id UUID REFERENCES deals(id),
    uploaded_by_id UUID REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'active', -- active, signed, cancelled
    signature_status VARCHAR(20) DEFAULT 'pending', -- pending, signed, expired
    signed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 8. WORKFLOWS & AUTOMATION
-- ============================================

-- Workflows
CREATE TABLE workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    trigger_type VARCHAR(50) NOT NULL, -- deal_stage_change, contact_created, etc.
    trigger_conditions JSONB NOT NULL DEFAULT '{}',
    actions JSONB NOT NULL DEFAULT '[]', -- Array of actions to perform
    is_active BOOLEAN DEFAULT TRUE,
    owner_id UUID REFERENCES users(id),
    execution_count INTEGER DEFAULT 0,
    last_executed TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workflow executions log
CREATE TABLE workflow_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID REFERENCES workflows(id),
    trigger_data JSONB,
    status VARCHAR(20) DEFAULT 'success', -- success, failed, pending
    error_message TEXT,
    execution_time_ms INTEGER,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 9. ANALYTICS & METRICS TABLES
-- ============================================

-- Pipeline metrics (materialized for performance)
CREATE TABLE pipeline_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pipeline_id UUID REFERENCES pipelines(id),
    stage_id UUID REFERENCES pipeline_stages(id),
    metric_date DATE NOT NULL,
    deal_count INTEGER DEFAULT 0,
    total_value DECIMAL(15,2) DEFAULT 0,
    avg_duration_days DECIMAL(8,2) DEFAULT 0,
    conversion_rate DECIMAL(5,2) DEFAULT 0,
    deals_won INTEGER DEFAULT 0,
    deals_lost INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(pipeline_id, stage_id, metric_date)
);

-- Activity metrics
CREATE TABLE activity_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    team_id UUID REFERENCES teams(id),
    metric_date DATE NOT NULL,
    activity_type VARCHAR(50),
    total_count INTEGER DEFAULT 0,
    completed_count INTEGER DEFAULT 0,
    overdue_count INTEGER DEFAULT 0,
    avg_completion_time_hours DECIMAL(8,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, team_id, metric_date, activity_type)
);

-- Email metrics
CREATE TABLE email_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    template_id UUID REFERENCES email_templates(id),
    metric_date DATE NOT NULL,
    sent_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    opened_count INTEGER DEFAULT 0,
    clicked_count INTEGER DEFAULT 0,
    bounced_count INTEGER DEFAULT 0,
    reply_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Call metrics
CREATE TABLE call_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    metric_date DATE NOT NULL,
    total_calls INTEGER DEFAULT 0,
    answered_calls INTEGER DEFAULT 0,
    missed_calls INTEGER DEFAULT 0,
    avg_duration_seconds DECIMAL(8,2) DEFAULT 0,
    total_duration_seconds BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, metric_date)
);

-- ============================================
-- 10. AUDIT & SECURITY
-- ============================================

-- Audit logs
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(50),
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API keys for integrations
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    key_hash VARCHAR(255) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id),
    permissions JSONB DEFAULT '{}',
    last_used TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_team_id ON users(team_id);
CREATE INDEX idx_users_role_id ON users(role_id);

-- Contacts
CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_organization_id ON contacts(organization_id);
CREATE INDEX idx_contacts_owner_id ON contacts(owner_id);
CREATE INDEX idx_contacts_source_id ON contacts(source_id);
CREATE INDEX idx_contacts_lead_score ON contacts(lead_score DESC);
CREATE INDEX idx_contacts_created_at ON contacts(created_at DESC);

-- Deals
CREATE INDEX idx_deals_pipeline_id ON deals(pipeline_id);
CREATE INDEX idx_deals_stage_id ON deals(stage_id);
CREATE INDEX idx_deals_contact_id ON deals(contact_id);
CREATE INDEX idx_deals_owner_id ON deals(owner_id);
CREATE INDEX idx_deals_status ON deals(status);
CREATE INDEX idx_deals_value ON deals(value DESC);
CREATE INDEX idx_deals_expected_close_date ON deals(expected_close_date);
CREATE INDEX idx_deals_created_at ON deals(created_at DESC);

-- Activities
CREATE INDEX idx_activities_contact_id ON activities(contact_id);
CREATE INDEX idx_activities_deal_id ON activities(deal_id);
CREATE INDEX idx_activities_assigned_to_id ON activities(assigned_to_id);
CREATE INDEX idx_activities_due_date ON activities(due_date);
CREATE INDEX idx_activities_status ON activities(status);
CREATE INDEX idx_activities_type_id ON activities(type_id);

-- Communications
CREATE INDEX idx_emails_contact_id ON emails(contact_id);
CREATE INDEX idx_emails_deal_id ON emails(deal_id);
CREATE INDEX idx_emails_sent_by_id ON emails(sent_by_id);
CREATE INDEX idx_emails_sent_at ON emails(sent_at DESC);
CREATE INDEX idx_calls_contact_id ON calls(contact_id);
CREATE INDEX idx_calls_user_id ON calls(user_id);
CREATE INDEX idx_calls_started_at ON calls(started_at DESC);

-- Analytics
CREATE INDEX idx_pipeline_metrics_date ON pipeline_metrics(metric_date DESC);
CREATE INDEX idx_pipeline_metrics_pipeline_stage ON pipeline_metrics(pipeline_id, stage_id);
CREATE INDEX idx_activity_metrics_date ON activity_metrics(metric_date DESC);
CREATE INDEX idx_activity_metrics_user ON activity_metrics(user_id, metric_date DESC);

-- Full-text search
CREATE INDEX idx_contacts_fulltext ON contacts USING gin((first_name || ' ' || last_name || ' ' || email) gin_trgm_ops);
CREATE INDEX idx_deals_fulltext ON deals USING gin((title || ' ' || description) gin_trgm_ops);
CREATE INDEX idx_organizations_fulltext ON organizations USING gin(name gin_trgm_ops);

-- ============================================
-- DEFAULT DATA
-- ============================================

-- Insert default roles
INSERT INTO roles (name, description, permissions) VALUES 
('Admin', 'Full system access', '{"all": true}'),
('Sales Manager', 'Manage team and view all data', '{"manage_team": true, "view_all_data": true, "export_data": true}'),
('Sales Rep', 'Manage own contacts and deals', '{"manage_own_data": true, "create_deals": true, "view_team_data": false}'),
('Viewer', 'Read-only access', '{"view_own_data": true}');

-- Insert default activity types
INSERT INTO activity_types (name, icon, color) VALUES 
('Call', 'phone', '#10B981'),
('Meeting', 'calendar', '#3B82F6'),
('Email', 'mail', '#8B5CF6'),
('Task', 'check-circle', '#F59E0B'),
('Note', 'document-text', '#6B7280'),
('Lunch', 'coffee', '#EF4444'),
('Demo', 'presentation-chart-bar', '#06B6D4');

-- Insert default contact sources
INSERT INTO contact_sources (name, description, color) VALUES 
('Website', 'Organic website visitors', '#10B981'),
('Google Ads', 'Paid search campaigns', '#3B82F6'),
('Social Media', 'Social media channels', '#8B5CF6'),
('Email Campaign', 'Email marketing campaigns', '#F59E0B'),
('Referral', 'Customer referrals', '#EF4444'),
('Cold Outreach', 'Cold emails and calls', '#6B7280'),
('Trade Show', 'Industry events', '#06B6D4'),
('Partner', 'Partner referrals', '#84CC16');

-- ============================================
-- TRIGGERS FOR AUTO-UPDATING
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pipelines_updated_at BEFORE UPDATE ON pipelines FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pipeline_stages_updated_at BEFORE UPDATE ON pipeline_stages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_deals_updated_at BEFORE UPDATE ON deals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_activities_updated_at BEFORE UPDATE ON activities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON email_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON workflows FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();