-- Add 'QUEUED' to CallStatus enum if it doesn't exist (UPPERCASE to match existing enum)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'QUEUED' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'callstatus')
    ) THEN
        ALTER TYPE callstatus ADD VALUE 'QUEUED' BEFORE 'INITIATED';
    END IF;
END$$;

-- Update any existing calls with invalid status to 'NO_ANSWER' (UPPERCASE)
UPDATE calls 
SET status = 'NO_ANSWER',
    ended_at = COALESCE(started_at + INTERVAL '30 seconds', NOW()),
    updated_at = NOW()
WHERE status IN ('RINGING', 'INITIATED', 'QUEUED')
AND (started_at < NOW() - INTERVAL '5 minutes' OR started_at IS NULL);
