-- Fix old calls stuck in ringing/initiated status
-- This updates calls older than 5 minutes to 'no-answer' status

UPDATE calls 
SET 
    status = 'no-answer',
    ended_at = started_at + INTERVAL '30 seconds',
    updated_at = NOW()
WHERE 
    status IN ('ringing', 'initiated', 'queued')
    AND started_at < NOW() - INTERVAL '5 minutes';

-- Check how many calls were updated
SELECT COUNT(*) as updated_calls 
FROM calls 
WHERE status = 'no-answer' 
AND updated_at > NOW() - INTERVAL '1 minute';
