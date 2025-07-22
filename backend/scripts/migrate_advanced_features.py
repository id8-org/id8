#!/usr/bin/env python3
"""
Migration script to add advanced features tables
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from database import Base
from app.models import CaseStudy, MarketSnapshot, LensInsight, VCThesisComparison, InvestorDeck
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate_advanced_features():
    """Create tables for advanced features"""
    try:
        # Get database URL from environment
        database_url = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/generator")
        
        # Create engine
        engine = create_engine(database_url)
        
        logger.info("Creating advanced features tables...")
        
        # Create tables
        Base.metadata.create_all(bind=engine, tables=[
            CaseStudy.__table__,
            MarketSnapshot.__table__,
            LensInsight.__table__,
            VCThesisComparison.__table__,
            InvestorDeck.__table__
        ])
        
        logger.info("✅ Advanced features tables created successfully!")
        
        # Verify tables exist
        with engine.connect() as conn:
            tables_to_check = ["case_studies", "market_snapshots", "lens_insights", "vc_thesis_comparisons", "investor_decks"]
            for table in tables_to_check:
                result = conn.execute(text(f"SELECT 1 FROM {table} LIMIT 1"))
                logger.info(f"✅ Table {table} exists and is accessible")
        
    except Exception as e:
        logger.error(f"❌ Error creating advanced features tables: {e}")
        raise

if __name__ == "__main__":
    migrate_advanced_features() 