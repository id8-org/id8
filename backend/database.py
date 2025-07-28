import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import declarative_base, sessionmaker

# Load environment variables
load_dotenv()

# Load database URL from environment variable
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@db:5432/ideas")

# Create sync engine for migrations and sync operations
if DATABASE_URL.startswith("sqlite"):
    sync_engine = create_engine(DATABASE_URL, echo=False, connect_args={"check_same_thread": False})
    # SQLite doesn't support async, so use sync for both
    async_engine = None
    AsyncSessionLocal = None
else:
    sync_engine = create_engine(DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://"), echo=False)
    # Create async engine for async operations
    async_database_url = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")
    async_engine = create_async_engine(async_database_url, echo=False)
    AsyncSessionLocal = sessionmaker(async_engine, class_=AsyncSession, expire_on_commit=False)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=sync_engine)

Base = declarative_base()

# Dependency for sync database sessions
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Dependency for async database sessions
async def get_async_db():
    if AsyncSessionLocal is None:
        # Fallback to sync session for SQLite
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()
    else:
        async with AsyncSessionLocal() as session:
            try:
                yield session
            finally:
                await session.close()
