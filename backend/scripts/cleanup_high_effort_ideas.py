#!/usr/bin/env python3
"""
Clean up high-effort ideas that don't meet quality criteria
"""
import os
import sys

# Add the parent directory to the path so we can import from app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db import SessionLocal
from app.models import Idea

def cleanup_high_effort_ideas():
    session = SessionLocal()
    try:
        # Find ideas that don't meet the criteria
        # Criteria: score >= 8 AND mvp_effort <= 4
        high_effort_ideas = session.query(Idea).filter(
            (Idea.score < 8) | (Idea.mvp_effort > 4) | (Idea.score.is_(None)) | (Idea.mvp_effort.is_(None))
        ).all()
        
        if not high_effort_ideas:
            print("✅ No high-effort ideas found to clean up")
            return
        
        print(f"🔍 Found {len(high_effort_ideas)} ideas that don't meet quality criteria:")
        
        for idea in high_effort_ideas:
            print(f"  - {idea.title} (Score: {idea.score}, Effort: {idea.mvp_effort})")
            session.delete(idea)
        
        session.commit()
        print(f"✅ Deleted {len(high_effort_ideas)} high-effort ideas")
        
        # Show remaining ideas
        remaining_ideas = session.query(Idea).all()
        print(f"\n📊 Remaining ideas: {len(remaining_ideas)}")
        for idea in remaining_ideas:
            print(f"  - {idea.title} (Score: {idea.score}, Effort: {idea.mvp_effort})")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        session.rollback()
    finally:
        session.close()

if __name__ == "__main__":
    cleanup_high_effort_ideas() 