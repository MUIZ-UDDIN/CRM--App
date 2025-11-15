#!/bin/bash
# Check for actual errors in backend

echo "🔍 Checking backend logs for Support Tickets errors..."
echo ""

# Check recent logs
journalctl -u crm-backend --since "5 minutes ago" -n 200 --no-pager | grep -A 20 "support"

echo ""
echo "🔍 Checking for Python tracebacks..."
journalctl -u crm-backend --since "5 minutes ago" -n 200 --no-pager | grep -A 30 "Traceback"

echo ""
echo "🔍 Checking for 500 errors..."
journalctl -u crm-backend --since "5 minutes ago" -n 200 --no-pager | grep -A 10 "500"
