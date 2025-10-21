#!/usr/bin/env python3
"""
Add password reset fields to users table
"""

import asyncio
from app.core.database import async_engine
from sqlalchemy import text

async def add_password_reset_fields():
    """Add reset_code and reset_code_expires columns to users table"""
    print("Adding password reset fields to users table...")
    
    async with async_engine.begin() as conn:
        # Check if columns already exist
        result = await conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='users' AND column_name IN ('reset_code', 'reset_code_expires')
        """))
        existing_columns = [row[0] for row in result.fetchall()]
        
        if 'reset_code' not in existing_columns:
            print("Adding reset_code column...")
            await conn.execute(text("""
                ALTER TABLE users ADD COLUMN reset_code VARCHAR(6)
            """))
            print("✅ Added reset_code column")
        else:
            print("⏭️  reset_code column already exists")
        
        if 'reset_code_expires' not in existing_columns:
            print("Adding reset_code_expires column...")
            await conn.execute(text("""
                ALTER TABLE users ADD COLUMN reset_code_expires TIMESTAMP
            """))
            print("✅ Added reset_code_expires column")
        else:
            print("⏭️  reset_code_expires column already exists")
    
    print("\n✅ Migration complete!")

if __name__ == "__main__":
    asyncio.run(add_password_reset_fields())
