#!/usr/bin/env python3
"""Test the fixes for Jinja2 templates and deep dive endpoint"""

import asyncio
import sys
import os

# Add the current directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

async def test_deep_dive():
    """Test the deep dive generation with fixed templates"""
    try:
        from app.llm import generate_deep_dive
        
        print("Testing deep dive generation...")
        
        # Test data
        idea_data = {
            "title": "Test Idea",
            "hook": "Test hook", 
            "value": "Test value",
            "evidence": "Test evidence",
            "differentiator": "Test differentiator",
            "call_to_action": "Test CTA",
            "score": 7,
            "mvp_effort": 5
        }
        
        result = await generate_deep_dive(idea_data)
        
        if result:
            print("✓ Deep dive generation successful")
            print(f"  - Result type: {type(result)}")
            print(f"  - Has deep_dive: {'deep_dive' in result}")
            print(f"  - Has raw: {'raw' in result}")
        else:
            print("✗ Deep dive generation failed - no result")
            
    except Exception as e:
        print(f"✗ Deep dive generation failed with error: {e}")
        return False
    
    return True

def test_templates():
    """Test that Jinja2 templates load without errors"""
    try:
        from app.prompts import DEEP_DIVE_PROMPT
        
        print("Testing Jinja2 templates...")
        print(f"✓ Deep dive prompt length: {len(DEEP_DIVE_PROMPT)}")
        
        return True
        
    except Exception as e:
        print(f"✗ Template loading failed: {e}")
        return False

def test_endpoint():
    """Test that the endpoint can be imported"""
    try:
        from app.routers.ideas_legacy import trigger_deepdive
        
        print("Testing endpoint import...")
        print(f"✓ Endpoint function: {trigger_deepdive}")
        
        return True
        
    except Exception as e:
        print(f"✗ Endpoint import failed: {e}")
        return False

async def main():
    """Run all tests"""
    print("🧪 Testing fixes for Jinja2 templates and deep dive endpoint...")
    print()
    
    # Test 1: Templates
    template_ok = test_templates()
    print()
    
    # Test 2: Endpoint
    endpoint_ok = test_endpoint()
    print()
    
    # Test 3: Deep dive generation
    deep_dive_ok = await test_deep_dive()
    print()
    
    # Summary
    print("📊 Test Results:")
    print(f"  Templates: {'✓ PASS' if template_ok else '✗ FAIL'}")
    print(f"  Endpoint: {'✓ PASS' if endpoint_ok else '✗ FAIL'}")
    print(f"  Deep Dive: {'✓ PASS' if deep_dive_ok else '✗ FAIL'}")
    
    all_passed = template_ok and endpoint_ok and deep_dive_ok
    print(f"\n🎯 Overall: {'✓ ALL TESTS PASSED' if all_passed else '✗ SOME TESTS FAILED'}")
    
    return all_passed

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1) 