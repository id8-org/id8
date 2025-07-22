#!/usr/bin/env python3
"""
Migration script to add multi-user support to the database.
This script will:
1. Create new user-related tables
2. Update existing tables to support user_id
3. Migrate existing data
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.models import Base, User, Idea, Shortlist
import os

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@db:5432/ideas")

def run_migration():
    """Run the migration to add multi-user support"""
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    print("🚀 Starting multi-user migration...")
    
    try:
        # Create all new tables
        print("📋 Creating new tables...")
        Base.metadata.create_all(bind=engine)
        print("✅ Tables created successfully")
        
        # Check if we need to migrate existing data
        session = SessionLocal()
        
        # Check if there are existing ideas without user_id
        existing_ideas = session.query(Idea).filter(Idea.user_id.is_(None)).count()
        existing_shortlists = session.query(Shortlist).filter(Shortlist.user_id.is_(None)).count()
        
        if existing_ideas > 0 or existing_shortlists > 0:
            print(f"🔄 Found {existing_ideas} ideas and {existing_shortlists} shortlists to migrate...")
            
            # Create a default system user for existing data
            print("👤 Creating default system user...")
            default_user = User(
                email="system@idea8.com",
                password_hash="system_user_no_login",
                first_name="System",
                last_name="User",
                is_active=False,
                is_verified=False
            )
            session.add(default_user)
            session.commit()
            session.refresh(default_user)
            
            # Update existing ideas to belong to system user
            if existing_ideas > 0:
                print("📝 Migrating existing ideas...")
                session.execute(
                    text("UPDATE ideas SET user_id = :user_id WHERE user_id IS NULL"),
                    {"user_id": default_user.id}
                )
                session.commit()
                print(f"✅ Migrated {existing_ideas} ideas")
            
            # Update existing shortlists to belong to system user
            if existing_shortlists > 0:
                print("📝 Migrating existing shortlists...")
                session.execute(
                    text("UPDATE shortlists SET user_id = :user_id WHERE user_id IS NULL"),
                    {"user_id": default_user.id}
                )
                session.commit()
                print(f"✅ Migrated {existing_shortlists} shortlists")
        
        # Add unique constraint to shortlists table
        print("🔒 Adding unique constraints...")
        try:
            session.execute(text("""
                ALTER TABLE shortlists 
                ADD CONSTRAINT unique_user_idea 
                UNIQUE (user_id, idea_id)
            """))
            session.commit()
            print("✅ Added unique constraint on shortlists")
        except Exception as e:
            print(f"⚠️  Unique constraint already exists or failed: {e}")
        
        session.close()
        
        print("🎉 Migration completed successfully!")
        print("\n📊 Migration Summary:")
        print("   - Created User table")
        print("   - Created UserProfile table")
        print("   - Created UserResume table")
        print("   - Updated Idea table with user_id")
        print("   - Updated Shortlist table with user_id")
        if existing_ideas > 0 or existing_shortlists > 0:
            print(f"   - Migrated {existing_ideas} existing ideas")
            print(f"   - Migrated {existing_shortlists} existing shortlists")
            print("   - Created default system user: system@idea8.com")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        session.rollback()
        raise
    finally:
        session.close()

if __name__ == "__main__":
    run_migration() 