-- Migration: Add conversation persistence and analytics tables
-- This enables phone-number-persistent conversations and detailed analytics

-- 1. User Conversations Table (Phone-Number-Persistent)
CREATE TABLE IF NOT EXISTS user_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    to_number VARCHAR(20) NOT NULL,
    from_twilio_number VARCHAR(20) NOT NULL,
    conversation_status VARCHAR(20) DEFAULT 'active',
    last_message_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    UNIQUE(to_number, user_id)
);

-- 2. Message Analytics Table
CREATE TABLE IF NOT EXISTS message_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES user_conversations(id) ON DELETE CASCADE,
    message_id UUID REFERENCES sms_messages(id) ON DELETE CASCADE,
    from_twilio_number VARCHAR(20),
    to_number VARCHAR(20),
    response_time INT, -- in seconds
    delivered BOOLEAN DEFAULT FALSE,
    responded BOOLEAN DEFAULT FALSE,
    opened BOOLEAN DEFAULT FALSE,
    clicked BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Call Transcripts Table
CREATE TABLE IF NOT EXISTS call_transcripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_sid VARCHAR(50) UNIQUE NOT NULL,
    conversation_id UUID REFERENCES user_conversations(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    duration INT, -- in seconds
    transcript_text TEXT,
    recording_url VARCHAR(500),
    transcription_status VARCHAR(20) DEFAULT 'pending',
    timestamp TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. Bulk Email Campaigns Table (separate from regular email_campaigns)
CREATE TABLE IF NOT EXISTS bulk_email_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    campaign_name VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    html_body TEXT,
    ip_pool VARCHAR(50),
    scheduled_at TIMESTAMP,
    sent_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'draft', -- draft, scheduled, sending, sent, failed
    total_recipients INT DEFAULT 0,
    total_sent INT DEFAULT 0,
    total_delivered INT DEFAULT 0,
    total_opened INT DEFAULT 0,
    total_clicked INT DEFAULT 0,
    total_bounced INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE
);

-- 5. Bulk Email Analytics Table
CREATE TABLE IF NOT EXISTS bulk_email_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES bulk_email_campaigns(id) ON DELETE CASCADE,
    recipient_email VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(255),
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    opened_at TIMESTAMP,
    clicked_at TIMESTAMP,
    bounced_at TIMESTAMP,
    bounce_reason TEXT,
    opened BOOLEAN DEFAULT FALSE,
    clicked BOOLEAN DEFAULT FALSE,
    bounced BOOLEAN DEFAULT FALSE,
    unsubscribed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 6. Performance Alerts Table
CREATE TABLE IF NOT EXISTS performance_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL, -- low_response_rate, high_bounce_rate, etc.
    severity VARCHAR(20) DEFAULT 'medium', -- low, medium, high, critical
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    metric_value DECIMAL(10, 2),
    threshold_value DECIMAL(10, 2),
    related_entity_type VARCHAR(50), -- phone_number, campaign, conversation
    related_entity_id UUID,
    is_read BOOLEAN DEFAULT FALSE,
    is_resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP
);

-- 7. Number Performance Stats Table
CREATE TABLE IF NOT EXISTS number_performance_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number_id UUID REFERENCES phone_numbers(id) ON DELETE CASCADE,
    twilio_number VARCHAR(20) NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_sent INT DEFAULT 0,
    total_delivered INT DEFAULT 0,
    total_received INT DEFAULT 0,
    total_responded INT DEFAULT 0,
    avg_response_time INT, -- in seconds
    delivery_rate DECIMAL(5, 2), -- percentage
    response_rate DECIMAL(5, 2), -- percentage
    engagement_score DECIMAL(5, 2), -- calculated score
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(phone_number_id, date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_conversations_user_id ON user_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_conversations_to_number ON user_conversations(to_number);
CREATE INDEX IF NOT EXISTS idx_user_conversations_from_number ON user_conversations(from_twilio_number);
CREATE INDEX IF NOT EXISTS idx_message_analytics_conversation_id ON message_analytics(conversation_id);
CREATE INDEX IF NOT EXISTS idx_message_analytics_timestamp ON message_analytics(timestamp);
CREATE INDEX IF NOT EXISTS idx_call_transcripts_conversation_id ON call_transcripts(conversation_id);
CREATE INDEX IF NOT EXISTS idx_call_transcripts_call_sid ON call_transcripts(call_sid);
CREATE INDEX IF NOT EXISTS idx_bulk_email_campaigns_user_id ON bulk_email_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_bulk_email_campaigns_status ON bulk_email_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_bulk_email_analytics_campaign_id ON bulk_email_analytics(campaign_id);
CREATE INDEX IF NOT EXISTS idx_performance_alerts_user_id ON performance_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_performance_alerts_is_read ON performance_alerts(is_read);
CREATE INDEX IF NOT EXISTS idx_number_performance_stats_phone_number_id ON number_performance_stats(phone_number_id);
CREATE INDEX IF NOT EXISTS idx_number_performance_stats_date ON number_performance_stats(date);

-- Add comments for documentation
COMMENT ON TABLE user_conversations IS 'Stores phone-number-persistent conversations - each recipient always uses the same Twilio number';
COMMENT ON TABLE message_analytics IS 'Detailed analytics for each message including response times and engagement';
COMMENT ON TABLE call_transcripts IS 'Stores transcriptions for calls longer than 1 minute';
COMMENT ON TABLE bulk_email_campaigns IS 'Bulk email campaigns with SendGrid integration and IP rotation';
COMMENT ON TABLE bulk_email_analytics IS 'Per-recipient email analytics including opens, clicks, bounces';
COMMENT ON TABLE performance_alerts IS 'Automated alerts for underperforming numbers or campaigns';
COMMENT ON TABLE number_performance_stats IS 'Daily performance statistics per phone number';

-- Update phone_numbers table to add last_used_at if not exists
ALTER TABLE phone_numbers ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMP;
ALTER TABLE phone_numbers ADD COLUMN IF NOT EXISTS rotation_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE phone_numbers ADD COLUMN IF NOT EXISTS rotation_priority INT DEFAULT 0;

COMMENT ON COLUMN phone_numbers.last_used_at IS 'Timestamp when this number was last used for outbound - used for rotation';
COMMENT ON COLUMN phone_numbers.rotation_enabled IS 'Whether this number is included in rotation pool';
COMMENT ON COLUMN phone_numbers.rotation_priority IS 'Priority for rotation (higher = used more often)';
