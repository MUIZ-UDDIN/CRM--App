-- Add auto-reply settings to twilio_settings table
ALTER TABLE twilio_settings 
ADD COLUMN IF NOT EXISTS auto_reply_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS auto_reply_message VARCHAR(500) DEFAULT 'Thank you for your message. We''ll get back to you soon!';

-- Update existing records to have default auto-reply message
UPDATE twilio_settings 
SET auto_reply_message = 'Thank you for your message. We''ll get back to you soon!'
WHERE auto_reply_message IS NULL;
