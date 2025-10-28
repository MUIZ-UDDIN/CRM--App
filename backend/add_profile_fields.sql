-- Add location and bio fields to users table
-- Run this on your PostgreSQL database

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS location VARCHAR(100),
ADD COLUMN IF NOT EXISTS bio VARCHAR(500);

-- Update existing users to have empty strings instead of NULL
UPDATE users SET location = '' WHERE location IS NULL;
UPDATE users SET bio = '' WHERE bio IS NULL;
