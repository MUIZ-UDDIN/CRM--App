"""
Fix notification type enum in database
This script ensures the NotificationType enum exists in PostgreSQL
"""

import sys
from sqlalchemy import create_engine, text
from app.core.config import get_settings

settings = get_settings()

def fix_notification_enum():
    """Create or update the NotificationType enum"""
    try:
        engine = create_engine(settings.DATABASE_URL_SYNC)
        
        with engine.connect() as conn:
            # Check if enum exists
            result = conn.execute(text("""
                SELECT EXISTS (
                    SELECT 1 FROM pg_type 
                    WHERE typname = 'notificationtype'
                );
            """))
            enum_exists = result.scalar()
            
            if not enum_exists:
                print("Creating NotificationType enum...")
                conn.execute(text("""
                    CREATE TYPE notificationtype AS ENUM (
                        'info', 'success', 'warning', 'error'
                    );
                """))
                conn.commit()
                print("✅ NotificationType enum created successfully")
            else:
                print("NotificationType enum already exists")
                
                # Check current values
                result = conn.execute(text("""
                    SELECT enumlabel 
                    FROM pg_enum 
                    WHERE enumtypid = (
                        SELECT oid FROM pg_type WHERE typname = 'notificationtype'
                    )
                    ORDER BY enumsortorder;
                """))
                current_values = [row[0] for row in result]
                print(f"Current enum values: {current_values}")
                
                # Add missing values if needed
                required_values = ['info', 'success', 'warning', 'error']
                for value in required_values:
                    if value not in current_values:
                        print(f"Adding missing value: {value}")
                        conn.execute(text(f"""
                            ALTER TYPE notificationtype ADD VALUE '{value}';
                        """))
                        conn.commit()
                        print(f"✅ Added '{value}' to enum")
            
            # Verify notifications table
            result = conn.execute(text("""
                SELECT column_name, data_type, udt_name
                FROM information_schema.columns
                WHERE table_name = 'notifications' AND column_name = 'type';
            """))
            column_info = result.fetchone()
            
            if column_info:
                print(f"\nNotifications.type column:")
                print(f"  Data type: {column_info[1]}")
                print(f"  UDT name: {column_info[2]}")
            else:
                print("\n⚠️  Notifications table or type column not found")
                
        print("\n✅ Database enum check complete!")
        return True
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = fix_notification_enum()
    sys.exit(0 if success else 1)
