#!/usr/bin/env python3
"""
Create new database tables for notifications, files, and folders
"""

import asyncio
from app.core.database import async_engine
from app.models.base import Base
from app.models.notifications import Notification
from app.models.files import File, Folder

async def create_tables():
    """Create new tables"""
    print("Creating new tables...")
    
    async with async_engine.begin() as conn:
        # Create tables in correct order (Folder before File because of foreign key)
        print("Creating notifications table...")
        await conn.run_sync(Notification.__table__.create, checkfirst=True)
        
        print("Creating folders table...")
        await conn.run_sync(Folder.__table__.create, checkfirst=True)
        
        print("Creating files table...")
        await conn.run_sync(File.__table__.create, checkfirst=True)
    
    print("✅ All tables created successfully!")
    print("  - notifications")
    print("  - folders")
    print("  - files")

if __name__ == "__main__":
    asyncio.run(create_tables())
