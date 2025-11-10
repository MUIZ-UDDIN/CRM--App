-- Check the specific call at 20:52:43
SELECT 
    id,
    direction,
    status,
    from_address,
    to_address,
    duration,
    started_at,
    answered_at,
    ended_at,
    twilio_sid,
    created_at,
    updated_at
FROM calls 
WHERE started_at::text LIKE '%20:52:43%'
ORDER BY started_at DESC;

-- Check if there are any completed calls with duration
SELECT 'Calls with duration > 0:' as info;
SELECT 
    direction,
    status,
    duration,
    started_at,
    ended_at
FROM calls 
WHERE duration > 0
ORDER BY started_at DESC
LIMIT 5;
