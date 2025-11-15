"""
Create billing tables in the database
"""
from sqlalchemy import create_engine
from app.core.config import settings
from app.models.base import Base
# Import all billing models to register them with Base
from app.models.billing import SubscriptionPlan, PlanFeature, Subscription, Invoice, Payment

def create_billing_tables():
    """Create billing tables using sync engine"""
    # Create sync engine from async URL
    sync_url = settings.DATABASE_URL.replace('postgresql+asyncpg://', 'postgresql://')
    engine = create_engine(sync_url)
    
    print("Creating billing tables...")
    print(f"Models to create: {[m.__tablename__ for m in [SubscriptionPlan, PlanFeature, Subscription, Invoice, Payment]]}")
    
    # Create only billing tables
    Base.metadata.create_all(bind=engine, tables=[
        SubscriptionPlan.__table__,
        PlanFeature.__table__,
        Subscription.__table__,
        Invoice.__table__,
        Payment.__table__
    ])
    print("✅ Billing tables created successfully!")
    
    # List created tables
    from sqlalchemy import inspect
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    billing_tables = [t for t in tables if 'subscription' in t or 'invoice' in t or 'payment' in t or 'plan' in t]
    print(f"Billing tables in database: {billing_tables}")

if __name__ == "__main__":
    create_billing_tables()
