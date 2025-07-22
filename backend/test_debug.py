#!/usr/bin/env python3
"""
Test script to verify debugging functionality for suggested-stage fields
"""

import sys
import os
sys.path.append('.')

from app.llm import sanitize_idea_fields

def test_sanitize_idea_fields():
    """Test the sanitize_idea_fields function with sample data"""
    print("🔍 Testing sanitize_idea_fields function...")
    
    # Test case 1: Idea with all new fields
    test_idea = {
        "title": "Test Idea",
        "hook": "This is a test hook",
        "value": "This is a test value",
        "score": 7.5,
        "mvp_effort": 6.0,
        "scope_commitment": "Full-time commitment",
        "source_of_inspiration": "Personal experience",
        "problem_statement": "Users struggle with X",
        "elevator_pitch": "We solve X by doing Y",
        "core_assumptions": ["Assumption 1", "Assumption 2"],
        "riskiest_assumptions": ["Risk 1", "Risk 2"],
        "generation_notes": "Generated based on user context"
    }
    
    print(f"Input idea keys: {list(test_idea.keys())}")
    result = sanitize_idea_fields(test_idea)
    print(f"Output idea keys: {list(result.keys())}")
    
    # Test case 2: Idea with missing new fields
    test_idea_missing = {
        "title": "Test Idea 2",
        "hook": "This is another test hook",
        "value": "This is another test value",
        "score": 8.0,
        "mvp_effort": 5.0
    }
    
    print(f"\nInput idea (missing fields) keys: {list(test_idea_missing.keys())}")
    result_missing = sanitize_idea_fields(test_idea_missing)
    print(f"Output idea (missing fields) keys: {list(result_missing.keys())}")
    
    print("\n✅ Test completed successfully!")

if __name__ == "__main__":
    test_sanitize_idea_fields() 