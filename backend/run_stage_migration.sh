#!/bin/bash
# Run stage ID migration to convert text-based stage IDs to UUIDs

echo "============================================================"
echo "STAGE ID MIGRATION SCRIPT"
echo "============================================================"

# Check if virtual environment exists
if [ -d "venv" ]; then
    echo "✅ Found virtual environment"
    echo "🔗 Activating virtual environment..."
    source venv/bin/activate
    
    # Check if psycopg2 is installed
    echo "🔍 Checking dependencies..."
    python3 -c "import psycopg2" 2>/dev/null
    if [ $? -ne 0 ]; then
        echo "⚠️  psycopg2 not found, installing..."
        pip install psycopg2-binary
    fi
    
    echo "🚀 Running migration..."
    python3 migrate_stage_ids_direct.py
    
    RESULT=$?
    deactivate
    
    if [ $RESULT -eq 0 ]; then
        echo ""
        echo "✅ Migration completed successfully!"
        echo "🔄 Please restart the backend service:"
        echo "   sudo systemctl restart crm-backend"
    else
        echo ""
        echo "❌ Migration failed!"
        exit 1
    fi
else
    echo "❌ Virtual environment not found at ./venv"
    echo ""
    echo "Please create it first:"
    echo "  python3 -m venv venv"
    echo "  source venv/bin/activate"
    echo "  pip install -r requirements.txt"
    exit 1
fi
