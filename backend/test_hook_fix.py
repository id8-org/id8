#!/usr/bin/env python3
"""
Test script to verify that the hook field fix is working
"""

import sys
import os
sys.path.append('.')

from app.prompts import AI_IDEA_PROMPT
from app.llm import sanitize_idea_fields, validate_idea_dict

def test_hook_in_prompt():
    """Test that the hook field is in the AI_IDEA_PROMPT"""
    print("🔍 Testing hook field in AI_IDEA_PROMPT...")
    if "hook" in AI_IDEA_PROMPT:
        print("✅ Hook field found in AI_IDEA_PROMPT")
        return True
    else:
        print("❌ Hook field NOT found in AI_IDEA_PROMPT")
        return False

def test_sanitize_idea_fields():
    """Test that sanitize_idea_fields properly handles the hook field"""
    print("\n🔍 Testing sanitize_idea_fields...")
    
    # Test case 1: Idea with hook field from new AI_IDEA_PROMPT
    test_idea = {
        "idea_name": "TestSaaS",
        "hook": "A revolutionary SaaS platform that transforms business operations",
        "scope_commitment": "full-time venture requiring 6 months to MVP",
        "source_of_inspiration": "market gap",
        "problem_statement": "Businesses struggle with inefficient operations",
        "elevator_pitch": "We solve operational inefficiencies with AI-powered automation",
        "core_assumptions": ["Businesses want efficiency", "AI can automate tasks"],
        "riskiest_assumptions": ["Market adoption will be slow"],
        "target_audience": "B2B SaaS companies, US, 25-45",
        "overall_score": 8.5,
        "effort_score": 4.0,
        "evidence_reference": {"title": "Market Report", "url": "https://example.com"},
        "generation_notes": "Generated based on user context"
    }
    
    result = sanitize_idea_fields(test_idea)
    print(f"Input idea keys: {list(test_idea.keys())}")
    print(f"Output idea keys: {list(result.keys())}")
    
    # Check that hook field is preserved
    if "hook" in result and result["hook"]:
        print("✅ Hook field preserved in sanitize_idea_fields")
        return True
    else:
        print("❌ Hook field missing or empty in sanitize_idea_fields")
        return False

def test_validate_idea_dict():
    """Test that validate_idea_dict accepts ideas with hook field"""
    print("\n🔍 Testing validate_idea_dict...")
    
    # Test case: Valid idea with all required fields including hook
    valid_idea = {
        "title": "TestSaaS",
        "hook": "A revolutionary SaaS platform that transforms business operations",
        "value": "We solve operational inefficiencies with AI-powered automation",
        "evidence": "Market research shows 80% of businesses struggle with efficiency",
        "differentiator": "Our AI approach is 3x more effective than competitors",
        "call_to_action": "Start your free trial today",
        "score": 8,
        "mvp_effort": 5,
        "type": "side_hustle",
        "assumptions": ["Businesses want efficiency", "AI can automate tasks"],
        "repo_usage": "AI-generated idea"
    }
    
    is_valid = validate_idea_dict(valid_idea)
    if is_valid:
        print("✅ validate_idea_dict accepts idea with hook field")
        return True
    else:
        print("❌ validate_idea_dict rejects idea with hook field")
        return False

def main():
    """Run all tests"""
    print("🧪 Testing Hook Field Fix\n")
    
    tests = [
        test_hook_in_prompt,
        test_sanitize_idea_fields,
        test_validate_idea_dict
    ]
    
    results = []
    for test in tests:
        try:
            result = test()
            results.append(result)
        except Exception as e:
            print(f"❌ Test failed with error: {e}")
            results.append(False)
    
    print(f"\n📊 Test Results: {sum(results)}/{len(results)} tests passed")
    
    if all(results):
        print("🎉 All tests passed! Hook field fix is working correctly.")
        return True
    else:
        print("⚠️  Some tests failed. Hook field fix may have issues.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 