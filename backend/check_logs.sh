#!/bin/bash
# Check backend logs for actual errors

echo "🔍 Checking for 500 errors in backend logs..."
echo ""

# Check for recent 500 errors
journalctl -u crm-backend --since "30 minutes ago" | grep -A 10 -B 5 "500\|Internal Server Error\|Traceback\|Exception" | tail -100

echo ""
echo "🔍 Checking for support_tickets errors..."
journalctl -u crm-backend --since "30 minutes ago" | grep -i "support_ticket" | tail -20

echo ""
echo "🔍 Checking for custom_fields errors..."
journalctl -u crm-backend --since "30 minutes ago" | grep -i "custom_field" | tail -20
