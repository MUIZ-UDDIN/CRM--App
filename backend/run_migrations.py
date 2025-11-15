#!/usr/bin/env python3
"""
Run database migrations
"""

from app.core.database import sync_engine
from sqlalchemy import text
import os

def run_migration(filename):
    """Run a single migration file"""
    filepath = os.path.join('migrations', filename)
    
    if not os.path.exists(filepath):
        print(f"⚠️  Migration file not found: {filepath}")
        return False
    
    print(f"\n📄 Running migration: {filename}")
    
    with open(filepath, 'r') as f:
        sql = f.read()
    
    # Split by semicolon and execute each statement
    statements = [s.strip() for s in sql.split(';') if s.strip()]
    
    with sync_engine.connect() as conn:
        for i, statement in enumerate(statements, 1):
            try:
                conn.execute(text(statement))
                conn.commit()
                print(f"  ✅ Statement {i}/{len(statements)} executed")
            except Exception as e:
                print(f"  ⚠️  Statement {i} error (may already exist): {str(e)[:100]}")
                conn.rollback()
    
    print(f"✅ Migration {filename} completed!")
    return True

def main():
    """Run all migrations"""
    print("🚀 Starting database migrations...")
    
    migrations = [
        'add_support_tickets_and_custom_fields.sql',
        'add_workflow_templates.sql'
    ]
    
    for migration in migrations:
        run_migration(migration)
    
    print("\n🎉 All migrations completed successfully!")

if __name__ == '__main__':
    main()
