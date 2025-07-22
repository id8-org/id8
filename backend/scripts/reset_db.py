#!/usr/bin/env python3
"""
Reset database script
"""

from database import sync_engine, Base

def reset_database():
    """Drop all tables and recreate them"""
    Base.metadata.drop_all(bind=sync_engine)
    Base.metadata.create_all(bind=sync_engine)
    print("Database reset successfully!")

if __name__ == "__main__":
    reset_database() 