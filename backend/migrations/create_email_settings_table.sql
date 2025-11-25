-- Create email_settings table
CREATE TABLE IF NOT EXISTS email_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
    
    -- SendGrid Configuration
    sendgrid_api_key VARCHAR(255),
    sendgrid_from_email VARCHAR(255),
    sendgrid_from_name VARCHAR(255),
    sendgrid_enabled BOOLEAN DEFAULT TRUE,
    
    -- Gmail OAuth Configuration
    gmail_client_id VARCHAR(255),
    gmail_client_secret VARCHAR(255),
    gmail_refresh_token TEXT,
    gmail_access_token TEXT,
    gmail_token_expires_at TIMESTAMP,
    gmail_email VARCHAR(255),
    gmail_enabled BOOLEAN DEFAULT FALSE,
    
    -- Gmail Sync Settings
    gmail_last_sync_at TIMESTAMP,
    gmail_sync_enabled BOOLEAN DEFAULT TRUE,
    gmail_sync_frequency VARCHAR(50) DEFAULT '5min',
    gmail_history_id VARCHAR(255),
    
    -- Email Signature
    email_signature TEXT,
    signature_enabled BOOLEAN DEFAULT FALSE,
    
    -- Tracking Settings
    open_tracking_enabled BOOLEAN DEFAULT TRUE,
    click_tracking_enabled BOOLEAN DEFAULT TRUE,
    
    -- Auto-Reply Settings
    auto_reply_enabled BOOLEAN DEFAULT FALSE,
    auto_reply_subject VARCHAR(500),
    auto_reply_body TEXT,
    
    -- Provider Priority
    default_provider VARCHAR(50) DEFAULT 'sendgrid',
    
    -- Metadata
    settings_data JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_email_settings_company_id ON email_settings(company_id);

-- Add comment
COMMENT ON TABLE email_settings IS 'Email integration settings for SendGrid and Gmail per company';
