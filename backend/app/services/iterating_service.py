from app.models import Iterating, Idea
from sqlalchemy.orm import Session
import uuid
from typing import Optional

def create_iterating(db: Session, idea_id: str, data: dict, version: int = 1, llm_raw_response: Optional[str] = None) -> Iterating:
    new_iterating = Iterating(
        id=str(uuid.uuid4()),
        idea_id=idea_id,
        data=data,  # type: ignore
        version=version,  # type: ignore
        llm_raw_response=llm_raw_response  # type: ignore
    )
    db.add(new_iterating)
    db.commit()
    db.refresh(new_iterating)
    return new_iterating

def get_iterating_by_id(db: Session, iterating_id: str) -> Optional[Iterating]:
    return db.query(Iterating).filter(Iterating.id == iterating_id).first()

def get_latest_iterating_by_idea(db: Session, idea_id: str) -> Optional[Iterating]:
    return db.query(Iterating).filter(Iterating.idea_id == idea_id).order_by(Iterating.version.desc()).first()

def update_iterating(db: Session, iterating_id: str, data: dict, version: int, llm_raw_response: Optional[str] = None) -> Optional[Iterating]:
    iterating = db.query(Iterating).filter(Iterating.id == iterating_id).first()
    if not iterating:
        return None
    iterating.data = data  # type: ignore
    iterating.version = version  # type: ignore
    iterating.llm_raw_response = llm_raw_response  # type: ignore
    db.commit()
    db.refresh(iterating)
    return iterating

def delete_iterating(db: Session, iterating_id: str) -> bool:
    iterating = db.query(Iterating).filter(Iterating.id == iterating_id).first()
    if not iterating:
        return False
    db.delete(iterating)
    db.commit()
    return True 