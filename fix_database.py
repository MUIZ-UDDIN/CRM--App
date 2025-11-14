#!/usr/bin/env python3
"""
Emergency Database Fix Script
This script directly accesses the database to check and fix user roles
"""

import sys
import os
import psycopg2
from psycopg2.extras import RealDictCursor
import getpass

# Database connection parameters
DB_NAME = "sales_crm"
DB_USER = "crm_user"
DB_HOST = "localhost"
DB_PORT = "5432"

def main():
    """Main function"""
    print("=" * 60)
    print("🔧 Emergency Database Fix Script")
    print("=" * 60)
    print()
    
    # Get password
    db_password = getpass.getpass(f"Enter database password for {DB_USER}@{DB_HOST}: ")
    
    # Connect to database
    try:
        print(f"Connecting to {DB_NAME} database as {DB_USER}...")
        conn = psycopg2.connect(
            dbname=DB_NAME,
            user=DB_USER,
            password=db_password,
            host=DB_HOST,
            port=DB_PORT
        )
        conn.autocommit = True
        print("✅ Connected to database!")
    except Exception as e:
        print(f"❌ Error connecting to database: {e}")
        sys.exit(1)
    
    # Create cursor
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    # Check database tables
    print("\nChecking database tables...")
    try:
        cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
        tables = [row['table_name'] for row in cur.fetchall()]
        print(f"Found {len(tables)} tables: {', '.join(tables)}")
    except Exception as e:
        print(f"❌ Error checking tables: {e}")
    
    # Check users table
    if 'users' in tables:
        print("\nChecking users table...")
        try:
            cur.execute("SELECT COUNT(*) as count FROM users")
            user_count = cur.fetchone()['count']
            print(f"Found {user_count} users")
            
            # Check user roles
            cur.execute("SELECT user_role, COUNT(*) as count FROM users GROUP BY user_role")
            roles = cur.fetchall()
            print("\nUser roles distribution:")
            for role in roles:
                print(f"  {role['user_role']}: {role['count']}")
            
            # Check for super_admin users
            cur.execute("SELECT COUNT(*) as count FROM users WHERE user_role = 'super_admin'")
            super_admin_count = cur.fetchone()['count']
            print(f"\nFound {super_admin_count} super_admin users")
            
            if super_admin_count == 0:
                print("\n⚠️ No super_admin users found!")
                create_admin = input("Do you want to create a super_admin user? (y/n): ")
                if create_admin.lower() == 'y':
                    email = input("Enter email for super_admin: ")
                    password = getpass.getpass("Enter password (min 8 chars): ")
                    
                    if len(password) < 8:
                        print("❌ Password too short!")
                        sys.exit(1)
                    
                    # Hash password - using a simple bcrypt-like hash for illustration
                    import hashlib
                    hashed_password = hashlib.sha256(password.encode()).hexdigest()
                    
                    # Insert super_admin user
                    try:
                        cur.execute("""
                            INSERT INTO users (
                                email, first_name, last_name, hashed_password, 
                                user_role, role, is_active, email_verified
                            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                        """, (
                            email, "Super", "Admin", hashed_password, 
                            "super_admin", "super_admin", True, True
                        ))
                        print(f"✅ Created super_admin user: {email}")
                    except Exception as e:
                        print(f"❌ Error creating super_admin user: {e}")
            else:
                # List super_admin users
                cur.execute("SELECT id, email, first_name, last_name FROM users WHERE user_role = 'super_admin'")
                super_admins = cur.fetchall()
                print("\nSuper admin users:")
                for admin in super_admins:
                    print(f"  {admin['email']} ({admin['first_name']} {admin['last_name']})")
            
            # Fix any inconsistent roles
            print("\nChecking for inconsistent roles...")
            cur.execute("SELECT COUNT(*) as count FROM users WHERE user_role != role AND role IS NOT NULL")
            inconsistent_count = cur.fetchone()['count']
            
            if inconsistent_count > 0:
                print(f"Found {inconsistent_count} users with inconsistent roles")
                fix_roles = input("Do you want to fix these inconsistencies? (y/n): ")
                if fix_roles.lower() == 'y':
                    cur.execute("UPDATE users SET role = user_role WHERE user_role != role AND role IS NOT NULL")
                    print(f"✅ Fixed {inconsistent_count} user roles")
        except Exception as e:
            print(f"❌ Error checking users: {e}")
    else:
        print("❌ Users table not found!")
    
    # Close connection
    cur.close()
    conn.close()
    
    print("\n" + "=" * 60)
    print("✅ Database check completed!")
    print("=" * 60)

if __name__ == "__main__":
    main()
