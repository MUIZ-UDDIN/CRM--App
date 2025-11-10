-- Manual fix for call status issues
-- Run this if the automatic migration fails

-- Step 1: Check current enum values
SELECT enumlabel FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'callstatus') 
ORDER BY enumsortorder;

-- Step 2: Add 'QUEUED' status if it doesn't exist (UPPERCASE to match existing enum)
-- Note: This might fail if 'QUEUED' already exists, that's OK
DO $$
BEGIN
    BEGIN
        ALTER TYPE callstatus ADD VALUE 'QUEUED' BEFORE 'INITIATED';
        RAISE NOTICE 'Added QUEUED status';
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE 'QUEUED status already exists';
    END;
END$$;

-- Step 3: Fix all old calls stuck in RINGING/INITIATED (UPPERCASE)
UPDATE calls 
SET status = 'NO_ANSWER',
    ended_at = COALESCE(started_at + INTERVAL '30 seconds', NOW()),
    updated_at = NOW()
WHERE status IN ('RINGING', 'INITIATED', 'QUEUED')
AND (started_at < NOW() - INTERVAL '5 minutes' OR started_at IS NULL);

-- Step 4: Verify the changes
SELECT 'Total calls by status:' as info;
SELECT status, COUNT(*) as count 
FROM calls 
GROUP BY status 
ORDER BY status;

SELECT 'Recently updated calls:' as info;
SELECT id, direction, status, from_address, to_address, 
       started_at, ended_at, duration
FROM calls 
WHERE updated_at > NOW() - INTERVAL '1 minute'
ORDER BY updated_at DESC
LIMIT 10;
