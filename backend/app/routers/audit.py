from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
import logging
from sqlalchemy import func
from sqlalchemy.orm.attributes import InstrumentedAttribute

from ..db import get_db
from ..auth import get_current_user
from app.types import AuditLogCreate, AuditLogOut
from ..models import User, AuditLog
from app.utils.business_utils import get_client_ip, get_user_agent

logger = logging.getLogger(__name__)

router = APIRouter(tags=["audit"])

@router.post("/log", response_model=AuditLogOut)
async def log_audit_event(
    audit_data: AuditLogCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    request = None
):
    """Log an audit event for the current user"""
    try:
        audit_log = AuditLog(
            user_id=current_user.id,
            action_type=audit_data.action_type,
            resource_type=audit_data.resource_type,
            resource_id=audit_data.resource_id,
            details=audit_data.details,
            ip_address=get_client_ip(request) if request else None,
            user_agent=get_user_agent(request) if request else None
        )
        db.add(audit_log)
        db.commit()
        db.refresh(audit_log)
        
        logger.info(f"Audit log created: {audit_data.action_type} on {audit_data.resource_type} by user {current_user.id}")
        return audit_log
    except Exception as e:
        logger.error(f"Error creating audit log: {e}")
        raise HTTPException(status_code=500, detail="Failed to log audit event")

@router.get("/history", response_model=List[AuditLogOut])
async def get_audit_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    user_id: Optional[str] = Query(None, description="Filter by specific user ID"),
    action_type: Optional[str] = Query(None, description="Filter by action type"),
    resource_type: Optional[str] = Query(None, description="Filter by resource type"),
    resource_id: Optional[str] = Query(None, description="Filter by specific resource ID"),
    start_date: Optional[datetime] = Query(None, description="Start date for filtering"),
    end_date: Optional[datetime] = Query(None, description="End date for filtering"),
    limit: int = Query(100, le=1000, description="Maximum number of records to return"),
    offset: int = Query(0, ge=0, description="Number of records to skip")
):
    """Get audit history with optional filtering"""
    try:
        # Build query
        query = db.query(AuditLog).join(User)
        filters = []
        account_type = getattr(current_user, "account_type", None)
        team_id = getattr(current_user, "team_id", None)
        if isinstance(account_type, str) and account_type == 'team' and isinstance(team_id, (int, str)):
            team_member_ids = db.query(User.id).filter(User.team_id == team_id)
            filters.append(AuditLog.user_id.in_(team_member_ids))
        else:
            filters.append(AuditLog.user_id == current_user.id)
        if user_id:
            filters.append(AuditLog.user_id == user_id)
        if action_type:
            filters.append(AuditLog.action_type == action_type)
        if resource_type:
            filters.append(AuditLog.resource_type == resource_type)
        if resource_id:
            filters.append(AuditLog.resource_id == resource_id)
        if start_date:
            filters.append(AuditLog.created_at >= start_date)
        if end_date:
            filters.append(AuditLog.created_at <= end_date)
        query = query.filter(*filters)
        
        # Order by most recent first and apply pagination
        audit_logs = query.order_by(AuditLog.created_at.desc()).offset(offset).limit(limit).all()
        
        return audit_logs
    except Exception as e:
        logger.error(f"Error retrieving audit history: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve audit history")

@router.get("/stats", response_model=dict)
async def get_audit_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    days: int = Query(30, ge=1, le=365, description="Number of days to analyze")
):
    """Get audit statistics for the specified period"""
    try:
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Build base query
        query = db.query(AuditLog)
        stat_filters = []
        account_type = getattr(current_user, "account_type", None)
        team_id = getattr(current_user, "team_id", None)
        if isinstance(account_type, str) and account_type == 'team' and isinstance(team_id, (int, str)):
            team_member_ids = db.query(User.id).filter(User.team_id == team_id)
            stat_filters.append(AuditLog.user_id.in_(team_member_ids))
        else:
            stat_filters.append(AuditLog.user_id == current_user.id)
        stat_filters.append(AuditLog.created_at >= start_date)
        query = query.filter(*stat_filters)
        
        # Get statistics
        total_actions = query.count()
        
        # Action type breakdown
        action_counts = db.query(
            AuditLog.action_type,
            func.count(AuditLog.id).label('count')
        ).filter(*stat_filters).group_by(AuditLog.action_type).all()
        
        # Resource type breakdown
        resource_counts = db.query(
            AuditLog.resource_type,
            func.count(AuditLog.id).label('count')
        ).filter(*stat_filters).group_by(AuditLog.resource_type).all()
        
        # Daily activity
        daily_activity = db.query(
            func.date(AuditLog.created_at).label('date'),
            func.count(AuditLog.id).label('count')
        ).filter(*stat_filters).group_by(func.date(AuditLog.created_at)).order_by(func.date(AuditLog.created_at)).all()
        
        return {
            "total_actions": total_actions,
            "period_days": days,
            "action_breakdown": {action: count for action, count in action_counts},
            "resource_breakdown": {resource: count for resource, count in resource_counts},
            "daily_activity": [{"date": str(date), "count": count} for date, count in daily_activity]
        }
    except Exception as e:
        logger.error(f"Error retrieving audit stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve audit statistics") 