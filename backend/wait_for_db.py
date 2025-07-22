#!/usr/bin/env python3
"""
Script to wait for database to be ready before starting the application
"""
import os
import time
import psycopg2
from psycopg2 import OperationalError

def wait_for_db():
    """Wait for database to be ready"""
    database_url = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@db:5432/app")
    
    # Convert async URL to sync URL for psycopg2
    if database_url.startswith("postgresql+asyncpg://"):
        database_url = database_url.replace("postgresql+asyncpg://", "postgresql://")
    
    # Connect to the default 'postgres' database instead of 'app' (which doesn't exist yet)
    # Extract connection details from the URL
    if database_url.startswith("postgresql://"):
        url_part = database_url[13:]  # Remove postgresql:// prefix
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
            host_port, _ = rest.split("/", 1)  # Ignore the database name
        else:
            host_port = rest
        
        if ":" in host_port:
            host, port = host_port.split(":", 1)
        else:
            host, port = host_port, "5432"
    else:
        raise ValueError(f"Invalid database URL format: {database_url}")
    
    # Connect to the default 'postgres' database
    postgres_url = f"postgresql://{username}:{password}@{host}:{port}/postgres"
    
    print("Waiting for PostgreSQL server to be ready...")
    
    max_attempts = 30
    attempt = 0
    
    while attempt < max_attempts:
        try:
            conn = psycopg2.connect(postgres_url)
            conn.close()
            print("PostgreSQL server is ready!")
            return True
        except OperationalError as e:
            attempt += 1
            print(f"PostgreSQL server not ready yet (attempt {attempt}/{max_attempts}): {e}")
            time.sleep(2)
    
    print("Failed to connect to PostgreSQL server after maximum attempts")
    return False

if __name__ == "__main__":
    if wait_for_db():
        exit(0)
    else:
        exit(1) 