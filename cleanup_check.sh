# Save this as cleanup.sh and run on your VPS

# 1. Find largest directories
echo '=== TOP 20 LARGEST DIRECTORIES ==='
du -h --max-depth=2 / 2>/dev/null | sort -hr | head -20

echo ''
echo '=== CHECKING SPECIFIC AREAS ==='
du -sh /var/log /var/cache /tmp /root /home 2>/dev/null

echo ''
echo '=== CHECKING FOR LARGE FILES ==='
find / -type f -size +100M 2>/dev/null -exec ls -lh {} \; | awk '{print $5, $9}'
