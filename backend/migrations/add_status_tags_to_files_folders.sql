-- Add status and tags columns to files and folders tables
-- Run this migration to add the missing fields

-- Add status column to files table
ALTER TABLE files 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';

-- Add status and tags columns to folders table
ALTER TABLE folders 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';

ALTER TABLE folders 
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN files.status IS 'File status: active, inactive, archived';
COMMENT ON COLUMN folders.status IS 'Folder status: active, inactive, archived';
COMMENT ON COLUMN folders.tags IS 'Array of tags for folder organization';
