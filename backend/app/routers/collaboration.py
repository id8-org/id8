from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import logging

from ..db import get_db
from ..auth import get_current_user
from .. import schemas
from app.models import User, Idea, IdeaCollaborator
import crud
from app.tiers import get_tier_config, get_account_type_config

logger = logging.getLogger(__name__)

router = APIRouter(tags=["collaboration"])

# Helper function to check for idea ownership
def get_idea_and_check_ownership(idea_id: str, db: Session, current_user: User) -> Idea:
    idea = db.query(Idea).filter(Idea.id == idea_id).first()
    if not idea:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Idea not found")
    if idea.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to perform this action")
    return idea

# Helper function to check for idea collaboration permissions
def get_idea_and_check_collaboration_permission(idea_id: str, db: Session, current_user: User, allowed_roles: List[str] = ['editor', 'viewer']) -> Idea:
    idea = db.query(Idea).filter(Idea.id == idea_id).first()
    if not idea:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Idea not found")
    
    # Owner has all permissions
    if idea.user_id == current_user.id:
        return idea

    # Check for collaborator role
    collaborator = db.query(IdeaCollaborator).filter(
        IdeaCollaborator.idea_id == idea_id,
        IdeaCollaborator.user_id == current_user.id
    ).first()

    if not collaborator or collaborator.role not in allowed_roles:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to perform this action")
        
    return idea

# Collaborator endpoints
@router.post("/ideas/{idea_id}/collaborators", response_model=schemas.IdeaCollaboratorOut)
def add_collaborator_to_idea(
    idea_id: str,
    collaborator: schemas.IdeaCollaboratorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tier_config = get_tier_config(current_user.tier)
    account_type_config = get_account_type_config(current_user.account_type)
    config = {**tier_config, **account_type_config}
    if not config.get("collaboration", False):
        raise HTTPException(status_code=403, detail="Collaboration is only available on Team plans.", headers={"X-Config": str(config)})
    # Enforce max_team_members
    team_count = db.query(IdeaCollaborator).filter(IdeaCollaborator.idea_id == idea_id).count()
    if team_count >= config["max_team_members"]:
        raise HTTPException(status_code=403, detail="Team member limit reached for your plan.", headers={"X-Config": str(config)})
    idea = get_idea_and_check_ownership(idea_id, db, current_user)
    user_to_add = db.query(User).filter(User.id == collaborator.user_id).first()
    if not user_to_add:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User to add not found")
    result = crud.add_collaborator(db=db, idea_id=idea_id, user_id=collaborator.user_id, role=collaborator.role)
    return {"collaborator": result, "config": config}

@router.get("/ideas/{idea_id}/collaborators", response_model=List[schemas.IdeaCollaboratorOut])
def get_idea_collaborators(
    idea_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    idea = get_idea_and_check_ownership(idea_id, db, current_user)
    return crud.get_collaborators_for_idea(db=db, idea_id=idea_id)

@router.delete("/ideas/{idea_id}/collaborators/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_collaborator_from_idea(
    idea_id: str,
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    idea = get_idea_and_check_ownership(idea_id, db, current_user)
    if not crud.remove_collaborator(db=db, idea_id=idea_id, user_id=user_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collaborator not found")
    return

# Change Proposal endpoints
@router.post("/ideas/{idea_id}/proposals", response_model=schemas.IdeaChangeProposalOut)
def submit_change_proposal(
    idea_id: str,
    proposal: schemas.IdeaChangeProposalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    idea = get_idea_and_check_collaboration_permission(idea_id, db, current_user, allowed_roles=['editor'])
    return crud.create_change_proposal(db=db, idea_id=idea_id, proposer_id=current_user.id, changes=proposal.changes)

@router.get("/ideas/{idea_id}/proposals", response_model=List[schemas.IdeaChangeProposalOut])
def get_change_proposals(
    idea_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    idea = get_idea_and_check_collaboration_permission(idea_id, db, current_user)
    return crud.get_change_proposals_for_idea(db=db, idea_id=idea_id)

@router.post("/proposals/{proposal_id}/approve", response_model=schemas.IdeaChangeProposalOut)
def approve_change_proposal(
    proposal_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    proposal = crud.get_change_proposal(db, proposal_id)
    if not proposal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proposal not found")
    
    idea = get_idea_and_check_ownership(proposal.idea_id, db, current_user)
    
    # Apply changes to the idea
    for field, value in proposal.changes.items():
        setattr(idea, field, value)
        
    db.commit()
    
    return crud.update_change_proposal_status(db=db, proposal_id=proposal_id, status="approved")

@router.post("/proposals/{proposal_id}/reject", response_model=schemas.IdeaChangeProposalOut)
def reject_change_proposal(
    proposal_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    proposal = crud.get_change_proposal(db, proposal_id)
    if not proposal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proposal not found")
        
    get_idea_and_check_ownership(proposal.idea_id, db, current_user)
    
    return crud.update_change_proposal_status(db=db, proposal_id=proposal_id, status="rejected")

# Comment endpoints
@router.post("/ideas/{idea_id}/comments", response_model=schemas.CommentOut)
def add_comment_to_idea(
    idea_id: str,
    comment: schemas.CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_idea_and_check_collaboration_permission(idea_id, db, current_user)
    return crud.create_comment(
        db=db,
        idea_id=idea_id,
        user_id=current_user.id,
        content=comment.content,
        parent_comment_id=comment.parent_comment_id,
    )

@router.get("/ideas/{idea_id}/comments", response_model=List[schemas.CommentOut])
def get_idea_comments(
    idea_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_idea_and_check_collaboration_permission(idea_id, db, current_user)
    return crud.get_comments_for_idea(db=db, idea_id=idea_id) 