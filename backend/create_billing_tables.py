"""
Create billing tables in the database
"""
import asyncio
from sqlalchemy import create_engine
from app.core.config import settings
from app.models.billing import Base

def create_billing_tables():
    """Create billing tables using sync engine"""
    # Create sync engine from async URL
    sync_url = settings.DATABASE_URL.replace('postgresql+asyncpg://', 'postgresql://')
    engine = create_engine(sync_url)
    
    print("Creating billing tables...")
    Base.metadata.create_all(bind=engine)
    print("✅ Billing tables created successfully!")
    
    # List created tables
    from sqlalchemy import inspect
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    billing_tables = [t for t in tables if 'subscription' in t or 'invoice' in t or 'payment' in t]
    print(f"Created tables: {billing_tables}")

if __name__ == "__main__":
    create_billing_tables()
