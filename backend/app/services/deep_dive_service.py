from sqlalchemy.orm import Session
from app.models import DeepDiveVersion
from typing import Any

def save_deep_dive(db: Session, idea_id: int, data: dict[str, Any], version: int, llm_raw_response: str | None = None) -> DeepDiveVersion:
    deep_dive = DeepDiveVersion(idea_id=idea_id)
    deep_dive.fields = data  # type: ignore[assignment]
    deep_dive.version_number = version  # type: ignore[assignment]
    deep_dive.llm_raw_response = llm_raw_response  # type: ignore[assignment]
    db.add(deep_dive)
    db.commit()
    db.refresh(deep_dive)
    return deep_dive

def get_deep_dive_by_idea_id(db: Session, idea_id: int) -> DeepDiveVersion | None:
    return db.query(DeepDiveVersion).filter(DeepDiveVersion.idea_id == idea_id).first()

def get_deep_dive_by_id(db: Session, deep_dive_id: int) -> DeepDiveVersion | None:
    return db.query(DeepDiveVersion).filter(DeepDiveVersion.id == deep_dive_id).first()

def update_deep_dive(db: Session, deep_dive_id: int, data: dict[str, Any], version: int, llm_raw_response: str | None = None) -> DeepDiveVersion | None:
    deep_dive = db.query(DeepDiveVersion).filter(DeepDiveVersion.id == deep_dive_id).first()
    if deep_dive:
        deep_dive.fields = data  # type: ignore[assignment]
        deep_dive.version_number = version  # type: ignore[assignment]
        deep_dive.llm_raw_response = llm_raw_response  # type: ignore[assignment]
        db.commit()
        db.refresh(deep_dive)
    return deep_dive

def delete_deep_dive(db: Session, deep_dive_id: str) -> bool:
    deep_dive = db.query(DeepDiveVersion).filter(DeepDiveVersion.id == deep_dive_id).first()
    if not deep_dive:
        return False
    db.delete(deep_dive)
    db.commit()
    return True 