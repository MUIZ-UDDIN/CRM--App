"""
Database connection and session management
"""

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from sqlalchemy import create_engine
from typing import AsyncGenerator
from .config import settings
from loguru import logger


class Base(DeclarativeBase):
    """Base class for all database models"""
    pass


# Determine if using PostgreSQL or SQLite
is_postgresql = settings.DATABASE_URL.startswith('postgresql')

# Engine configuration based on database type
if is_postgresql:
    # PostgreSQL supports connection pooling
    async_engine = create_async_engine(
        settings.DATABASE_URL,
        echo=settings.DEBUG,
        future=True,
        pool_pre_ping=True,
        pool_size=20,
        max_overflow=0,
    )
    
    sync_engine = create_engine(
        settings.DATABASE_URL_SYNC,
        echo=settings.DEBUG,
        pool_pre_ping=True,
        pool_size=20,
        max_overflow=0,
    )
else:
    # SQLite doesn't support pool_size and max_overflow
    async_engine = create_async_engine(
        settings.DATABASE_URL,
        echo=settings.DEBUG,
        future=True,
    )
    
    sync_engine = create_engine(
        settings.DATABASE_URL_SYNC,
        echo=settings.DEBUG,
    )

# Async session factory
AsyncSessionLocal = async_sessionmaker(
    async_engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# Sync session factory
SessionLocal = sessionmaker(
    sync_engine,
    autocommit=False,
    autoflush=False
)


async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency function to get async database session
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception as e:
            await session.rollback()
            logger.error(f"Database session error: {e}")
            raise
        finally:
            await session.close()


def get_sync_session():
    """
    Get sync database session for migrations and admin tasks
    """
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception as e:
        session.rollback()
        logger.error(f"Sync database session error: {e}")
        raise
    finally:
        session.close()


# Alias for compatibility
get_db = get_sync_session


async def init_db():
    """
    Initialize database connection and create tables if needed
    """
    try:
        # Import all models to ensure they are registered with Base
        from app.models import users, contacts, deals, activities, analytics, emails, sms, calls, documents, workflows, security
        
        # Test the connection
        async with async_engine.begin() as conn:
            logger.info("Database connection established successfully")
            
            # Create tables if they don't exist
            await conn.run_sync(Base.metadata.create_all)
            logger.info("Database tables created/verified")
                
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        logger.warning("Running without database - some features may not work")
        # Don't raise the exception in development mode - allow the app to start without DB


async def close_db():
    """
    Close database connection
    """
    await async_engine.dispose()
    logger.info("Database connection closed")