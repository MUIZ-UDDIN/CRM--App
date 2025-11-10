-- Add 'queued' to CallStatus enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'queued' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'callstatus')
    ) THEN
        ALTER TYPE callstatus ADD VALUE 'queued' BEFORE 'initiated';
    END IF;
END$$;

-- Update any existing calls with invalid status to 'no-answer'
UPDATE calls 
SET status = 'no-answer',
    ended_at = COALESCE(started_at + INTERVAL '30 seconds', NOW()),
    updated_at = NOW()
WHERE status IN ('ringing', 'initiated')
AND (started_at < NOW() - INTERVAL '5 minutes' OR started_at IS NULL);
