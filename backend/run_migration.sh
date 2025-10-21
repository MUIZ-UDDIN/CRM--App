#!/bin/bash
# Run password reset migration

echo "Running password reset fields migration..."

# Option 1: Use SQL file directly with psql
if command -v psql &> /dev/null; then
    echo "Using psql to run migration..."
    psql $DATABASE_URL -f add_password_reset_fields.sql
    exit 0
fi

# Option 2: Use Python with virtual environment
if [ -d "venv" ]; then
    echo "Using Python virtual environment..."
    source venv/bin/activate
    python add_password_reset_fields.py
    deactivate
    exit 0
fi

echo "ERROR: Neither psql nor Python virtual environment found"
echo "Please run one of:"
echo "  psql \$DATABASE_URL -f add_password_reset_fields.sql"
echo "  OR"
echo "  source venv/bin/activate && python add_password_reset_fields.py"
exit 1
