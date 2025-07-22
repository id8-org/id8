from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import List, Any
from app.models import Idea, Iterating
from app.schemas import IteratingExperiment
from app.db import get_db
import uuid
from app.llm import generate_iteration_experiment_pydanticai
from datetime import datetime

router = APIRouter(prefix="/iterating", tags=["iterating"])

@router.get("/idea/{idea_id}", response_model=List[dict[str, Any]])
def get_iteratings_for_idea(idea_id: str, db: Session = Depends(get_db)):
    iteratings = db.query(Iterating).filter(Iterating.idea_id == idea_id).order_by(Iterating.created_at).all()
    return [i.data for i in iteratings]

@router.post("/propose-experiment", response_model=IteratingExperiment)
async def propose_experiment(
    idea_id: str = Body(...),
    db: Session = Depends(get_db)
):
    idea = db.query(Idea).filter(Idea.id == idea_id).first()
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")
    assumptions = getattr(idea, 'assumptions', [])
    prior_logs = db.query(Iterating).filter(Iterating.idea_id == idea_id).order_by(Iterating.created_at).all()
    prior_logs_data = [getattr(log, 'data', {}) for log in prior_logs]
    context = {
        "idea": idea.title if hasattr(idea, 'title') else str(idea),
        "assumptions": assumptions,
        "prior_logs": prior_logs_data,
    }
    result = await generate_iteration_experiment_pydanticai(context)
    if not result or not result.get("experiment"):
        raise HTTPException(status_code=500, detail="Failed to generate experiment proposal")
    return result["experiment"]

@router.post("/submit-experiment")
async def submit_experiment(
    idea_id: str = Body(...),
    experiment: IteratingExperiment = Body(...),
    db: Session = Depends(get_db)
):
    idea = db.query(Idea).filter(Idea.id == idea_id).first()
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")
    latest = db.query(Iterating).filter(Iterating.idea_id == idea_id).order_by(Iterating.version.desc()).first()
    next_version = (latest.version + 1) if latest else 1
    new_iterating = Iterating(
        id=str(uuid.uuid4()),
        idea_id=idea_id,
        data=experiment.dict(),
        version=next_version,
        llm_raw_response=None,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(new_iterating)
    db.commit()
    db.refresh(new_iterating)
    return {"success": True, "id": new_iterating.id, "version": new_iterating.version} 