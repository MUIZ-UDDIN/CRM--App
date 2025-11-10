-- Check the calldirection enum values
SELECT 'Current calldirection enum values:' as info;
SELECT enumlabel FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'calldirection') 
ORDER BY enumsortorder;

-- Check actual direction values in calls table
SELECT 'Actual direction values in calls:' as info;
SELECT DISTINCT direction FROM calls;

-- Check if we have any outbound calls
SELECT 'Call counts by direction:' as info;
SELECT direction, COUNT(*) as count FROM calls GROUP BY direction;
