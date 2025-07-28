#!/usr/bin/env python3
"""
Script to parse existing deep dive raw responses and update the table data.
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

def parse_existing_deep_dives():
    """Parse existing deep dive raw responses and update table data."""
    db = None
    try:
        # Create database session
        db = Session(sync_engine)
        
        # Find all ideas with deep_dive_raw_response
        ideas = db.query(Idea).filter(
            Idea.deep_dive_raw_response.isnot(None),
            Idea.deep_dive_raw_response != ''
        ).all()
        
        logger.info(f"Found {len(ideas)} ideas with deep_dive_raw_response")
        
        for idea in ideas:
            try:
                logger.info(f"Processing idea {idea.id}: {idea.title}")
                
                # Parse the raw response
                raw_response = str(idea.deep_dive_raw_response)
                parsed_data = parse_deep_dive_response(raw_response)
                
                logger.info(f"Parsed data type: {type(parsed_data)}")
                
                # Convert to dict for storage
                if hasattr(parsed_data, 'model_dump'):
                    deep_dive_dict = parsed_data.model_dump()
                    logger.info("Used model_dump() method")
                elif hasattr(parsed_data, 'dict'):
                    deep_dive_dict = parsed_data.dict()
                    logger.info("Used dict() method")
                elif isinstance(parsed_data, dict):
                    deep_dive_dict = parsed_data
                    logger.info("Already a dict")
                else:
                    logger.warning(f"Could not convert parsed data: {type(parsed_data)}")
                    continue
                
                logger.info(f"Deep dive dict keys: {list(deep_dive_dict.keys())}")
                
                # Update the idea with parsed data
                setattr(idea, 'deep_dive_table', deep_dive_dict)
                
                logger.info(f"Successfully updated deep dive data for idea {idea.id}")
                
            except Exception as e:
                logger.error(f"Error processing idea {idea.id}: {e}")
                continue
        
        # Commit all changes
        db.commit()
        logger.info("All changes committed successfully")
        
    except Exception as e:
        logger.error(f"Error during parsing: {e}")
        if db:
            db.rollback()
        raise
    finally:
        if db:
            db.close()

if __name__ == "__main__":
    parse_existing_deep_dives() 