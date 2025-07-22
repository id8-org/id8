from sqlalchemy.orm import Session
from app.models import Suggested
from typing import Any

def save_suggested(db: Session, idea_id: int, data: dict[str, Any], version: int, llm_raw_response: str | None = None) -> Suggested:
    suggested = Suggested(idea_id=idea_id)
    suggested.data = data  # type: ignore[assignment]
    suggested.version = version  # type: ignore[assignment]
    suggested.llm_raw_response = llm_raw_response  # type: ignore[assignment]
    db.add(suggested)
    db.commit()
    db.refresh(suggested)
    return suggested

def get_suggested_by_idea_id(db: Session, idea_id: int) -> Suggested | None:
    return db.query(Suggested).filter(Suggested.idea_id == idea_id).first()

def get_suggested_by_id(db: Session, suggested_id: int) -> Suggested | None:
    return db.query(Suggested).filter(Suggested.id == suggested_id).first()

def update_suggested(db: Session, suggested_id: int, data: dict[str, Any], version: int, llm_raw_response: str | None = None) -> Suggested | None:
    suggested = db.query(Suggested).filter(Suggested.id == suggested_id).first()
    if suggested:
        suggested.data = data  # type: ignore[assignment]
        suggested.version = version  # type: ignore[assignment]
        suggested.llm_raw_response = llm_raw_response  # type: ignore[assignment]
        db.commit()
        db.refresh(suggested)
    return suggested 