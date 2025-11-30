-- Migration: Add category column to folders table
-- This allows folders to be categorized like files

-- Step 1: Add category column to folders table
ALTER TABLE folders ADD COLUMN IF NOT EXISTS category VARCHAR(100);

-- Step 2: Create index on category column for better query performance
CREATE INDEX IF NOT EXISTS idx_folders_category ON folders(category);

-- Verify the migration
SELECT column_name, data_type, character_maximum_length, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'folders' AND column_name = 'category';

-- Check if index was created
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'folders' AND indexname = 'idx_folders_category';
