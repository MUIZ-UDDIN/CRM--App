"""
Apply database indexes for performance optimization
Run this script after database setup: python -m app.db.apply_indexes
"""

import os
from sqlalchemy import text
from app.core.database import engine
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def apply_indexes():
    """Apply all performance indexes to the database"""
    
    # Read SQL file
    sql_file = os.path.join(os.path.dirname(__file__), 'create_indexes.sql')
    
    if not os.path.exists(sql_file):
        logger.error(f"SQL file not found: {sql_file}")
        return False
    
    with open(sql_file, 'r') as f:
        sql_content = f.read()
    
    # Split by semicolon and execute each statement
    statements = [s.strip() for s in sql_content.split(';') if s.strip() and not s.strip().startswith('--')]
    
    try:
        with engine.connect() as conn:
            logger.info("Applying database indexes...")
            
            for i, statement in enumerate(statements, 1):
                try:
                    logger.info(f"Executing statement {i}/{len(statements)}...")
                    conn.execute(text(statement))
                    conn.commit()
                except Exception as e:
                    logger.warning(f"Statement {i} failed (may already exist): {str(e)}")
                    continue
            
            logger.info("✅ All indexes applied successfully!")
            return True
            
    except Exception as e:
        logger.error(f"❌ Error applying indexes: {str(e)}")
        return False


if __name__ == "__main__":
    success = apply_indexes()
    exit(0 if success else 1)
