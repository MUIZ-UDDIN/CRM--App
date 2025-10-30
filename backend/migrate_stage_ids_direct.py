"""
Direct database migration script with no dependencies
Uses raw SQL connection to PostgreSQL
"""
import os
import sys

def migrate_stage_ids():
    """Migrate old text-based stage_ids to UUIDs using raw SQL"""
    
    print("=" * 60)
    print("STAGE ID MIGRATION SCRIPT")
    print("=" * 60)
    
    # Get database credentials from environment
    db_url = os.getenv('DATABASE_URL_SYNC', 'postgresql://crm_user:Marc@2025crmServer#@localhost:5432/sales_crm')
    
    print(f"\n🔗 Connecting to database...")
    
    # Import psycopg2 (should be installed in venv)
    try:
        import psycopg2
        from psycopg2.extras import RealDictCursor
    except ImportError:
        print("❌ psycopg2 not found!")
        print("Please install it in your virtual environment:")
        print("  source venv/bin/activate")
        print("  pip install psycopg2-binary")
        sys.exit(1)
    
    # Parse database URL
    # Format: postgresql://user:password@host:port/database
    db_url = db_url.replace('postgresql://', '')
    if '@' in db_url:
        user_pass, host_db = db_url.split('@')
        user, password = user_pass.split(':')
        host_port, database = host_db.split('/')
        if ':' in host_port:
            host, port = host_port.split(':')
        else:
            host = host_port
            port = '5432'
    else:
        print("❌ Invalid DATABASE_URL format")
        return
    
    # Create database connection
    try:
        conn = psycopg2.connect(
            host=host,
            port=port,
            database=database,
            user=user,
            password=password
        )
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        print("✅ Connected to database")
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return
    
    try:
        # Step 1: Get all stages and create mapping
        print("\n📋 Step 1: Loading stages from database...")
        cursor.execute("""
            SELECT s.id, s.name, p.name as pipeline_name
            FROM stages s
            JOIN pipelines p ON s.pipeline_id = p.id
            WHERE s.is_deleted = FALSE AND p.is_deleted = FALSE
            ORDER BY p.name, s.position
        """)
        
        stages = cursor.fetchall()
        
        if not stages:
            print("❌ No stages found in database!")
            return
        
        print(f"✅ Found {len(stages)} stages")
        
        # Create mapping: normalized_name -> uuid
        stage_mapping = {}
        for stage in stages:
            stage_id = str(stage['id'])
            stage_name = stage['name']
            pipeline_name = stage['pipeline_name']
            
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
                    stage_mapping[mapping] = stage_id
            
            print(f"  • {pipeline_name} → {stage_name} ({stage_id})")
        
        print(f"\n📊 Created {len(stage_mapping)} stage mappings")
        
        # Step 2: Find deals with text-based stage_ids
        print("\n🔍 Step 2: Finding deals with text-based stage_ids...")
        cursor.execute("""
            SELECT id, stage_id, title, pipeline_id
            FROM deals
            WHERE is_deleted = FALSE
        """)
        
        deals = cursor.fetchall()
        print(f"✅ Found {len(deals)} total deals")
        
        # Step 3: Update deals
        print("\n🔄 Step 3: Updating deals...")
        updated_count = 0
        skipped_count = 0
        error_count = 0
        
        for deal in deals:
            deal_id = str(deal['id'])
            stage_id = deal['stage_id']
            title = deal['title']
            pipeline_id = str(deal['pipeline_id'])
            
            # Check if stage_id is already a valid UUID
            try:
                import uuid as uuid_lib
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
                cursor.execute("""
                    UPDATE deals
                    SET stage_id = %s
                    WHERE id = %s
                """, (stage_uuid, deal_id))
                
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
            conn.commit()
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
        import traceback
        traceback.print_exc()
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    try:
        migrate_stage_ids()
        print("\n✅ Migration completed successfully!")
    except Exception as e:
        print(f"\n❌ Migration failed: {str(e)}")
        sys.exit(1)
