#!/usr/bin/env python3
"""
Test script to manually trigger deep dive parsing for existing ideas.
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

def test_deep_dive_parsing():
    """Test deep dive parsing for existing ideas."""
    db = None
    try:
        # Create database session
        db = Session(sync_engine)
        
        # Find an idea with deep_dive_raw_response
        idea = db.query(Idea).filter(
            Idea.deep_dive_raw_response.isnot(None),
            Idea.deep_dive_raw_response != ''
        ).first()
        
        if not idea:
            logger.info("No ideas with deep_dive_raw_response found")
            return
        
        logger.info(f"Testing deep dive parsing for idea: {idea.title}")
        raw_response_str = str(idea.deep_dive_raw_response)
        logger.info(f"Raw response length: {len(raw_response_str)}")
        
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
            return
        
        logger.info(f"Deep dive dict keys: {list(deep_dive_dict.keys())}")
        
        # Update the idea with parsed data
        setattr(idea, 'deep_dive_table', deep_dive_dict)
        db.commit()
        
        logger.info(f"Successfully updated deep dive data for idea {idea.id}")
        
        # Test the as_dict method
        idea_dict = idea.as_dict()
        logger.info(f"as_dict deep_dive field: {type(idea_dict.get('deep_dive'))}")
        if idea_dict.get('deep_dive'):
            logger.info(f"Deep dive data keys: {list(idea_dict['deep_dive'].keys())}")
        
    except Exception as e:
        logger.error(f"Error during test: {e}")
        if db:
            db.rollback()
        raise
    finally:
        if db:
            db.close()

if __name__ == "__main__":
    test_deep_dive_parsing() 