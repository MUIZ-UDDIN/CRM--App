#!/usr/bin/env python3
"""
Add password reset fields to users table
"""

import sys
import os

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def add_password_reset_fields():
    """Add reset_code and reset_code_expires columns to users table"""
    import psycopg2
    from urllib.parse import urlparse
    
    print("Adding password reset fields to users table...")
    
    # Get database URL from environment
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("ERROR: DATABASE_URL environment variable not set")
        return
    
    # Parse database URL
    result = urlparse(database_url)
    username = result.username
    password = result.password
    database = result.path[1:]
    hostname = result.hostname
    port = result.port
    
    # Connect to database
    try:
        conn = psycopg2.connect(
            database=database,
            user=username,
            password=password,
            host=hostname,
            port=port
        )
        cursor = conn.cursor()
        
        # Check if columns already exist
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='users' AND column_name IN ('reset_code', 'reset_code_expires')
        """)
        existing_columns = [row[0] for row in cursor.fetchall()]
        
        if 'reset_code' not in existing_columns:
            print("Adding reset_code column...")
            cursor.execute("ALTER TABLE users ADD COLUMN reset_code VARCHAR(6)")
            print("✅ Added reset_code column")
        else:
            print("⏭️  reset_code column already exists")
        
        if 'reset_code_expires' not in existing_columns:
            print("Adding reset_code_expires column...")
            cursor.execute("ALTER TABLE users ADD COLUMN reset_code_expires TIMESTAMP")
            print("✅ Added reset_code_expires column")
        else:
            print("⏭️  reset_code_expires column already exists")
        
        conn.commit()
        cursor.close()
        conn.close()
        
        print("\n✅ Migration complete!")
        
    except Exception as e:
        print(f"ERROR: {e}")
        sys.exit(1)

if __name__ == "__main__":
    add_password_reset_fields()
