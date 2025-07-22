from database import SessionLocal, Base, sync_engine

engine = sync_engine  # Alias for clarity in main.py

def get_db():
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close() 