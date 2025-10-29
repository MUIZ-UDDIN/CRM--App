-- Add SendGrid columns to twilio_settings table
-- Migration: Add email functionality support

-- Add sendgrid_api_key column
ALTER TABLE twilio_settings 
ADD COLUMN IF NOT EXISTS sendgrid_api_key VARCHAR(255);

-- Add sendgrid_from_email column
ALTER TABLE twilio_settings 
ADD COLUMN IF NOT EXISTS sendgrid_from_email VARCHAR(255);

-- Add email_enabled column if it doesn't exist
ALTER TABLE twilio_settings 
ADD COLUMN IF NOT EXISTS email_enabled BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN twilio_settings.sendgrid_api_key IS 'SendGrid API key for sending emails via Twilio SendGrid';
COMMENT ON COLUMN twilio_settings.sendgrid_from_email IS 'Verified sender email address for SendGrid';
COMMENT ON COLUMN twilio_settings.email_enabled IS 'Enable/disable email functionality';
