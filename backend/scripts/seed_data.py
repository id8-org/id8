#!/usr/bin/env python3
"""
Seed data script
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from app.models import Repo

def seed_data():
    """Seed the database with initial data"""
    db = SessionLocal()
    try:
        # Add some sample repos
        repos = [
            Repo(
                name="sample-repo-1",
                url="https://github.com/example/sample-repo-1",
                summary="A sample repository for testing",
                language="Python"
            ),
            Repo(
                name="sample-repo-2", 
                url="https://github.com/example/sample-repo-2",
                summary="Another sample repository",
                language="JavaScript"
            )
        ]
        
        for repo in repos:
            db.add(repo)
        
        db.commit()
        print("✅ Sample data seeded successfully!")
        
    except Exception as e:
        print(f"❌ Error seeding data: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()
