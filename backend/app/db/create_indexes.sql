-- Performance Indexes for Sunstone CRM
-- Run this after initial database setup for optimal performance

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_users_team_id ON users(team_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_users_role ON users(user_role) WHERE is_deleted = false;

-- Deals table indexes
CREATE INDEX IF NOT EXISTS idx_deals_owner_id ON deals(owner_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_deals_company_id ON deals(company_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_deals_status ON deals(status) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_deals_created_at ON deals(created_at) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_deals_stage_id ON deals(stage_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_deals_pipeline_id ON deals(pipeline_id) WHERE is_deleted = false;

-- Contacts table indexes
CREATE INDEX IF NOT EXISTS idx_contacts_owner_id ON contacts(owner_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_contacts_company_id ON contacts(company_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON contacts(created_at) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status) WHERE is_deleted = false;

-- Activities table indexes
CREATE INDEX IF NOT EXISTS idx_activities_owner_id ON activities(owner_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_activities_company_id ON activities(company_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(activity_type) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_activities_due_date ON activities(due_date) WHERE is_deleted = false;

-- Teams table indexes
CREATE INDEX IF NOT EXISTS idx_teams_company_id ON teams(company_id);
CREATE INDEX IF NOT EXISTS idx_teams_name ON teams(name);

-- Companies table indexes
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);
CREATE INDEX IF NOT EXISTS idx_companies_created_at ON companies(created_at);

-- Subscription plans indexes
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON subscription_plans(is_active);

-- Subscriptions indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_company_id ON subscriptions(company_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON subscriptions(plan_id);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_deals_company_owner ON deals(company_id, owner_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_contacts_company_owner ON contacts(company_id, owner_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_activities_company_owner ON activities(company_id, owner_id) WHERE is_deleted = false;

-- Full-text search indexes (PostgreSQL specific)
CREATE INDEX IF NOT EXISTS idx_contacts_search ON contacts USING gin(to_tsvector('english', coalesce(first_name, '') || ' ' || coalesce(last_name, '') || ' ' || coalesce(email, '') || ' ' || coalesce(company, ''))) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_deals_search ON deals USING gin(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))) WHERE is_deleted = false;

-- Analyze tables for query planner
ANALYZE users;
ANALYZE deals;
ANALYZE contacts;
ANALYZE activities;
ANALYZE teams;
ANALYZE companies;
ANALYZE subscriptions;
ANALYZE subscription_plans;
