#!/usr/bin/env python3
"""
Test script for the enhanced GitHub trending service
"""

import asyncio
import sys
import os

# Add the app directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services.github import github_service

async def test_github_service():
    """Test the enhanced GitHub trending service"""
    print("🧪 Testing Enhanced GitHub Trending Service")
    print("=" * 50)
    
    # Test single language fetch
    print("\n1. Testing single language fetch (Python)...")
    try:
        repos = await github_service.fetch_trending("Python", "daily")
        print(f"✅ Successfully fetched {len(repos)} Python repositories")
        if repos:
            print(f"   First repo: {repos[0]['name']}")
            print(f"   URL: {repos[0]['url']}")
            print(f"   Language: {repos[0]['language']}")
            print(f"   Stars: {repos[0]['stargazers_count']}")
            print(f"   Forks: {repos[0]['forks_count']}")
    except Exception as e:
        print(f"❌ Failed to fetch Python repos: {e}")
    
    # Test multiple languages fetch
    print("\n2. Testing multiple languages fetch...")
    try:
        languages = ["Python", "JavaScript", "TypeScript"]
        all_repos = await github_service.fetch_multiple_languages(languages, "daily")
        print(f"✅ Successfully fetched {len(all_repos)} total repositories")
        
        # Group by language
        by_language = {}
        for repo in all_repos:
            lang = repo.get('language', 'Unknown')
            by_language[lang] = by_language.get(lang, 0) + 1
        
        print("   Repositories by language:")
        for lang, count in by_language.items():
            print(f"     {lang}: {count}")
            
    except Exception as e:
        print(f"❌ Failed to fetch multiple languages: {e}")
    
    # Test error handling
    print("\n3. Testing error handling (invalid language)...")
    try:
        repos = await github_service.fetch_trending("InvalidLanguage123", "daily")
        print(f"   Result: {len(repos)} repos (expected 0)")
    except Exception as e:
        print(f"   Error handled: {e}")
    
    print("\n" + "=" * 50)
    print("🎉 GitHub service test completed!")

if __name__ == "__main__":
    asyncio.run(test_github_service()) 