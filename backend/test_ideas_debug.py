#!/usr/bin/env python3
"""
Debug script to check ideas in the database
"""

import sys
import os
sys.path.append('.')

from app.db import get_db
from app.models import Idea, User

def check_ideas_in_db():
    """Check if there are any ideas in the database and their user associations"""
    print("🔍 Checking ideas in database...")
    
    db = next(get_db())
    try:
        # Get all ideas
        ideas = db.query(Idea).all()
        print(f"📊 Total ideas in database: {len(ideas)}")
        
        if ideas:
            print("\n📋 Ideas found:")
            for idea in ideas:
                print(f"  - ID: {idea.id}")
                print(f"    Title: {idea.title}")
                print(f"    User ID: {idea.user_id}")
                print(f"    Status: {idea.status}")
                print(f"    Created: {idea.created_at}")
                print(f"    Source: {idea.source_type}")
                print("    ---")
        else:
            print("❌ No ideas found in database")
        
        # Get all users
        users = db.query(User).all()
        print(f"\n👥 Total users in database: {len(users)}")
        
        if users:
            print("\n👤 Users found:")
            for user in users:
                print(f"  - ID: {user.id}")
                print(f"    Email: {user.email}")
                print(f"    Active: {user.is_active}")
                print(f"    Verified: {user.is_verified}")
                print(f"    Created: {user.created_at}")
                
                # Count ideas for this user
                user_ideas = db.query(Idea).filter(Idea.user_id == user.id).count()
                print(f"    Ideas: {user_ideas}")
                print("    ---")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_ideas_in_db() 