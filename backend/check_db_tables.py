#!/usr/bin/env python3
"""
Check actual database table names
"""

from sqlalchemy import inspect, text
from app.core.database import sync_engine

def check_tables():
    """Check what tables actually exist in the database"""
    inspector = inspect(sync_engine)
    
    print("=" * 60)
    print("DATABASE TABLES")
    print("=" * 60)
    
    tables = inspector.get_table_names()
    print(f"\nFound {len(tables)} tables:\n")
    
    for table in sorted(tables):
        print(f"  - {table}")
        
        # Get columns for important tables
        if table in ['users', 'user_accounts', 'workflow_templates', 'custom_fields']:
            print(f"    Columns:")
            columns = inspector.get_columns(table)
            for col in columns:
                print(f"      - {col['name']} ({col['type']})")
            
            # Get foreign keys
            fks = inspector.get_foreign_keys(table)
            if fks:
                print(f"    Foreign Keys:")
                for fk in fks:
                    print(f"      - {fk['constrained_columns']} -> {fk['referred_table']}.{fk['referred_columns']}")
            print()
    
    print("=" * 60)
    
    # Check if users or user_accounts exists
    if 'users' in tables:
        print("✅ 'users' table exists")
    elif 'user_accounts' in tables:
        print("⚠️  'user_accounts' table exists (not 'users')")
    else:
        print("❌ Neither 'users' nor 'user_accounts' table exists")
    
    print("=" * 60)

if __name__ == "__main__":
    check_tables()
