# backend/init_db.py
import os
import psycopg2
from database import sync_engine, Base

def create_database_if_not_exists():
    """Create the database if it doesn't exist"""
    # Parse the DATABASE_URL to get connection details
    database_url = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@db:5432/ideas")
    
    # Extract components from the URL
    if database_url.startswith("postgresql://"):
        # Remove postgresql:// prefix
        url_part = database_url[13:]
    elif database_url.startswith("postgresql+asyncpg://"):
        # Remove postgresql+asyncpg:// prefix
        url_part = database_url[21:]
    else:
        raise ValueError(f"Unsupported database URL format: {database_url}")
    
    # Parse username:password@host:port/database
    if "@" in url_part:
        auth_part, rest = url_part.split("@", 1)
        if ":" in auth_part:
            username, password = auth_part.split(":", 1)
        else:
            username, password = auth_part, ""
        
        if "/" in rest:
            host_port, database = rest.split("/", 1)
        else:
            host_port, database = rest, ""
        
        if ":" in host_port:
            host, port = host_port.split(":", 1)
        else:
            host, port = host_port, "5432"
    else:
        raise ValueError(f"Invalid database URL format: {database_url}")
    
    # Connect to PostgreSQL server (not to a specific database)
    server_url = f"postgresql://{username}:{password}@{host}:{port}/postgres"
    
    try:
        # Use psycopg2 directly to avoid transaction block issues
        conn = psycopg2.connect(server_url)
        conn.autocommit = True  # This is crucial for CREATE DATABASE
        
        cursor = conn.cursor()
        
        # Check if our database exists
        cursor.execute("SELECT 1 FROM pg_database WHERE datname = %s", (database,))
        exists = cursor.fetchone()
        
        if not exists:
            print(f"Creating database '{database}'...")
            # Create the database
            cursor.execute(f"CREATE DATABASE {database}")
            print(f"✅ Database '{database}' created successfully!")
        else:
            print(f"✅ Database '{database}' already exists!")
        
        cursor.close()
        conn.close()
                
    except Exception as e:
        print(f"❌ Error creating database: {e}")
        # Don't raise the error if database already exists
        if "already exists" in str(e).lower():
            print(f"✅ Database '{database}' already exists (caught from error)")
            return
        raise

def init_database():
    """Initialize the database with all tables"""
    print("🔧 Initializing database...")
    
    # First, create the database if it doesn't exist
    create_database_if_not_exists()
    
    print("Creating database tables...")
    Base.metadata.create_all(bind=sync_engine)
    print("✅ Database tables created successfully!")

if __name__ == "__main__":
    init_database() 