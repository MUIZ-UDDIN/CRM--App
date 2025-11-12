"""
Migration script to add sales_manager and sales_rep roles to the database
"""

import asyncio
import sys
import os
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get database URL from environment
DATABASE_URL = os.getenv("DATABASE_URL_SYNC")
if not DATABASE_URL:
    print("Error: DATABASE_URL_SYNC environment variable not set")
    sys.exit(1)

# Convert to async URL if needed
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")

# Create async engine
engine = create_async_engine(DATABASE_URL)


async def run_migration():
    """Run the migration to add sales_manager and sales_rep roles"""
    print("Starting migration to add sales_manager and sales_rep roles...")
    
    async with engine.begin() as conn:
        # Check if enum type already has these values
        check_query = """
        SELECT e.enumlabel
        FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'user_role'
        """
        
        result = await conn.execute(text(check_query))
        existing_roles = [row[0] for row in result]
        
        if 'sales_manager' in existing_roles and 'sales_rep' in existing_roles:
            print("Roles 'sales_manager' and 'sales_rep' already exist in enum type")
        else:
            # Add new enum values
            print("Adding 'sales_manager' and 'sales_rep' to user_role enum type...")
            
            # Create a new enum type with all values
            await conn.execute(text("""
            ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'sales_manager';
            ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'sales_rep';
            """))
            
            print("Enum values added successfully")
        
        # Add team_id column to users table if it doesn't exist
        check_column_query = """
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'team_id'
        """
        
        result = await conn.execute(text(check_column_query))
        has_team_id = bool(result.fetchone())
        
        if not has_team_id:
            print("Adding team_id column to users table...")
            await conn.execute(text("""
            ALTER TABLE users ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id);
            """))
            print("team_id column added successfully")
        else:
            print("team_id column already exists in users table")
        
        # Add company_id column to teams table if it doesn't exist
        check_column_query = """
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'teams' AND column_name = 'company_id'
        """
        
        result = await conn.execute(text(check_column_query))
        has_company_id = bool(result.fetchone())
        
        if not has_company_id:
            print("Adding company_id column to teams table...")
            await conn.execute(text("""
            ALTER TABLE teams ADD COLUMN IF NOT EXISTS company_id UUID NOT NULL REFERENCES companies(id);
            """))
            print("company_id column added successfully")
        else:
            print("company_id column already exists in teams table")
    
    print("Migration completed successfully")


if __name__ == "__main__":
    asyncio.run(run_migration())
