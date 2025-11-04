"""
Migration script to populate company_id for existing records
Run this once to migrate historical data
"""

import sys
import os
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.models.sms import SMSMessage
from app.models.calls import Call
from app.models.emails import Email
from app.models.files import File, Folder
from app.models.quotes import Quote
from app.models.workflows import Workflow
from app.models.contacts import Contact
from app.models.deals import Deal
from app.models.activities import Activity
from app.models.pipelines import Pipeline
from app.models.bulk_email_campaigns import BulkEmailCampaign
from app.models.conversations import UserConversation
from app.models.inbox import Inbox
from app.models.users import User

# Create database connection
engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)


def migrate_company_id():
    """Migrate company_id for all records that have NULL company_id"""
    db = SessionLocal()
    
    try:
        print("Starting company_id migration...")
        
        # Get all users with their company_id
        users = db.query(User).filter(User.company_id.isnot(None)).all()
        user_company_map = {str(user.id): user.company_id for user in users}
        
        print(f"Found {len(user_company_map)} users with company associations")
        
        # Models to migrate
        models_to_migrate = [
            (SMSMessage, 'sms_messages'),
            (Call, 'calls'),
            (Email, 'emails'),
            (File, 'files'),
            (Folder, 'folders'),
            (Quote, 'quotes'),
            (Workflow, 'workflows'),
            (Contact, 'contacts'),
            (Deal, 'deals'),
            (Activity, 'activities'),
            (Pipeline, 'pipelines'),
            (BulkEmailCampaign, 'bulk_email_campaigns'),
            (UserConversation, 'user_conversations'),
            (Inbox, 'inbox')
        ]
        
        total_updated = 0
        
        for model, table_name in models_to_migrate:
            try:
                # Find records with NULL company_id
                records = db.query(model).filter(model.company_id.is_(None)).all()
                
                if not records:
                    print(f"✓ {table_name}: No records to migrate")
                    continue
                
                updated = 0
                for record in records:
                    user_id = str(record.user_id)
                    if user_id in user_company_map:
                        record.company_id = user_company_map[user_id]
                        updated += 1
                
                db.commit()
                total_updated += updated
                print(f"✓ {table_name}: Updated {updated} records")
                
            except Exception as e:
                print(f"✗ {table_name}: Error - {str(e)}")
                db.rollback()
                continue
        
        print(f"\n✅ Migration complete! Total records updated: {total_updated}")
        
    except Exception as e:
        print(f"❌ Migration failed: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()


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
