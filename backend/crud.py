from sqlalchemy.orm import Session
from app.models import Repo, Idea, Shortlist, DeepDiveVersion, IdeaCollaborator, IdeaChangeProposal, Comment
import logging
from app.services.event_bus import EventBus
import json
from app.schemas import IdeaOut
import os
from datetime import datetime
from typing import Optional
try:
    import redis
except ImportError:
    redis = None
from app import llm
from app.services.personalized_idea_service import generate_personalized_deep_dive

# Set up logging
logger = logging.getLogger(__name__)

event_bus = EventBus.get_instance()

redis_client = None
if redis:
    try:
        redis_client = redis.Redis.from_url(os.environ.get('REDIS_URL', 'redis://localhost:6379/0'))
    except Exception:
        redis_client = None

def get_or_create_repo(db: Session, repo_data: dict):
    """Get or create a repository with error handling"""
    try:
        if not repo_data.get("url"):
            raise ValueError("Repository URL is required")
            
        repo = db.query(Repo).filter(Repo.url == repo_data["url"]).first()
        if repo:
            # Update existing repo
            for k, v in repo_data.items():
                if hasattr(repo, k):
                    setattr(repo, k, v)
            logger.info(f"Updated existing repo: {repo.name}")
        else:
            # Create new repo
            repo = Repo(**repo_data)
            db.add(repo)
            logger.info(f"Created new repo: {repo.name}")
        return repo
    except Exception as e:
        logger.error(f"Error in get_or_create_repo: {e}")
        raise

def list_repos(db: Session, lang=None, search=None):
    """List repositories with filtering and error handling"""
    try:
        query = db.query(Repo)
        if lang:
            query = query.filter(Repo.language == lang)
        if search:
            query = query.filter(Repo.name.ilike(f"%{search}%"))
        return query.order_by(Repo.created_at.desc()).all()
    except Exception as e:
        logger.error(f"Error listing repos: {e}")
        raise

def get_ideas_for_repo(db: Session, repo_id: str):
    """Get ideas for a specific repository with Redis caching (using IdeaOut for serialization)"""
    try:
        if not repo_id:
            raise ValueError("Repository ID is required")
        cache_key = f"ideas:repo:{repo_id}"
        if redis_client:
            cached = redis_client.get(cache_key)
            if cached:
                logger.debug(f"Cache hit for {cache_key}")
                return [IdeaOut.model_validate(i) for i in json.loads(cached)]
        ideas = db.query(Idea).filter(Idea.repo_id == repo_id).all()
        logger.info(f"Found {len(ideas)} ideas for repo {repo_id}")
        if redis_client:
            def default_serializer(obj):
                if isinstance(obj, datetime):
                    return obj.isoformat()
                raise TypeError(f"Type {type(obj)} not serializable")
            redis_client.setex(cache_key, 300, json.dumps([IdeaOut.model_validate(i).model_dump() for i in ideas], default=default_serializer))
        return [IdeaOut.model_validate(i) for i in ideas]
    except Exception as e:
        logger.error(f"Error getting ideas for repo {repo_id}: {e}")
        raise

def create_ideas(db: Session, repo_id: str, ideas_list: list):
    """Create multiple ideas with error handling"""
    try:
        if not repo_id:
            raise ValueError("Repository ID is required")
        if not ideas_list:
            logger.warning("No ideas provided to create")
            return []
            
        ideas = []
        for idea_data in ideas_list:
            try:
                if 'mvp_effort' in idea_data and not isinstance(idea_data['mvp_effort'], int):
                    idea_data['mvp_effort'] = None
                if 'score' in idea_data and not isinstance(idea_data['score'], int):
                    idea_data['score'] = None
                if 'type' not in idea_data:
                    idea_data['type'] = None
                idea = Idea(repo_id=repo_id, **idea_data)
                ideas.append(idea)
            except Exception as e:
                logger.error(f"Error creating idea: {e}")
                continue
                
        if ideas:
            db.add_all(ideas)
            logger.info(f"Created {len(ideas)} ideas for repo {repo_id}")
        return ideas
    except Exception as e:
        logger.error(f"Error creating ideas for repo {repo_id}: {e}")
        raise

def request_deep_dive(db: Session, idea_id: str):
    """Mark an idea for a deep dive"""
    try:
        if not idea_id:
            raise ValueError("Idea ID is required")
            
        idea = db.query(Idea).filter(Idea.id == idea_id).first()
        if idea is None:
            raise ValueError(f"Idea with ID {idea_id} not found")
        idea.deep_dive_requested = True
        db.commit()
        logger.info(f"Marked deep dive as requested for idea {idea_id}")
        return True

    except Exception as e:
        logger.error(f"Error requesting deep dive for idea {idea_id}: {e}")
        # We don't want to crash the caller, just log the error
        return False

def save_deep_dive(db: Session, idea_id: str, deep_dive_data: dict, raw_blob: str = None):
    """Save deep dive data and raw LLM response for an idea with error handling"""
    try:
        if not idea_id:
            raise ValueError("Idea ID is required")
        if not deep_dive_data:
            raise ValueError("Deep dive data is required")
        idea = db.query(Idea).filter(Idea.id == idea_id).first()
        if idea is None:
            raise ValueError(f"Idea with ID {idea_id} not found")
        idea.deep_dive_table = deep_dive_data if deep_dive_data is not None else {}
        if raw_blob is not None:
            idea.deep_dive_raw_response = str(raw_blob)
        idea.deep_dive_requested = False
        logger.info(f"Saved deep dive data for idea {idea_id}")
        return True
    except Exception as e:
        logger.error(f"Error saving deep dive for idea {idea_id}: {e}")
        raise

def add_to_shortlist(db: Session, idea_id: str, user_id: str):
    if user_id is not None:
        shortlist = Shortlist(idea_id=idea_id, user_id=str(user_id))
        db.add(shortlist)
        db.commit()
        db.refresh(shortlist)
        return shortlist
    return None

def remove_from_shortlist(db: Session, idea_id: str, user_id: str):
    shortlist = db.query(Shortlist).filter(Shortlist.idea_id == idea_id, Shortlist.user_id == user_id).first()
    if shortlist:
        db.delete(shortlist)
        db.commit()
        return True
    return False

def get_shortlist_ideas(db: Session, user_id: str):
    return db.query(Shortlist).filter(Shortlist.user_id == user_id).all()

def create_deep_dive_version(db: Session, idea_id: str, fields: dict, llm_raw_response: str):
    # Find the next version number for this idea
    last = db.query(DeepDiveVersion).filter(DeepDiveVersion.idea_id == idea_id).order_by(DeepDiveVersion.version_number.desc()).first()
    next_version = 1 if not last else last.version_number + 1
    version = DeepDiveVersion(
        idea_id=idea_id,
        version_number=next_version,
        fields=fields if fields is not None else {},
        llm_raw_response=str(llm_raw_response) if llm_raw_response is not None else ""
    )
    db.add(version)
    db.commit()
    db.refresh(version)
    return version

def get_deep_dive_versions(db: Session, idea_id: str):
    return db.query(DeepDiveVersion).filter(DeepDiveVersion.idea_id == idea_id).order_by(DeepDiveVersion.version_number.desc()).all()

def get_deep_dive_version(db: Session, idea_id: str, version_number: int):
    return db.query(DeepDiveVersion).filter(DeepDiveVersion.idea_id == idea_id, DeepDiveVersion.version_number == version_number).first()

def restore_deep_dive_version(db: Session, idea_id: str, version_number: int):
    version = get_deep_dive_version(db, idea_id, version_number)
    if not version:
        return None
    idea = db.query(Idea).filter(Idea.id == idea_id).first()
    if not idea:
        return None
    idea.deep_dive_table = version.fields
    idea.deep_dive_raw_response = version.llm_raw_response
    db.commit()
    return idea

def update_idea_status(db: Session, idea_id: str, new_status: str):
    """Update the status of an idea using the event-driven service."""
    from app.services.idea_service import IdeaService
    event_bus = EventBus.get_instance()
    idea_service = IdeaService(event_bus)
    return idea_service.update_status(db, idea_id, new_status)

async def trigger_deep_dive(db: Session, idea_id: str, use_personalization: bool = True, current_user=None):
    """Trigger a deep dive analysis for an idea"""
    try:
        if not idea_id:
            raise ValueError("Idea ID is required")
            
        idea = db.query(Idea).filter(Idea.id == idea_id).first()
        if not idea:
            raise ValueError(f"Idea with ID {idea_id} not found")
        
        # Prepare idea data for analysis
        idea_data = {
            "title": idea.title,
            "hook": idea.hook,
            "value": idea.value,
            "evidence": idea.evidence,
            "differentiator": idea.differentiator,
            "score": idea.score,
            "mvp_effort": idea.mvp_effort
        }
        
        if use_personalization and current_user and current_user.id != "api_user":
            # Use personalized deep dive analysis
            result = await generate_personalized_deep_dive(idea_data, current_user, db)
        else:
            # Use generic deep dive analysis
            result = await llm.generate_deep_dive(idea_data)
        
        # Update the idea with the deep dive results
        idea.deep_dive_raw_response = result.get('raw', '')
        
        # Convert DeepDiveIdeaData to dict for storage
        deep_dive_data = result.get('deep_dive', {})
        if hasattr(deep_dive_data, 'model_dump'):
            # It's a Pydantic model
            setattr(idea, 'deep_dive_table', deep_dive_data.model_dump())
        elif hasattr(deep_dive_data, 'dict'):
            # It's an older Pydantic model
            setattr(idea, 'deep_dive_table', deep_dive_data.dict())
        elif isinstance(deep_dive_data, dict):
            # It's already a dict
            setattr(idea, 'deep_dive_table', deep_dive_data)
        else:
            # Fallback: create empty dict
            setattr(idea, 'deep_dive_table', {})
        
        # If this is a system idea being analyzed by a user, associate it with the user
        if not idea.user_id and current_user:
            idea.user_id = current_user.id
        
        db.commit()
        db.refresh(idea)
        logger.info(f"Triggered deep dive for idea {idea_id}")
        return idea
        
    except Exception as e:
        logger.error(f"Error triggering deep dive for idea {idea_id}: {e}")
        raise

# Collaboration CRUD functions

def add_collaborator(db: Session, idea_id: str, user_id: str, role: str) -> IdeaCollaborator:
    """Add a collaborator to an idea."""
    collaborator = IdeaCollaborator(idea_id=idea_id, user_id=user_id, role=role)
    db.add(collaborator)
    db.commit()
    db.refresh(collaborator)
    return collaborator

def get_collaborators_for_idea(db: Session, idea_id: str):
    """Get all collaborators for a specific idea."""
    return db.query(IdeaCollaborator).filter(IdeaCollaborator.idea_id == idea_id).all()

def remove_collaborator(db: Session, idea_id: str, user_id: str):
    """Remove a collaborator from an idea."""
    collaborator = db.query(IdeaCollaborator).filter(
        IdeaCollaborator.idea_id == idea_id,
        IdeaCollaborator.user_id == user_id
    ).first()
    if collaborator:
        db.delete(collaborator)
        db.commit()
        return True
    return False

def create_change_proposal(db: Session, idea_id: str, proposer_id: str, changes: dict) -> IdeaChangeProposal:
    """Create a new change proposal for an idea."""
    proposal = IdeaChangeProposal(idea_id=idea_id, proposer_id=proposer_id, changes=changes)
    db.add(proposal)
    db.commit()
    db.refresh(proposal)
    return proposal

def get_change_proposals_for_idea(db: Session, idea_id: str):
    """Get all change proposals for a specific idea."""
    return db.query(IdeaChangeProposal).filter(IdeaChangeProposal.idea_id == idea_id).all()

def get_change_proposal(db: Session, proposal_id: str):
    """Get a single change proposal by its ID."""
    proposal = db.query(IdeaChangeProposal).filter(IdeaChangeProposal.id == proposal_id).first()
    if proposal is None:
        raise ValueError(f"Proposal with ID {proposal_id} not found")
    return proposal

def update_change_proposal_status(db: Session, proposal_id: str, status: str, reviewed_at: Optional[datetime] = None) -> IdeaChangeProposal:
    """Update the status of a change proposal (approved, rejected)."""
    proposal = get_change_proposal(db, proposal_id)
    proposal.status = str(status)
    proposal.reviewed_at = reviewed_at if reviewed_at is not None else None
    db.commit()
    db.refresh(proposal)
    return proposal

def create_comment(db: Session, idea_id: str, user_id: str, content: str, parent_comment_id: Optional[str] = None) -> Comment:
    """Create a new comment on an idea."""
    comment = Comment(idea_id=idea_id, user_id=user_id, content=content, parent_comment_id=parent_comment_id)
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment

def get_comments_for_idea(db: Session, idea_id: str):
    """Get all comments for a specific idea."""
    return db.query(Comment).filter(Comment.idea_id == idea_id).order_by(Comment.created_at.asc()).all()
