-- Add Twilio enhancements: SMS templates, phone number rotation, AI responses

-- Add is_auto_response to sms_messages
ALTER TABLE sms_messages 
ADD COLUMN IF NOT EXISTS is_auto_response BOOLEAN DEFAULT FALSE;

-- Create sms_templates table
CREATE TABLE IF NOT EXISTS sms_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    body TEXT NOT NULL,
    is_static BOOLEAN DEFAULT TRUE,
    variables TEXT,
    use_ai_enhancement BOOLEAN DEFAULT FALSE,
    ai_tone VARCHAR(50) DEFAULT 'professional',
    usage_count INTEGER DEFAULT 0,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sms_templates_user_id ON sms_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_sms_templates_category ON sms_templates(category);

-- Create phone_numbers table
CREATE TABLE IF NOT EXISTS phone_numbers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number VARCHAR(20) NOT NULL,
    friendly_name VARCHAR(255),
    twilio_sid VARCHAR(100),
    sms_enabled BOOLEAN DEFAULT TRUE,
    voice_enabled BOOLEAN DEFAULT TRUE,
    mms_enabled BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    rotation_enabled BOOLEAN DEFAULT FALSE,
    rotation_priority INTEGER DEFAULT 0,
    total_messages_sent INTEGER DEFAULT 0,
    total_messages_received INTEGER DEFAULT 0,
    last_used_at TIMESTAMP,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    twilio_settings_id UUID REFERENCES twilio_settings(id) ON DELETE SET NULL,
    assigned_to_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_phone_numbers_user_id ON phone_numbers(user_id);
CREATE INDEX IF NOT EXISTS idx_phone_numbers_phone ON phone_numbers(phone_number);
CREATE INDEX IF NOT EXISTS idx_phone_numbers_rotation ON phone_numbers(rotation_enabled) WHERE rotation_enabled = TRUE;

-- Add some default templates for demo
INSERT INTO sms_templates (name, category, body, is_static, user_id)
SELECT 
    'Welcome Message',
    'greeting',
    'Hi {contact_name}! Thanks for reaching out. How can we help you today?',
    FALSE,
    id
FROM users
WHERE role = 'super_admin'
ON CONFLICT DO NOTHING;

INSERT INTO sms_templates (name, category, body, is_static, user_id)
SELECT 
    'Follow Up',
    'follow_up',
    'Hi! Just following up on our previous conversation. Do you have any questions?',
    TRUE,
    id
FROM users
WHERE role = 'super_admin'
ON CONFLICT DO NOTHING;

-- Verify tables created
SELECT 
    'sms_templates' as table_name,
    COUNT(*) as row_count
FROM sms_templates
UNION ALL
SELECT 
    'phone_numbers' as table_name,
    COUNT(*) as row_count
FROM phone_numbers;
