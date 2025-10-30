"""
Migration script to convert old text-based stage_ids to UUIDs in deals table
Run this on the VPS to fix existing deals
"""
import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import uuid as uuid_lib

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings

def migrate_stage_ids():
    """Migrate old text-based stage_ids to UUIDs"""
    
    print("=" * 60)
    print("STAGE ID MIGRATION SCRIPT")
    print("=" * 60)
    
    # Create database connection
    engine = create_engine(settings.DATABASE_URL_SYNC)
    Session = sessionmaker(bind=engine)
    session = Session()
    
    try:
        # Step 1: Get all stages and create mapping
        print("\n📋 Step 1: Loading stages from database...")
        stages_query = text("""
            SELECT s.id, s.name, p.name as pipeline_name
            FROM stages s
            JOIN pipelines p ON s.pipeline_id = p.id
            WHERE s.is_deleted = FALSE AND p.is_deleted = FALSE
            ORDER BY p.name, s.position
        """)
        
        stages = session.execute(stages_query).fetchall()
        
        if not stages:
            print("❌ No stages found in database!")
            return
        
        print(f"✅ Found {len(stages)} stages")
        
        # Create mapping: normalized_name -> uuid
        stage_mapping = {}
        for stage_id, stage_name, pipeline_name in stages:
            # Multiple mapping strategies for maximum compatibility
            mappings = [
                stage_name,  # Exact name
                stage_name.lower(),  # Lowercase
                stage_name.lower().replace(' ', '-'),  # Normalized (spaces to dashes)
                stage_name.lower().replace(' ', '_'),  # Underscore variant
                stage_name.replace(' ', ''),  # No spaces
            ]
            
            for mapping in mappings:
                if mapping not in stage_mapping:
                    stage_mapping[mapping] = str(stage_id)
            
            print(f"  • {pipeline_name} → {stage_name} ({stage_id})")
        
        print(f"\n📊 Created {len(stage_mapping)} stage mappings")
        
        # Step 2: Find deals with text-based stage_ids
        print("\n🔍 Step 2: Finding deals with text-based stage_ids...")
        deals_query = text("""
            SELECT id, stage_id, title, pipeline_id
            FROM deals
            WHERE is_deleted = FALSE
        """)
        
        deals = session.execute(deals_query).fetchall()
        print(f"✅ Found {len(deals)} total deals")
        
        # Step 3: Update deals
        print("\n🔄 Step 3: Updating deals...")
        updated_count = 0
        skipped_count = 0
        error_count = 0
        
        for deal_id, stage_id, title, pipeline_id in deals:
            # Check if stage_id is already a valid UUID
            try:
                uuid_lib.UUID(stage_id)
                # Already a UUID, skip
                skipped_count += 1
                continue
            except (ValueError, AttributeError, TypeError):
                # Not a UUID, needs conversion
                pass
            
            # Try to find matching stage UUID
            stage_uuid = None
            
            # Try different mapping strategies
            for key in [stage_id, stage_id.lower() if stage_id else None, 
                       stage_id.lower().replace(' ', '-') if stage_id else None]:
                if key and key in stage_mapping:
                    stage_uuid = stage_mapping[key]
                    break
            
            if stage_uuid:
                # Update the deal
                update_query = text("""
                    UPDATE deals
                    SET stage_id = :new_stage_id
                    WHERE id = :deal_id
                """)
                
                session.execute(update_query, {
                    'new_stage_id': stage_uuid,
                    'deal_id': deal_id
                })
                
                updated_count += 1
                title_short = title[:40] + '...' if len(title) > 40 else title
                print(f"  ✅ Updated: '{title_short}'")
                print(f"     {stage_id} → {stage_uuid}")
            else:
                error_count += 1
                title_short = title[:40] + '...' if len(title) > 40 else title
                print(f"  ❌ ERROR: '{title_short}' - Unknown stage: '{stage_id}'")
        
        # Commit changes
        if updated_count > 0:
            session.commit()
            print(f"\n✅ Successfully committed {updated_count} updates to database")
        else:
            print("\n⚠️  No updates needed")
        
        # Summary
        print("\n" + "=" * 60)
        print("MIGRATION SUMMARY")
        print("=" * 60)
        print(f"✅ Updated:  {updated_count} deals")
        print(f"⏭️  Skipped:  {skipped_count} deals (already have UUID)")
        print(f"❌ Errors:   {error_count} deals (unknown stage)")
        print(f"📊 Total:    {len(deals)} deals")
        print("=" * 60)
        
        if error_count > 0:
            print("\n⚠️  WARNING: Some deals have unknown stages!")
            print("   These deals may not display correctly.")
            print("   Please check the stage names in Pipeline Settings.")
        
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        session.rollback()
        raise
    finally:
        session.close()
        engine.dispose()

if __name__ == "__main__":
    try:
        migrate_stage_ids()
        print("\n✅ Migration completed successfully!")
    except Exception as e:
        print(f"\n❌ Migration failed: {str(e)}")
        sys.exit(1)
