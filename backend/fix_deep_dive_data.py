#!/usr/bin/env python3
"""
Simple script to fix deep dive data by parsing existing raw responses.
Run this from the backend directory.
"""

import os
import sys
import json
import logging

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from database import sync_engine
from app.models import Idea
from app.llm import parse_deep_dive_response

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def fix_deep_dive_data():
    """Fix deep dive data by parsing existing raw responses."""
    db = None
    try:
        # Create database session
        db = Session(sync_engine)
        
        # Find all ideas that have deep_dive_raw_response but empty deep_dive_table
        ideas = db.query(Idea).filter(
            Idea.deep_dive_raw_response.isnot(None),
            Idea.deep_dive_raw_response != '',
            (Idea.deep_dive_table.is_(None) | (Idea.deep_dive_table == []))
        ).all()
        
        logger.info(f"Found {len(ideas)} ideas with raw deep dive data to fix")
        
        migrated_count = 0
        error_count = 0
        
        for idea in ideas:
            try:
                logger.info(f"Processing idea {idea.id}: {idea.title}")
                
                # Parse the raw response
                raw_response = str(idea.deep_dive_raw_response)
                parsed_data = parse_deep_dive_response(raw_response)
                
                # Convert to dict for storage
                if hasattr(parsed_data, 'model_dump'):
                    deep_dive_dict = parsed_data.model_dump()
                elif hasattr(parsed_data, 'dict'):
                    deep_dive_dict = parsed_data.dict()
                elif isinstance(parsed_data, dict):
                    deep_dive_dict = parsed_data
                else:
                    logger.warning(f"Could not convert parsed data for idea {idea.id}")
                    continue
                
                # Update the idea with parsed data
                setattr(idea, 'deep_dive_table', deep_dive_dict)
                migrated_count += 1
                
                logger.info(f"Successfully fixed deep dive data for idea {idea.id}")
                
            except Exception as e:
                logger.error(f"Error fixing deep dive data for idea {idea.id}: {e}")
                error_count += 1
                continue
        
        # Commit all changes
        db.commit()
        
        logger.info(f"Fix completed: {migrated_count} successful, {error_count} errors")
        
    except Exception as e:
        logger.error(f"Error during fix: {e}")
        if db:
            db.rollback()
        raise
    finally:
        if db:
            db.close()

if __name__ == "__main__":
    fix_deep_dive_data() 