-- Multi-Tenant SaaS Migration
-- Add companies table and update users table for multi-tenancy

-- Create enum types
CREATE TYPE plan_type AS ENUM ('free', 'pro', 'enterprise');
CREATE TYPE company_status AS ENUM ('active', 'suspended', 'pending');
CREATE TYPE user_role AS ENUM ('super_admin', 'company_admin', 'company_user');
CREATE TYPE user_status AS ENUM ('active', 'suspended', 'pending');

-- Create companies table
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    plan plan_type DEFAULT 'free' NOT NULL,
    status company_status DEFAULT 'active' NOT NULL,
    
    -- Company settings
    domain VARCHAR(255) UNIQUE,
    logo_url VARCHAR(500),
    timezone VARCHAR(50) DEFAULT 'UTC',
    currency VARCHAR(10) DEFAULT 'USD',
    
    -- Billing
    stripe_customer_id VARCHAR(255),
    subscription_ends_at VARCHAR(255),
    
    -- Company-level integrations
    twilio_account_sid VARCHAR(255),
    twilio_auth_token VARCHAR(255),
    sendgrid_api_key VARCHAR(255),
    
    -- Metadata
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add multi-tenant columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id),
ADD COLUMN IF NOT EXISTS user_role user_role DEFAULT 'company_user' NOT NULL,
ADD COLUMN IF NOT EXISTS status user_status DEFAULT 'active' NOT NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_user_role ON users(user_role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);
CREATE INDEX IF NOT EXISTS idx_companies_domain ON companies(domain);

-- Add company_id to all tenant-scoped tables
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE deals ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE activities ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE emails ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE sms_messages ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE calls ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE files ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE folders ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE phone_numbers ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

-- Create indexes for tenant isolation
CREATE INDEX IF NOT EXISTS idx_contacts_company_id ON contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_deals_company_id ON deals(company_id);
CREATE INDEX IF NOT EXISTS idx_activities_company_id ON activities(company_id);
CREATE INDEX IF NOT EXISTS idx_emails_company_id ON emails(company_id);
CREATE INDEX IF NOT EXISTS idx_sms_messages_company_id ON sms_messages(company_id);
CREATE INDEX IF NOT EXISTS idx_calls_company_id ON calls(company_id);
CREATE INDEX IF NOT EXISTS idx_documents_company_id ON documents(company_id);
CREATE INDEX IF NOT EXISTS idx_workflows_company_id ON workflows(company_id);
CREATE INDEX IF NOT EXISTS idx_files_company_id ON files(company_id);
CREATE INDEX IF NOT EXISTS idx_folders_company_id ON folders(company_id);
CREATE INDEX IF NOT EXISTS idx_quotes_company_id ON quotes(company_id);
CREATE INDEX IF NOT EXISTS idx_phone_numbers_company_id ON phone_numbers(company_id);

-- Create a default company for existing data (migration safety)
DO $$
DECLARE
    default_company_id UUID;
BEGIN
    -- Create default company if no companies exist
    IF NOT EXISTS (SELECT 1 FROM companies LIMIT 1) THEN
        INSERT INTO companies (name, plan, status)
        VALUES ('Default Company', 'pro', 'active')
        RETURNING id INTO default_company_id;
        
        -- Assign all existing users to default company
        UPDATE users SET company_id = default_company_id WHERE company_id IS NULL;
        
        -- Assign all existing records to default company
        UPDATE contacts SET company_id = default_company_id WHERE company_id IS NULL;
        UPDATE deals SET company_id = default_company_id WHERE company_id IS NULL;
        UPDATE activities SET company_id = default_company_id WHERE company_id IS NULL;
        UPDATE emails SET company_id = default_company_id WHERE company_id IS NULL;
        UPDATE sms_messages SET company_id = default_company_id WHERE company_id IS NULL;
        UPDATE calls SET company_id = default_company_id WHERE company_id IS NULL;
        UPDATE documents SET company_id = default_company_id WHERE company_id IS NULL;
        UPDATE workflows SET company_id = default_company_id WHERE company_id IS NULL;
        UPDATE files SET company_id = default_company_id WHERE company_id IS NULL;
        UPDATE folders SET company_id = default_company_id WHERE company_id IS NULL;
        UPDATE quotes SET company_id = default_company_id WHERE company_id IS NULL;
        UPDATE phone_numbers SET company_id = default_company_id WHERE company_id IS NULL;
        
        RAISE NOTICE 'Created default company and migrated existing data';
    END IF;
END $$;

-- Add comments for documentation
COMMENT ON TABLE companies IS 'Multi-tenant companies/organizations';
COMMENT ON COLUMN users.company_id IS 'NULL for super_admin, otherwise references company';
COMMENT ON COLUMN users.user_role IS 'RBAC role: super_admin, company_admin, or company_user';
COMMENT ON COLUMN users.status IS 'User account status';
