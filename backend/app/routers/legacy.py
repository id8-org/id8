from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db import get_db
from app.models import Idea
from app.schemas import IdeaOut
import logging

# --- Legacy/Experimental Imports ---
try:
    from crud import get_ideas_for_repo, save_deep_dive, get_or_create_repo
except ImportError:
    get_ideas_for_repo = save_deep_dive = get_or_create_repo = None
try:
    from app.services.github import fetch_trending
except ImportError:
    fetch_trending = None

router = APIRouter(prefix="/legacy", tags=["Legacy", "Experimental"])

logger = logging.getLogger(__name__)

# --- Legacy Ideas Endpoints ---
@router.get("/ideas/repo/{repo_id}", response_model=List[IdeaOut])
def list_by_repo(repo_id: str, db: Session = Depends(get_db)):
    if not get_ideas_for_repo:
        raise HTTPException(status_code=501, detail="get_ideas_for_repo not implemented")
    try:
        return get_ideas_for_repo(db, repo_id)
    except Exception as e:
        logger.error(f"Error fetching ideas for repo {repo_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch ideas: {str(e)}")

@router.post("/ideas/{idea_id}/deepdive")
async def trigger_deepdive(idea_id: str, db: Session = Depends(get_db)):
    """Legacy endpoint - now uses the robust deep dive system"""
    try:
        idea = db.query(Idea).filter(Idea.id == idea_id).first()
        if not idea:
            raise HTTPException(status_code=404, detail="Idea not found")
        logger.info(f"[DeepDive] Legacy endpoint called for idea {idea_id}")
        idea_data = {
            "title": idea.title,
            "hook": idea.hook,
            "value": idea.value,
            "evidence": idea.evidence,
            "differentiator": idea.differentiator,
            "score": idea.score,
            "mvp_effort": idea.mvp_effort
        }
        from app.llm_center.legacy_wrappers import generate_deep_dive
        result = await generate_deep_dive(idea_data)
        if not result:
            raise HTTPException(status_code=500, detail="Deep dive generation failed")
        deep_dive_data = result.get('deep_dive')
        raw_blob = result.get('raw') or ''
        if deep_dive_data and save_deep_dive:
            save_deep_dive(db, idea_id, deep_dive_data, raw_blob)
            db.commit()
        return {
            "status": "completed",
            "deep_dive": deep_dive_data or {},
            "message": "Deep dive analysis completed"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[DeepDive] Error in legacy endpoint for idea {idea_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate deep dive: {str(e)}")

# --- Legacy Admin Endpoints ---
@router.post("/admin/fetch-trending")
async def fetch_trending_endpoint(db: Session = Depends(get_db)):
    if not fetch_trending or not get_or_create_repo:
        raise HTTPException(status_code=501, detail="fetch_trending or get_or_create_repo not implemented")
    langs = ["Python", "JavaScript", "TypeScript", "React"]
    count = 0
    for lang in langs:
        try:
            repos = await fetch_trending(lang, "daily")
            for repo_data in repos:
                get_or_create_repo(db, repo_data)
                count += 1
        except Exception as e:
            print(f"Error fetching {lang}: {e}")
    db.commit()
    return {"imported": count}

# --- Legacy Repos Endpoints ---
from sqlalchemy.ext.asyncio import AsyncSession
try:
    from app.crud import list_repos
except ImportError:
    list_repos = None  # type: ignore

@router.get("/repos/")
async def get_repos(lang: str = None, search: str = None, db: AsyncSession = Depends()):
    if not list_repos:
        raise HTTPException(status_code=501, detail="list_repos not implemented")
    lang_arg = lang if lang is not None else ""
    search_arg = search if search is not None else ""
    return await list_repos(db, lang_arg, search_arg)  # type: ignore 