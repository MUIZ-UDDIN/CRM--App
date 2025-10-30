#!/bin/bash
# Simple script to fix stage IDs - safe for production

echo "============================================================"
echo "FIXING STAGE IDs IN DATABASE"
echo "============================================================"

cd /var/www/crm-app/backend

# Run with Python that has access to .env through the app
/var/www/crm-app/backend/venv/bin/python3 << 'PYTHON_SCRIPT'
import os
import sys

# Load .env file manually
env_file = '/var/www/crm-app/backend/.env'
if os.path.exists(env_file):
    with open(env_file) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                os.environ[key] = value

# Now run the migration
sys.path.insert(0, '/var/www/crm-app/backend')
from migrate_stage_ids_direct import migrate_stage_ids

migrate_stage_ids()
PYTHON_SCRIPT

echo ""
echo "============================================================"
echo "✅ Done! Now restart the backend:"
echo "   sudo systemctl restart crm-backend"
echo "============================================================"
