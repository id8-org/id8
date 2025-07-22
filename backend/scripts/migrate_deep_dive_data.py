#!/usr/bin/env python3
"""
Script to migrate existing deep dive data from deep_dive_raw_response to deep_dive_table.
This will parse the raw LLM responses and convert them to the structured format expected by the frontend.
"""

import sys
import os
import json
import logging
from sqlalchemy.orm import Session
import sys
sys.path.append('..')
from database import Base, sync_engine
from app.models import Idea
from app.llm import parse_deep_dive_response

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate_deep_dive_data():
    """Migrate deep dive data from raw_response to parsed table format."""
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
        
        logger.info(f"Found {len(ideas)} ideas with raw deep dive data to migrate")
        
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
                
                logger.info(f"Successfully migrated deep dive data for idea {idea.id}")
                
            except Exception as e:
                logger.error(f"Error migrating deep dive data for idea {idea.id}: {e}")
                error_count += 1
                continue
        
        # Commit all changes
        db.commit()
        
        logger.info(f"Migration completed: {migrated_count} successful, {error_count} errors")
        
    except Exception as e:
        logger.error(f"Error during migration: {e}")
        if db:
            db.rollback()
        raise
    finally:
        if db:
            db.close()

if __name__ == "__main__":
    migrate_deep_dive_data() 