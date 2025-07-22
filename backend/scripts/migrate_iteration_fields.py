#!/usr/bin/env python3
"""
Migration script to add iteration fields to the ideas table.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from database import DATABASE_URL

def migrate_iteration_fields():
    """Add iteration fields to the ideas table."""
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as conn:
        # Add new iteration fields
        migration_sql = """
        ALTER TABLE ideas 
        ADD COLUMN IF NOT EXISTS business_model TEXT,
        ADD COLUMN IF NOT EXISTS market_positioning TEXT,
        ADD COLUMN IF NOT EXISTS revenue_streams TEXT,
        ADD COLUMN IF NOT EXISTS target_audience TEXT,
        ADD COLUMN IF NOT EXISTS competitive_advantage TEXT,
        ADD COLUMN IF NOT EXISTS go_to_market_strategy TEXT,
        ADD COLUMN IF NOT EXISTS success_metrics TEXT,
        ADD COLUMN IF NOT EXISTS risk_factors TEXT,
        ADD COLUMN IF NOT EXISTS iteration_notes TEXT;
        """
        
        try:
            conn.execute(text(migration_sql))
            conn.commit()
            print("✅ Successfully added iteration fields to ideas table")
        except Exception as e:
            print(f"❌ Error adding iteration fields: {e}")
            conn.rollback()
            raise

if __name__ == "__main__":
    print("🔄 Starting iteration fields migration...")
    migrate_iteration_fields()
    print("✅ Migration completed successfully!") 