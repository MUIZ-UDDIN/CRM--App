"""
Database table creation script
Run this to create all tables in the database
"""

import asyncio
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.models import Base
from app.models import *  # Import all models to register them
from loguru import logger


def create_all_tables():
    """Create all database tables"""
    try:
        # Create engine
        engine = create_engine(
            settings.DATABASE_URL_SYNC,
            echo=True,
            pool_pre_ping=True
        )
        
        logger.info("Creating all database tables...")
        
        # Create all tables
        Base.metadata.create_all(bind=engine)
        
        logger.info("✓ All tables created successfully!")
        
        # Print created tables
        logger.info("\nCreated tables:")
        for table in Base.metadata.sorted_tables:
            logger.info(f"  - {table.name}")
        
        return True
        
    except Exception as e:
        logger.error(f"Error creating tables: {e}")
        return False


def drop_all_tables():
    """Drop all database tables (use with caution!)"""
    try:
        engine = create_engine(
            settings.DATABASE_URL_SYNC,
            echo=True,
            pool_pre_ping=True
        )
        
        logger.warning("⚠️  Dropping all database tables...")
        
        # Drop all tables
        Base.metadata.drop_all(bind=engine)
        
        logger.info("✓ All tables dropped successfully!")
        
        return True
        
    except Exception as e:
        logger.error(f"Error dropping tables: {e}")
        return False


def create_indexes():
    """Create additional indexes for performance"""
    try:
        engine = create_engine(
            settings.DATABASE_URL_SYNC,
            echo=True,
            pool_pre_ping=True
        )
        
        with engine.connect() as conn:
            logger.info("Creating additional indexes...")
            
            # Add custom indexes here if needed
            # Example:
            # conn.execute(text("CREATE INDEX idx_custom ON table_name (column_name)"))
            
            conn.commit()
            
        logger.info("✓ Additional indexes created successfully!")
        
        return True
        
    except Exception as e:
        logger.error(f"Error creating indexes: {e}")
        return False


def seed_initial_data():
    """Seed initial data (roles, default pipeline, etc.)"""
    try:
        from app.models import Role, Pipeline, PipelineStage
        from sqlalchemy.orm import Session
        
        engine = create_engine(settings.DATABASE_URL_SYNC)
        SessionLocal = sessionmaker(bind=engine)
        db = SessionLocal()
        
        try:
            logger.info("Seeding initial data...")
            
            # Create default roles
            roles = [
                Role(name="admin", description="Administrator with full access"),
                Role(name="manager", description="Manager with team access"),
                Role(name="user", description="Standard user"),
            ]
            
            for role in roles:
                existing = db.query(Role).filter(Role.name == role.name).first()
                if not existing:
                    db.add(role)
                    logger.info(f"  - Created role: {role.name}")
            
            # Create default pipeline
            pipeline = db.query(Pipeline).filter(Pipeline.name == "Sales Pipeline").first()
            if not pipeline:
                pipeline = Pipeline(
                    name="Sales Pipeline",
                    description="Default sales pipeline",
                    is_default=True,
                    order_index=0
                )
                db.add(pipeline)
                db.flush()  # Get the pipeline ID
                
                # Create default stages
                stages = [
                    PipelineStage(
                        pipeline_id=pipeline.id,
                        name="Qualification",
                        order_index=0,
                        probability=25.0
                    ),
                    PipelineStage(
                        pipeline_id=pipeline.id,
                        name="Proposal",
                        order_index=1,
                        probability=50.0
                    ),
                    PipelineStage(
                        pipeline_id=pipeline.id,
                        name="Negotiation",
                        order_index=2,
                        probability=75.0
                    ),
                    PipelineStage(
                        pipeline_id=pipeline.id,
                        name="Closed Won",
                        order_index=3,
                        probability=100.0,
                        is_closed=True,
                        is_won=True
                    ),
                    PipelineStage(
                        pipeline_id=pipeline.id,
                        name="Closed Lost",
                        order_index=4,
                        probability=0.0,
                        is_closed=True,
                        is_won=False
                    ),
                ]
                
                for stage in stages:
                    db.add(stage)
                    logger.info(f"  - Created stage: {stage.name}")
            
            db.commit()
            logger.info("✓ Initial data seeded successfully!")
            
        finally:
            db.close()
        
        return True
        
    except Exception as e:
        logger.error(f"Error seeding data: {e}")
        return False


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "create":
            create_all_tables()
            create_indexes()
            seed_initial_data()
        elif command == "drop":
            confirm = input("⚠️  Are you sure you want to drop all tables? (yes/no): ")
            if confirm.lower() == "yes":
                drop_all_tables()
            else:
                logger.info("Operation cancelled")
        elif command == "recreate":
            confirm = input("⚠️  This will drop and recreate all tables. Continue? (yes/no): ")
            if confirm.lower() == "yes":
                drop_all_tables()
                create_all_tables()
                create_indexes()
                seed_initial_data()
            else:
                logger.info("Operation cancelled")
        elif command == "seed":
            seed_initial_data()
        else:
            logger.error(f"Unknown command: {command}")
            logger.info("Available commands: create, drop, recreate, seed")
    else:
        logger.info("Usage: python create_tables.py [create|drop|recreate|seed]")
        logger.info("  create   - Create all tables")
        logger.info("  drop     - Drop all tables")
        logger.info("  recreate - Drop and recreate all tables")
        logger.info("  seed     - Seed initial data")
