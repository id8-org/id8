# backend/app/routers/repos.py

from fastapi import APIRouter, Query, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db import get_db
from app.models import Repo
from app.schemas import RepoOut
from app.services.github import github_service, refresh_trending_repos, clear_repo_cache
from app.utilities import save_repos
import logging

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/repos", tags=["repos"])


@router.get("/", response_model=List[RepoOut])
def list_repos(
    period: str = Query("daily", enum=["daily", "weekly", "monthly"]),
    language: Optional[str] = None,
    min_score: Optional[int] = None,
    db: Session = Depends(get_db)
):
    try:
        query = db.query(Repo).filter(Repo.trending_period == period)
        if language:
            query = query.filter(Repo.language.ilike(language))
        if min_score is not None:
            query = query.filter(Repo.score >= min_score)
        return query.all()
    except Exception as e:
        logger.error(f"Error fetching repositories: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch repositories")


@router.post("/refresh")
async def refresh_repos(
    period: str = Query("daily", enum=["daily", "weekly", "monthly"]),
    languages: Optional[str] = Query(None, description="Comma-separated list of languages"),
    db: Session = Depends(get_db)
):
    """
    Refresh trending repositories using the enhanced GitHub service.
    """
    try:
        # Parse languages parameter
        lang_list = None
        if languages:
            lang_list = [lang.strip() for lang in languages.split(",")]
        
        # Clear cache first
        await clear_repo_cache()
        
        # Use the enhanced service to refresh trending repos
        saved_count = await refresh_trending_repos(db, lang_list, period)
        
        return {
            "status": "success",
            "message": f"Refreshed {saved_count} trending repositories using enhanced GitHub service",
            "period": period,
            "languages": lang_list or ["Python", "TypeScript", "JavaScript", "Rust", "Go", "Ruby"],
            "service": "enhanced_github_trending"
        }
        
    except Exception as e:
        logger.error(f"Error refreshing repos: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to refresh repositories: {str(e)}")


@router.get("/health")
def repo_health_check(db: Session = Depends(get_db)):
    """Health check for repository service"""
    try:
        repo_count = db.query(Repo).count()
        return {
            "status": "healthy",
            "total_repos": repo_count,
            "service": "enhanced_github_trending"
        }
    except Exception as e:
        logger.error(f"Repository health check failed: {e}")
        raise HTTPException(status_code=500, detail="Repository service unhealthy")


@router.post("/load")
async def load_trending(
    period: str = Query("daily", enum=["daily", "weekly", "monthly"]),
    languages: Optional[str] = Query(None, description="Comma-separated list of languages"),
    db: Session = Depends(get_db)
):
    """
    Load trending repositories using the enhanced GitHub service.
    """
    try:
        # Parse languages parameter
        if languages:
            lang_list = [lang.strip() for lang in languages.split(",")]
        else:
            lang_list = ["Python", "TypeScript", "JavaScript", "Rust", "Go", "Ruby"]
        
        logger.info(f"Loading trending repos for languages: {lang_list}")
        
        # Use the enhanced service to fetch repos
        repos = await github_service.fetch_multiple_languages(lang_list, period)
        
        if not repos:
            logger.warning("No repos fetched from GitHub")
            return {
                "status": "warning",
                "message": "No repositories fetched from GitHub",
                "loaded": 0,
                "period": period,
                "languages": lang_list
            }
        
        # Save repos to database
        saved_count = save_repos(repos, db, period)
        
        logger.info(f"Successfully loaded {saved_count} repositories")
        
        return {
            "status": "success",
            "message": f"Loaded {saved_count} trending repositories",
            "loaded": saved_count,
            "period": period,
            "languages": lang_list,
            "service": "enhanced_github_trending"
        }
        
    except Exception as e:
        logger.error(f"Error loading trending repos: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to load trending repos: {str(e)}")


@router.get("/stats")
def get_repo_stats(db: Session = Depends(get_db)):
    """Get repository statistics"""
    try:
        total_repos = db.query(Repo).count()
        
        # Get repos by language
        from sqlalchemy import func
        language_stats = db.query(
            Repo.language,
            func.count(Repo.id).label('count')
        ).group_by(Repo.language).all()
        
        # Get repos by period
        period_stats = db.query(
            Repo.trending_period,
            func.count(Repo.id).label('count')
        ).group_by(Repo.trending_period).all()
        
        return {
            "total_repos": total_repos,
            "by_language": {lang: count for lang, count in language_stats},
            "by_period": {period: count for period, count in period_stats},
            "service": "enhanced_github_trending"
        }
        
    except Exception as e:
        logger.error(f"Error getting repo stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to get repository statistics")


@router.post("/clear-cache")
async def clear_cache():
    """
    Clear repository cache to force fresh data fetches.
    """
    try:
        await clear_repo_cache()
        return {
            "status": "success",
            "message": "Repository cache cleared successfully"
        }
    except Exception as e:
        logger.error(f"Error clearing cache: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to clear cache: {str(e)}")


@router.get("/languages", response_model=List[str])
def list_languages(db: Session = Depends(get_db)):
    try:
        langs = db.query(Repo.language).distinct().all()
        return [lang[0] for lang in langs if lang[0]]
    except Exception as e:
        logger.error(f"Error fetching languages: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch languages")
