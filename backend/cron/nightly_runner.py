import asyncio
import os
import sys
import time
import httpx
sys.path.append('/app')
from app.services.pitch_generation import run_nightly_pipeline

def init_database():
    """Initialize database tables if they don't exist"""
    try:
        print("🗄️ Initializing database tables...")
        from init_db import init_database as init_db
        init_db()
        print("✅ Database tables initialized!")
        return True
    except Exception as e:
        print(f"❌ Failed to initialize database: {e}")
        return False

def wait_for_database():
    """Wait for database tables to be ready by checking the backend API"""
    max_attempts = 30
    attempt = 0
    
    while attempt < max_attempts:
        try:
            # Check the backend's database readiness endpoint
            response = httpx.get("http://backend:8000/db-ready", timeout=10)
            if response.status_code == 200:
                print("✅ Database tables are ready!")
                return True
            else:
                print(f"⏳ Database not ready yet (status: {response.status_code})")
        except Exception:
            print(f"⏳ Waiting for database tables... (attempt {attempt + 1}/{max_attempts})")
        
        attempt += 1
        time.sleep(10)  # Wait 10 seconds between attempts
    
    print("❌ Database tables not ready after maximum attempts")
    return False

if __name__ == "__main__":
    # First, try to initialize the database ourselves
    if not init_database():
        print("⚠️ Could not initialize database, waiting for backend...")
        # If that fails, wait for the backend to do it
        if not wait_for_database():
            sys.exit(1)
    
    # Check if the nightly pipeline is enabled via environment variable
    run_pipeline = os.getenv("RUN_NIGHTLY_PIPELINE", "false").lower() in ("true", "1", "t", "yes")
    
    if run_pipeline:
        print("✅ Nightly pipeline is enabled. Starting...")
        asyncio.run(run_nightly_pipeline())
    else:
        print("🚫 Nightly pipeline is disabled. Skipping.")
        # Keep the container running without executing the pipeline
        while True:
            time.sleep(3600) # Sleep for an hour
