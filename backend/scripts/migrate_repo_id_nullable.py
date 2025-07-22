#!/usr/bin/env python3
"""
Migration script to make repo_id nullable in ideas table
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from database import sync_engine
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate_repo_id_nullable():
    """Make repo_id nullable in ideas table"""
    with sync_engine.connect() as conn:
        try:
            # Check if repo_id is already nullable
            result = conn.execute(text("""
                SELECT is_nullable 
                FROM information_schema.columns 
                WHERE table_name = 'ideas' 
                AND column_name = 'repo_id'
            """))
            
            row = result.fetchone()
            if row and row[0] == 'NO':
                logger.info("Making repo_id nullable in ideas table...")
                
                # Make repo_id nullable
                conn.execute(text("""
                    ALTER TABLE ideas 
                    ALTER COLUMN repo_id DROP NOT NULL
                """))
                
                conn.commit()
                logger.info("✅ repo_id made nullable successfully!")
                
            else:
                logger.info("repo_id is already nullable. Skipping migration.")
                
        except Exception as e:
            logger.error(f"❌ Error during migration: {e}")
            conn.rollback()
            raise

if __name__ == "__main__":
    logger.info("Starting repo_id nullable migration...")
    migrate_repo_id_nullable()
    logger.info("Migration completed!") 