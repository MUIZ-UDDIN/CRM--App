"""
Simple migration script to populate company_id for existing records
Run this once to migrate historical data
"""

import os
import psycopg2
from psycopg2.extras import RealDictCursor

# Database connection from environment or default
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://crm_user:your_password@localhost/crm_db')

# Parse DATABASE_URL if it's in the format postgresql://user:pass@host/db
if DATABASE_URL.startswith('postgresql://'):
    # Extract connection parameters
    import re
    match = re.match(r'postgresql://([^:]+):([^@]+)@([^/]+)/(.+)', DATABASE_URL)
    if match:
        db_user, db_pass, db_host, db_name = match.groups()
        conn_params = {
            'dbname': db_name,
            'user': db_user,
            'password': db_pass,
            'host': db_host
        }
    else:
        print("Error: Could not parse DATABASE_URL")
        exit(1)
else:
    conn_params = {'dbname': 'crm_db'}


def migrate_company_id():
    """Migrate company_id for all records that have NULL company_id"""
    
    try:
        # Connect to database
        print("Connecting to database...")
        conn = psycopg2.connect(**conn_params)
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        print("✅ Connected to database\n")
        print("=" * 60)
        print("Starting company_id migration...")
        print("=" * 60)
        
        # Get user -> company mapping
        cur.execute("SELECT id, company_id FROM users WHERE company_id IS NOT NULL")
        users = cur.fetchall()
        user_company_map = {str(user['id']): str(user['company_id']) for user in users}
        
        print(f"\n📊 Found {len(user_company_map)} users with company associations\n")
        
        # Tables to migrate
        tables = [
            'sms_messages',
            'calls',
            'emails',
            'files',
            'folders',
            'quotes',
            'workflows',
            'contacts',
            'deals',
            'activities',
            'pipelines',
            'bulk_email_campaigns',
            'user_conversations',
            'inbox'
        ]
        
        total_updated = 0
        
        for table in tables:
            try:
                # Check if table exists
                cur.execute(f"""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_name = '{table}'
                    )
                """)
                
                if not cur.fetchone()['exists']:
                    print(f"⊘ {table}: Table does not exist, skipping")
                    continue
                
                # Check if company_id column exists
                cur.execute(f"""
                    SELECT EXISTS (
                        SELECT FROM information_schema.columns 
                        WHERE table_name = '{table}' AND column_name = 'company_id'
                    )
                """)
                
                if not cur.fetchone()['exists']:
                    print(f"⊘ {table}: No company_id column, skipping")
                    continue
                
                # Count records with NULL company_id
                cur.execute(f"SELECT COUNT(*) as count FROM {table} WHERE company_id IS NULL")
                null_count = cur.fetchone()['count']
                
                if null_count == 0:
                    print(f"✓ {table}: No records to migrate")
                    continue
                
                # Get records with NULL company_id
                cur.execute(f"SELECT id, user_id FROM {table} WHERE company_id IS NULL")
                records = cur.fetchall()
                
                updated = 0
                for record in records:
                    user_id = str(record['user_id'])
                    if user_id in user_company_map:
                        company_id = user_company_map[user_id]
                        cur.execute(
                            f"UPDATE {table} SET company_id = %s WHERE id = %s",
                            (company_id, record['id'])
                        )
                        updated += 1
                
                conn.commit()
                total_updated += updated
                print(f"✓ {table}: Updated {updated}/{null_count} records")
                
            except Exception as e:
                print(f"✗ {table}: Error - {str(e)}")
                conn.rollback()
                continue
        
        print("\n" + "=" * 60)
        print(f"✅ Migration complete! Total records updated: {total_updated}")
        print("=" * 60)
        
        cur.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Migration failed: {str(e)}")
        raise


if __name__ == "__main__":
    print("=" * 60)
    print("Company ID Migration Script")
    print("=" * 60)
    print("\nThis script will populate company_id for all existing records")
    print("based on the user's company association.\n")
    
    response = input("Do you want to proceed? (yes/no): ")
    
    if response.lower() in ['yes', 'y']:
        migrate_company_id()
    else:
        print("Migration cancelled.")
