from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db import get_db
from app.auth import get_current_active_user
from app.models import Notification, User
from app.schemas import NotificationOut
from typing import List

router = APIRouter(prefix="/api/notifications", tags=["notifications"])

@router.get("/", response_model=List[NotificationOut])
async def list_notifications(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    notifications = db.query(Notification).filter(Notification.user_id == current_user.id).order_by(Notification.created_at.desc()).all()
    return notifications

@router.post("/mark-read")
async def mark_notifications_read(ids: List[str], current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    updated = db.query(Notification).filter(Notification.user_id == current_user.id, Notification.id.in_(ids)).update({Notification.read: True}, synchronize_session=False)
    db.commit()
    return {"success": True, "updated": updated} 