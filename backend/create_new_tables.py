#!/usr/bin/env python3
"""
Create new database tables for notifications, files, and folders
"""

import asyncio
from app.core.database import engine
from app.models.base import Base
from app.models.notifications import Notification
from app.models.files import File, Folder

async def create_tables():
    """Create new tables"""
    print("Creating new tables...")
    
    async with engine.begin() as conn:
        # Create only the new tables
        await conn.run_sync(Notification.__table__.create, checkfirst=True)
        await conn.run_sync(File.__table__.create, checkfirst=True)
        await conn.run_sync(Folder.__table__.create, checkfirst=True)
    
    print("✅ Tables created successfully!")
    print("  - notifications")
    print("  - files")
    print("  - folders")

if __name__ == "__main__":
    asyncio.run(create_tables())
