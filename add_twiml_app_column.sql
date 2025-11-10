-- Add twiml_app_sid column to twilio_settings table
-- This allows each company to have their own TwiML App for isolated calling

-- Add the column
ALTER TABLE twilio_settings 
ADD COLUMN IF NOT EXISTS twiml_app_sid VARCHAR(255);

-- Add comment
COMMENT ON COLUMN twilio_settings.twiml_app_sid IS 'TwiML App SID for this company''s Device SDK calls';

-- Verify the change
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'twilio_settings' 
AND column_name = 'twiml_app_sid';
