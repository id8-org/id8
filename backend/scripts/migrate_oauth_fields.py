#!/usr/bin/env python3
"""
Migration script to add OAuth fields to User table
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from database import sync_engine
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate_oauth_fields():
    """Add OAuth fields to User table"""
    with sync_engine.connect() as conn:
        try:
            # Check if OAuth fields already exist
            result = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'users' 
                AND column_name IN ('oauth_provider', 'oauth_id', 'oauth_picture')
            """))
            
            existing_columns = [row[0] for row in result.fetchall()]
            
            if not existing_columns:
                logger.info("Adding OAuth fields to users table...")
                
                # Add OAuth fields
                conn.execute(text("""
                    ALTER TABLE users 
                    ADD COLUMN oauth_provider VARCHAR,
                    ADD COLUMN oauth_id VARCHAR,
                    ADD COLUMN oauth_picture VARCHAR
                """))
                
                # Make password_hash nullable for OAuth users
                conn.execute(text("""
                    ALTER TABLE users 
                    ALTER COLUMN password_hash DROP NOT NULL
                """))
                
                # Add indexes for OAuth fields
                conn.execute(text("""
                    CREATE INDEX IF NOT EXISTS idx_users_oauth_provider 
                    ON users(oauth_provider)
                """))
                
                conn.execute(text("""
                    CREATE INDEX IF NOT EXISTS idx_users_oauth_id 
                    ON users(oauth_id)
                """))
                
                # Update existing users to have 'email' as oauth_provider
                conn.execute(text("""
                    UPDATE users 
                    SET oauth_provider = 'email' 
                    WHERE oauth_provider IS NULL
                """))
                
                conn.commit()
                logger.info("✅ OAuth fields added successfully!")
                
            else:
                logger.info("OAuth fields already exist. Skipping migration.")
                
        except Exception as e:
            logger.error(f"❌ Error during migration: {e}")
            conn.rollback()
            raise

if __name__ == "__main__":
    logger.info("Starting OAuth fields migration...")
    migrate_oauth_fields()
    logger.info("Migration completed!") 