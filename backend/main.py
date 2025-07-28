# backend/main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text, inspect
from app.db import SessionLocal, Base, engine
from app.routers import repos, ideas as app_ideas, auth, resume, advanced_features, collaboration, audit, iteration as iteration_router, llm as llm_router, notifications
from logging_config import setup_logging
from error_handlers import setup_error_handlers
from app.services.idea_service import seed_system_ideas_if_needed

# from app.websocket_manager import ws_manager  # Remove
# from app.llm_orchestration import call_llm_and_broadcast  # Remove
import logging
import asyncio
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request, Response
from app.models import User
from app.lifecycle_map import router as lifecycle_map_router

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Setup logging
setup_logging()

app = FastAPI(title="Idea8 API", version="1.0.0")

# Setup error handlers
setup_error_handlers(app)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8081",
        "http://127.0.0.1:8081",
        "http://localhost:8082",
        "http://127.0.0.1:8082",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:4000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers with consistent /api/ prefix
app.include_router(auth.router, prefix="/api/auth", tags=["authentication"])
app.include_router(resume.router, prefix="/api/resume", tags=["resume"])
app.include_router(repos.router, prefix="/api/repos", tags=["repos"])
app.include_router(app_ideas.router, prefix="/api/ideas", tags=["ideas"])
app.include_router(advanced_features.router, prefix="/api/advanced", tags=["advanced"])
app.include_router(collaboration.router, prefix="/api/collaboration", tags=["collaboration"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["notifications"])
app.include_router(audit.router, prefix="/api/audit", tags=["audit"])
app.include_router(iteration_router.router, prefix="/api/iterating", tags=["iterating"])
app.include_router(llm_router.router, prefix="/api/llm", tags=["llm"])
app.include_router(lifecycle_map_router, prefix="/api/lifecycle", tags=["lifecycle"])
# Removed legacy router - endpoints were experimental and unused
# app.include_router(websocket.router, tags=["websocket"])  # Remove

db_ready = False

@app.on_event("startup")
def ensure_tables_exist_and_seed():
    global db_ready
    inspector = inspect(engine)
    required_tables = ["users", "repos", "ideas", "user_profiles"]
    missing = [t for t in required_tables if not inspector.has_table(t)]
    if missing:
        # Create all tables if any are missing
        Base.metadata.create_all(bind=engine)
    db_ready = True
    # Now it's safe to check for users and seed system ideas if needed
    db = SessionLocal()
    try:
        user_count = db.query(User).count()
    except Exception as e:
        logger.error(f"Error checking user count during startup: {e}")
        user_count = 0
    finally:
        db.close()
    # System idea seeding is now handled by cronjob, not on startup
    # if user_count > 0:
    #     logger.info("Users exist. Seeding system ideas if needed...")
    #     asyncio.create_task(seed_system_ideas_if_needed())
    # else:
    #     logger.info("No users found. Skipping system idea seeding.")

class DBReadyMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if not db_ready and request.url.path not in ["/health", "/db-ready"]:
            return Response("Service Unavailable: DB not ready", status_code=503)
        return await call_next(request)

app.add_middleware(DBReadyMiddleware)

@app.get("/")
async def root():
    return {"message": "Idea8 API is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "Generator- API"}

@app.get("/db-ready")
async def database_ready():
    """Check if database tables are ready"""
    try:
        session = SessionLocal()
        # Check if key tables exist
        tables_to_check = ["users", "repos", "ideas", "user_profiles"]
        for table in tables_to_check:
            result = session.execute(text(f"SELECT 1 FROM {table} LIMIT 1"))
        session.close()
        return {"status": "ready", "message": "Database tables are ready"}
    except Exception as e:
        logger.warning(f"Database not ready: {e}")
        raise HTTPException(status_code=503, detail="Database tables not ready")

@app.post("/llm/{stage}")
async def run_llm_stage(stage: str, prompt: str):
    """
    Run LLM for a given stage, validate, retry, and broadcast results.
    """
    # Replace with your actual LLM function
    def llm_func(prompt):
        # Call Groq API here
        return "LLM raw output here"

    # validated = await call_llm_and_broadcast(stage, prompt, llm_func) # Remove
    return {"stage": stage, "validated": "LLM raw output here"} # Remove


#### n