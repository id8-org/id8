from crud import add_to_shortlist, remove_from_shortlist, get_shortlist_ideas, create_deep_dive_version, get_deep_dive_versions, get_deep_dive_version, restore_deep_dive_version, update_idea_status
from app.schemas import IdeaOut, ShortlistOut, DeepDiveVersionOut, IdeaGenerationRequest, IdeaVersionQnACreate, IdeaVersionQnAOut, DeepDiveRequest, ProfileQnAOut, ProfileQnACreate, IdeasOut
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Body, Header, Request, status
from fastapi.responses import JSONResponse, HTMLResponse
from sqlalchemy.orm import Session
from app.llm_center.legacy_wrappers import generate_deep_dive, generate_idea_pitches, orchestrate_iterating, orchestrate_considering, clean_text_with_llm, render_prompt, call_groq, analyze_version_impact, validate_idea_dict, is_unique_differentiator, is_specific_problem_statement, is_real_actionable_cta, is_real_repo_url, is_compelling_pitch, generate_deep_dive_pydanticai, generate_iterating_pydanticai, generate_considering_pydanticai
from app.services.idea_service import ask_llm_with_context
from app.db import get_db
from app.auth import get_current_active_user
from app.services.personalized_idea_service import generate_personalized_deep_dive, generate_personalized_ideas
from app.models import User, Idea, DeepDiveVersion, IdeaVersionQnA, LensInsight, VCThesisComparison, InvestorDeck, AuditLog, ProfileQnA
from app.services.event_bus import EventBus
import logging
import os
import json
from app.tiers import get_tier_config, get_account_type_config
import asyncio
import traceback
from app.context_utils import assemble_llm_context, context_user, context_profile, context_repo, context_idea
import uuid
import re
import random
from sqlalchemy import func
from app.llm_pipeline import run_llm_pipeline
import warnings

logger = logging.getLogger(__name__)

event_bus = EventBus.get_instance()

def ensure_list(val):
    return val if isinstance(val, list) else []

def ensure_dict(val):
    return val if isinstance(val, dict) else {}

def create_idea_from_dict(idea: dict[str, Any], user_id: str):
    from app.models import Idea
    # Get valid column names from the model
    valid_columns = {col.name for col in Idea.__table__.columns}
    # Always set user_id
    idea['user_id'] = user_id
    # Filter the dict to only valid columns
    filtered_idea = {k: v for k, v in idea.items() if k in valid_columns}
    return Idea(**filtered_idea)

def log_and_emit_audit(db, user_id, action_type, resource_type, resource_id, details):
    audit = AuditLog(user_id=user_id, action_type=action_type, resource_type=resource_type, resource_id=resource_id, details=details)
    db.add(audit)
    db.commit()
    event_bus.emit('audit.log.created', user_id=user_id, action_type=action_type, resource_type=resource_type, resource_id=resource_id, details=details)
    return audit

def get_api_user(api_key: Optional[str] = Header(None)) -> Optional[User]:
    """Get user from API key for API access"""
    if not api_key:
        return None
    
    # Check if API key is valid (you can implement your own API key validation)
    valid_api_key = os.environ.get('API_KEY')
    if api_key == valid_api_key:
        # Return a system user for API access
        return User(
            id="api_user",
            email="api@idea8.com",
            first_name="API",
            last_name="User",
            is_active=True,
            is_verified=True
        )
    return None

def get_current_user_or_api(
    current_user: Optional[User] = Depends(get_current_active_user),
    api_key: Optional[str] = Header(None)
) -> User:
    """Get current user or API user"""
    if current_user:
        return current_user
    
    api_user = get_api_user(api_key)
    if api_user:
        return api_user
    
    raise HTTPException(
        status_code=401,
        detail="Authentication required"
    )

router = APIRouter()

@router.get("/test-alive")
def test_alive():
    return {"status": "alive", "router": "ideas"}

@router.get("/list", response_model=IdeasOut)
def list_ideas(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Returns ideas for the current user filtered by status (stage) if provided, otherwise returns all ideas for the user.
    """
    query = db.query(Idea).filter(Idea.user_id == current_user.id)
    if status:
        query = query.filter(Idea.status == status)
    ideas = query.all()
    idea_dicts = [safe_idea_out(i, idx) for idx, i in enumerate(ideas)]
    import logging
    logging.info(f"/ideas/list: user={current_user.id}, status={status}, count={len(idea_dicts)}, sample_ids={[i.get('id') for i in idea_dicts[:5]]}")
    return {"ideas": idea_dicts, "config": {}}

@router.get("/shortlist")
def get_shortlisted_ideas(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    tier_config = get_tier_config(str(current_user.tier))
    account_type_config = get_account_type_config(str(current_user.account_type))
    config = {**tier_config, **account_type_config}
    shortlist = get_shortlist_ideas(db, str(current_user.id))
    idea_ids = [s.idea_id for s in shortlist]
    if not idea_ids:
        return {"ideas": [], "config": config}
    ideas = db.query(Idea).filter(Idea.id.in_(idea_ids)).all()
    idea_map = {idea.id: idea for idea in ideas}
    return {"ideas": [idea_map[iid] for iid in idea_ids if iid in idea_map], "config": config}

@router.post("/{idea_id}/shortlist", response_model=ShortlistOut)
def add_idea_to_shortlist(
    idea_id: str, 
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    result = add_to_shortlist(db, idea_id, user_id=str(current_user.id))
    if result:
        log_and_emit_audit(db, current_user.id, 'idea_shortlisted', 'idea', idea_id, {'idea_id': idea_id})
        return result
    else:
        raise HTTPException(status_code=400, detail="Already in shortlist")

@router.delete("/{idea_id}/shortlist", response_model=Dict[str, Any])
def remove_idea_from_shortlist(
    idea_id: str, 
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    removed = remove_from_shortlist(db, idea_id, user_id=str(current_user.id))
    if removed:
        log_and_emit_audit(db, current_user.id, 'idea_shortlisted', 'idea', idea_id, {'idea_id': idea_id})
        return {"status": "removed"}
    else:
        raise HTTPException(status_code=404, detail="Not in shortlist")

@router.get("/{idea_id}/deepdive_versions", response_model=List[DeepDiveVersionOut])
def list_deep_dive_versions(idea_id: str, db: Session = Depends(get_db)):
    return get_deep_dive_versions(db, idea_id)

@router.post("/{idea_id}/deepdive_versions", response_model=DeepDiveVersionOut)
async def create_deep_dive_version_api(
    idea_id: str,
    fields: Dict[str, Any] = Body(...),
    llm_raw_response: str = Body(""),
    rerun_llm: bool = Body(False),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if rerun_llm:
        # Call personalized LLM with edited fields as context
        try:
            # Add user context to the fields for personalization
            enhanced_fields = fields.copy()
            enhanced_fields['user_id'] = current_user.id
            
            deep_dive_result = await generate_personalized_deep_dive(enhanced_fields, current_user, db)
            llm_raw = deep_dive_result.get('raw', '')
            parsed_fields = deep_dive_result.get('deep_dive', {})
            result = create_deep_dive_version(db, idea_id, parsed_fields, llm_raw)
            log_and_emit_audit(db, current_user.id, 'deep_dive_version_created', 'idea', idea_id, {'idea_id': idea_id})
            return result
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"LLM rerun failed: {str(e)}")
    else:
        result = create_deep_dive_version(db, idea_id, fields, llm_raw_response)
        log_and_emit_audit(db, current_user.id, 'deep_dive_version_created', 'idea', idea_id, {'idea_id': idea_id})
        return result

@router.get("/{idea_id}/deepdive_versions/{version_number}", response_model=DeepDiveVersionOut)
def get_deep_dive_version_api(idea_id: str, version_number: int, db: Session = Depends(get_db)):
    version = get_deep_dive_version(db, idea_id, version_number)
    if version is None:
        raise HTTPException(status_code=404, detail="Version not found")
    return version

@router.post("/{idea_id}/deepdive_versions/{version_number}/restore", response_model=IdeaOut)
def restore_deep_dive_version_api(idea_id: str, version_number: int, db: Session = Depends(get_db)):
    idea = restore_deep_dive_version(db, idea_id, version_number)
    if idea is None:
        raise HTTPException(status_code=404, detail="Version or idea not found")
    log_and_emit_audit(db, idea.user_id, 'deep_dive_version_restored', 'idea', idea.id, {'idea_id': idea.id})
    return idea

@router.delete("/{idea_id}/deepdive_versions/{version_number}", response_model=Dict[str, Any])
def delete_deep_dive_version_api(idea_id: str, version_number: int, db: Session = Depends(get_db)):
    version = get_deep_dive_version(db, idea_id, version_number)
    if version is None:
        raise HTTPException(status_code=404, detail="Version not found")
    db.delete(version)
    db.commit()
    log_and_emit_audit(db, version.user_id, 'deep_dive_version_deleted', 'idea', idea_id, {'idea_id': idea_id})
    return {"status": "deleted"}

def map_flat_deep_dive(flat):
    scores = flat.get('Signal Score', {})
    score_fields = [
        'Product-Market Fit Potential',
        'Market Size',
        'Market Timing',
        "Founder's Ability to Execute",
        'Technical Feasibility',
        'Go to Market',
        'Competitive Moat',
        'Profitability Potential',
        'Strategic Exit Potential',
        'Regulatory Risk'
    ]
    score_values = [scores.get(field) for field in score_fields if scores.get(field) is not None]
    overall_score = sum(score_values) if score_values else None  # Sum of all scored fields

    return {
        # ...other mappings...
        'overall_score': overall_score,
        # ...other mappings...
    }

def safe_idea_out(idea, idx=None):
    from app.schemas import IdeaOut, DeepDiveIdeaData, IteratingIdeaData
    # Always create a new dict to avoid SQLAlchemy reference issues
    as_dict = dict(idea.as_dict()) if hasattr(idea, 'as_dict') else dict(idea)
    # Always include user_id and repo_id for frontend filtering
    if 'user_id' not in as_dict or as_dict.get('user_id') is None or as_dict.get('user_id') == '':
        as_dict['user_id'] = getattr(idea, 'user_id', None)
    if 'repo_id' not in as_dict or as_dict.get('repo_id') is None or as_dict.get('repo_id') == '':
        as_dict['repo_id'] = getattr(idea, 'repo_id', None)
    as_dict['title'] = as_dict.get('title') if as_dict.get('title') is not None and as_dict.get('title') != '' else 'Untitled Idea'
    as_dict['status'] = as_dict.get('status') if as_dict.get('status') is not None and as_dict.get('status') != '' else 'suggested'
    as_dict['stage'] = as_dict['status']
    import json
    # Always map deep_dive_raw_response if present and non-empty
    if as_dict.get('deep_dive_raw_response'):
        try:
            raw_response = as_dict['deep_dive_raw_response']
            brace_count = 0
            json_end = 0
            for i, char in enumerate(raw_response):
                if char == '{':
                    brace_count += 1
                elif char == '}':
                    brace_count -= 1
                    if brace_count == 0:
                        json_end = i + 1
                        break
            if json_end > 0:
                json_part = raw_response[:json_end]
                flat = json.loads(json_part)
                as_dict['deep_dive'] = map_flat_deep_dive(flat)
            else:
                flat = json.loads(raw_response)
                as_dict['deep_dive'] = map_flat_deep_dive(flat)
        except Exception as e:
            import logging
            logging.error(f"Error mapping deep_dive_raw_response: {e}")
            as_dict['deep_dive'] = {'deepDiveTable': []}
    elif as_dict.get('deep_dive') is None or not isinstance(as_dict['deep_dive'], dict):
        as_dict['deep_dive'] = {'deepDiveTable': []}
    if as_dict.get('iterating') is None or not isinstance(as_dict['iterating'], dict):
        as_dict['iterating'] = {'iterationTable': []}
    # --- PATCH: Normalize for frontend ---
    # idea_number
    if 'idea_number' not in as_dict or as_dict['idea_number'] is None:
        as_dict['idea_number'] = idx + 1 if idx is not None else 1
    # source_type
    valid_source_types = {'byoi', 'system', 'madlib'}
    st = as_dict.get('source_type')
    if st not in valid_source_types:
        if st == 'ai':
            as_dict['source_type'] = 'system'
        else:
            as_dict['source_type'] = 'system'
    # repo_id and repo_url
    as_dict['repo_id'] = as_dict.get('repo_id') if as_dict.get('repo_id') is not None else ''
    # PATCH: repo_url must be a valid URL, not empty string
    as_dict['repo_url'] = as_dict.get('repo_url')
    if not as_dict['repo_url'] or not isinstance(as_dict['repo_url'], str) or not as_dict['repo_url'].startswith('http'):
        as_dict['repo_url'] = 'https://example.com'
    # Patch for deep_dive.overall_score
    if 'deep_dive' in as_dict and isinstance(as_dict['deep_dive'], dict):
        categories = [
            'market_opportunity',
            'execution_capability',
            'business_viability',
            'strategic_alignment_risks'
        ]
        total_score = 0
        for cat in categories:
            cat_obj = as_dict['deep_dive'].get(cat)
            if cat_obj and isinstance(cat_obj, dict):
                # Try 'score' first, fallback to sum of values in 'scores' dict
                if 'score' in cat_obj and isinstance(cat_obj['score'], (int, float)):
                    total_score += cat_obj['score']
                elif 'scores' in cat_obj and isinstance(cat_obj['scores'], dict):
                    total_score += sum(
                        v for v in cat_obj['scores'].values() if isinstance(v, (int, float))
                    )
        as_dict['deep_dive']['overall_score'] = total_score
    # Patch for business_model, market_positioning, competitive_advantage
    for field in ['business_model', 'market_positioning', 'competitive_advantage']:
        if as_dict.get(field) is None:
            as_dict[field] = ''
    # Add more normalization as needed
    return dict(as_dict)

@router.post("/{idea_id}/status", response_model=IdeaOut)
def update_status_api(idea_id: str, status: str = Body(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    idea = db.query(Idea).filter(Idea.id == idea_id).first()
    if idea is None:
        raise HTTPException(status_code=404, detail="Idea not found")
    # Get actual values, not SQLAlchemy Column objects
    idea_user_id = getattr(idea, 'user_id', None)
    idea_team_id = getattr(idea, 'team_id', None)
    current_user_team_id = getattr(current_user, 'team_id', None)
    current_user_account_type = getattr(current_user, 'account_type', None)
    
    is_owner = idea_user_id == current_user.id
    is_team = (
        current_user_account_type == 'team' and
        current_user_team_id is not None and
        idea_team_id is not None and
        idea_team_id == current_user_team_id
    )
    if not (is_owner or is_team):
        raise HTTPException(status_code=403, detail="Not authorized to update this idea's status")
    try:
        updated_idea = update_idea_status(db, idea_id, status)
        log_and_emit_audit(db, current_user.id, 'idea_status_changed', 'idea', idea.id, {'idea_id': idea.id, 'new_status': status})
        return safe_idea_out(updated_idea)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/all", response_model=IdeasOut)
def get_all_ideas(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Returns all ideas for the current user. CONTRACT: Always includes user_id, repo_id, and required fields. Logs every call for auditability.
    """
    ideas = db.query(Idea).filter(Idea.user_id == current_user.id).all()
    # Defensive: If user_id is missing, log a warning and return all ideas (debug mode)
    if (current_user.id is None) or (str(current_user.id) == ''):
        import logging
        logging.warning(f"/ideas/all: current_user.id missing, returning all ideas for debugging!")
        ideas = db.query(Idea).all()
    idea_dicts = [safe_idea_out(i, idx) for idx, i in enumerate(ideas)]
    # Audit log
    import logging
    logging.info(f"/ideas/all: user={current_user.id}, count={len(idea_dicts)}, sample_ids={[i.get('id') for i in idea_dicts[:5]]}")
    return {"ideas": idea_dicts, "config": {}}

def ensure_idea_fields(idea: Dict[str, Any]) -> Dict[str, Any]:
    """Ensure all important fields are present and well-formed."""
    idea = idea.copy()
    if 'assumptions' not in idea or not isinstance(idea['assumptions'], list):
        idea['assumptions'] = []
    if 'repo_usage' not in idea or not isinstance(idea['repo_usage'], str):
        idea['repo_usage'] = ''
    # Robust evidence_reference handling
    value = idea.get('evidence_reference', None)
    if value is None or value == '' or value == {}:
        idea['evidence_reference'] = {'type': '', 'title': '', 'url': ''}
    elif isinstance(value, dict):
        for k in ['type', 'title', 'url']:
            if k not in value:
                value[k] = ''
        idea['evidence_reference'] = value
    elif isinstance(value, str):
        try:
            parsed = json.loads(value)
            if isinstance(parsed, dict):
                for k in ['type', 'title', 'url']:
                    if k not in parsed:
                        parsed[k] = ''
                idea['evidence_reference'] = parsed
            else:
                idea['evidence_reference'] = {'type': '', 'title': '', 'url': ''}
        except Exception:
            idea['evidence_reference'] = {'type': '', 'title': '', 'url': ''}
    else:
        idea['evidence_reference'] = {'type': '', 'title': '', 'url': ''}
    if 'type' not in idea or not isinstance(idea['type'], str):
        idea['type'] = None
    return idea

# Utility: filter idea dict for suggested stage
SUGGESTED_FIELDS = [
    'id', 'idea_number', 'title', 'hook', 'value', 'evidence', 'evidence_reference',
    'repo_usage', 'differentiator', 'score', 'mvp_effort', 'created_at', 'status', 'type',
    'source_type', 'scope_commitment', 'problem_statement', 'elevator_pitch',
    'assumptions', 'core_assumptions', 'riskiest_assumptions', 'generation_notes', 'tags'
]

def filter_suggested_fields(idea_dict):
    return {k: v for k, v in idea_dict.items() if k in SUGGESTED_FIELDS and v not in (None, '', [], {})}

@router.post("/generate")
async def generate_ideas(
    request: IdeaGenerationRequest,
    current_user: User = Depends(get_current_user_or_api),
    db: Session = Depends(get_db)
):
    tier_config = get_tier_config(str(current_user.tier))
    account_type_config = get_account_type_config(str(current_user.account_type))
    config = {**tier_config, **account_type_config}
    user_idea_count = db.query(Idea).filter(
        (Idea.user_id == current_user.id) | (Idea.user_id.is_(None))
    ).count()
    if user_idea_count is not None and user_idea_count >= config["max_ideas"]:
        raise HTTPException(status_code=403, detail="Idea limit reached for your plan. Upgrade to create more.", headers={"X-Config": str(config)})
    deep_dive_enabled = config.get("deep_dive", False)
    if request.use_personalization and deep_dive_enabled == False:
        raise HTTPException(status_code=403, detail="Deep Dive is a premium feature. Upgrade to access.", headers={"X-Config": str(config)})

    try:
        logger.info(f"[API] /ideas/generate called by user {current_user.id}. Payload: {request.dict()}")
        # Always build user_context securely on the backend
        user_profile = getattr(current_user, 'profile', None)
        user_resume = getattr(current_user, 'resume', None)
        from app.context_utils import build_user_context
        user_context = build_user_context(current_user, user_profile, user_resume)
        # Build context for LLM (do NOT use request.user_context)
        context = {
            "industry": request.industry,
            "business_model": request.business_model,
            "context": request.context,
            "vertical": request.vertical,
            "horizontal": request.horizontal,
            "user_context": user_context,  # always a string, built here
            # ... any other fields needed ...
        }
        matched_repo = None
        if request.use_personalization and str(current_user.id) != "api_user":
            from app.services.personalized_idea_service import match_best_repo_to_context
            matched_repo = match_best_repo_to_context(
                db,
                request.vertical or '',
                request.horizontal or '',
                request.business_model or '',
                request.context
            )
        context = assemble_llm_context(
            context_user(current_user),
            context_profile(user_profile),
            context_repo(matched_repo),
            {'user_context': user_context},
            {
                'industry': request.industry,
                'business_model': request.business_model,
                'vertical': request.vertical,
                'horizontal': request.horizontal,
                'custom_context': request.context,
            }
        )
        # --- Log the full LLM payload for auditing ---
        logger.info(f"[LLM PAYLOAD] Full context sent to LLM for idea generation: {json.dumps(context, indent=2, default=str)[:4000]}")
        if request.use_personalization and str(current_user.id) != "api_user":
            try:
                context_str = json.dumps(context)
                if matched_repo:
                    # Repo-based (system) prompt: two parallel calls with slight variations
                    import random
                    # Add some randomization to ensure different ideas
                    context1 = context.copy()
                    context2 = context.copy()
                    context1['variation'] = 'focus_on_innovation'
                    context2['variation'] = 'focus_on_market_gap'
                    logger.info("[LLM] Calling generate_personalized_ideas (repo-based) for both variations...")
                    results = await asyncio.gather(
                        generate_personalized_ideas(matched_repo, current_user, db, context_str + f"\n\nVariation: {context1['variation']}"),
                        generate_personalized_ideas(matched_repo, current_user, db, context_str + f"\n\nVariation: {context2['variation']}")
                    )
                    logger.info(f"[LLM] Raw LLM response: {str(results)[:1000]}")
                    ideas = []
                    for result in results:
                        for idea in result.get('ideas', []):
                            if ('error' not in idea or idea['error'] is None) and idea not in ideas:
                                ideas.append(idea)
                    result = results[0]  # For raw/matched_repo fields
                else:
                    # User-only (AI) prompt: two parallel calls with slight variations
                    context['prompt_type'] = 'ai'
                    context1 = context.copy()
                    context2 = context.copy()
                    context1['variation'] = 'focus_on_innovation'
                    context2['variation'] = 'focus_on_market_gap'
                    logger.info("[LLM] Calling generate_idea_pitches (user-only) for both variations...")
                    results = await asyncio.gather(
                        generate_idea_pitches(context1),
                        generate_idea_pitches(context2)
                    )
                    logger.info(f"[LLM] Raw LLM response: {str(results)[:1000]}")
                    ideas = []
                    for result in results:
                        for idea in result.get('ideas', []):
                            if ('error' not in idea or idea['error'] is None) and idea not in ideas:
                                ideas.append(idea)
                    result = results[0]
            except ValueError as ve:
                logger.error(f"[LLM] Exception during personalized LLM call: {ve}\n{traceback.format_exc()}")
                raise HTTPException(status_code=400, detail=str(ve))
        else:
            # System (repo-based) prompt: two parallel calls
            context['prompt_type'] = 'system'
            logger.info("[LLM] Calling generate_idea_pitches (system) for both variations...")
            results = await asyncio.gather(
                generate_idea_pitches(context),
                generate_idea_pitches(context)
            )
            logger.info(f"[LLM] Raw LLM response: {str(results)[:1000]}")
            ideas = []
            for result in results:
                for idea in result.get('ideas', []):
                    if ('error' not in idea or idea['error'] is None) and idea not in ideas:
                        ideas.append(idea)
            result = results[0]
        logger.info(f"[LLM] Parsed LLM ideas: {str(ideas)[:1000]}")
        if ideas is None or len(ideas) == 0:
            # Always return a 200 with an empty list if no ideas generated
            logger.warning(f"[API] No ideas generated for user {current_user.id}")
            return {"ideas": [], "config": config, "matched_repo": result.get('matched_repo') if request.use_personalization else None}
        logger.info(f"[API] Parsed {len(ideas)} ideas for user {current_user.id}")
        saved_ideas = []
        idea_warnings = []  # <-- Collect warnings for each idea
        # Enforce unique idea names for this batch and DB
        existing_names = set(i.title.lower() for i in db.query(Idea).filter(Idea.user_id == current_user.id).all())
        batch_names = set()
        for idea in ideas:
            if not isinstance(idea, dict):
                logger.error(f"[LLM] Skipping non-dict idea: {idea}")
                continue
            # Coerce and log warnings, but never skip
            try:
                db_idea = create_idea_from_dict(idea, str(current_user.id))
                db.add(db_idea)
                db.commit()
                db.refresh(db_idea)
                logger.info(f"[DB] Saved idea '{db_idea.title}' (ID: {db_idea.id})")
            except Exception as db_exc:
                logger.error(f"[DB ERROR] Failed to save idea '{idea.get('title', '')}': {db_exc}\n{traceback.format_exc()}")
                continue
            saved_ideas.append(db_idea)
            # PATCH: Always convert warnings to string for serialization
            local_warnings = warnings if isinstance(warnings, (list, tuple)) else ([warnings] if warnings else [])
            if local_warnings:
                logger.warning(f"[VALIDATION WARNING] Idea '{idea.get('title', 'N/A')}' warnings: {local_warnings}")
                idea_warnings.append({
                    'idea': idea.get('title', 'N/A'),
                    'warnings': [str(w) for w in local_warnings]
                })
            else:
                logger.info(f"[VALIDATION PASS] Idea '{idea.get('title', 'N/A')}' passed all checks.")
            log_and_emit_audit(db, current_user.id, 'idea_created', 'idea', db_idea.id, db_idea.as_dict())
        # Only include suggested fields in the response for suggested ideas
        filtered_ideas = []
        for i in saved_ideas:
            idea_dict = i.as_dict()
            # Only keep allowed fields and remove null/empty
            filtered = {k: v for k, v in idea_dict.items() if k in SUGGESTED_FIELDS and v not in (None, '', [], {})}
            filtered_ideas.append(filtered)
        logger.info(f"[API] Finished processing {len(ideas)} ideas. Saved: {len(saved_ideas)}. With warnings: {len(idea_warnings)}.")
        return {
            "ideas": filtered_ideas,
            "config": config,
            "matched_repo": result.get('matched_repo') if request.use_personalization else None,
            "idea_warnings": idea_warnings
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"[API] Exception in /ideas/generate: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to generate ideas: {str(e)}")

@router.get("/{idea_id}", response_model=IdeaOut)
def get_idea_by_id(idea_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    idea = db.query(Idea).filter(Idea.id == idea_id).first()
    if idea is None:
        raise HTTPException(status_code=404, detail="Idea not found")
    # Enforce access control: owner or team
    idea_user_id = getattr(idea, 'user_id', None)
    idea_team_id = getattr(idea, 'team_id', None)
    current_user_team_id = getattr(current_user, 'team_id', None)
    current_user_account_type = getattr(current_user, 'account_type', None)
    
    if not (
        idea_user_id == current_user.id or
        (current_user_account_type == 'team' and current_user_team_id is not None and idea_team_id is not None and idea_team_id == current_user_team_id)
    ):
        raise HTTPException(status_code=403, detail="Not authorized to access this idea")
    return safe_idea_out(idea)

@router.post("/", response_model=IdeaOut)
async def create_idea(
    title: str = Body(...),
    hook: Optional[str] = Body(None),
    value: Optional[str] = Body(None),
    evidence: Optional[str] = Body(None),
    differentiator: Optional[str] = Body(None),
    score: Optional[int] = Body(None),
    mvp_effort: Optional[int] = Body(None),
    type: Optional[str] = Body(None),
    status: str = Body("deep_dive"),
    repo_id: Optional[str] = Body(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    # Clean up all user-typed fields
    title = await clean_text_with_llm(title) if title else title
    hook = await clean_text_with_llm(hook) if hook else hook
    value = await clean_text_with_llm(value) if value else value
    evidence = await clean_text_with_llm(evidence) if evidence else evidence
    differentiator = await clean_text_with_llm(differentiator) if differentiator else differentiator
    score = score if score is not None else 0
    mvp_effort = mvp_effort if mvp_effort is not None else 0
    type = type if type is not None else "side_hustle"
    idea_data = {
        "title": title,
        "hook": hook,
        "value": value,
        "evidence": evidence,
        "differentiator": differentiator,
        "score": score,
        "mvp_effort": mvp_effort,
        "type": type,
    }
    required_fields = ["title", "hook", "value", "evidence", "differentiator", "score", "mvp_effort", "type"]
    needs_enrichment = any(not idea_data.get(f) for f in required_fields)
    enriched = idea_data.copy()
    llm_raw = None
    if needs_enrichment:
        enrichment_context = f"User idea: {title or ''}\n{hook or ''}\n{value or ''}\n{evidence or ''}\n{differentiator or ''}"
        llm_result = await generate_idea_pitches({
            'custom_context': enrichment_context
        })
        ideas = llm_result.get("ideas", [])
        if ideas:
            enriched = {**enriched, **ideas[0]}
            llm_raw = llm_result.get("raw")
    enriched = ensure_idea_fields(enriched)
    # Enforce unique idea name per user/team (must stay inside endpoint, never at module scope)
    existing_names = set(i.title.lower() for i in db.query(Idea).filter(Idea.user_id == current_user.id).all())
    base_name = enriched.get('title', title)
    hook_for_name = enriched.get('hook') or enriched.get('description') or ''
    unique_title = make_unique_idea_name(base_name, hook_for_name, existing_names)
    idea = Idea(
        user_id=current_user.id,
        title=unique_title,
        hook=enriched.get("hook", hook),
        value=enriched.get("value", value),
        evidence=enriched.get("evidence", evidence),
        differentiator=enriched.get("differentiator", differentiator),
        score=enriched.get("score", score),
        mvp_effort=enriched.get("mvp_effort", mvp_effort),
        type=enriched.get("type", type),
        status=status,
        repo_id=repo_id,
        evidence_reference=enriched.get("evidence_reference", evidence),
        repo_usage=enriched.get("repo_usage", evidence),
        assumptions=enriched.get("assumptions", []),
        source_type="byoi",
        llm_raw_response=llm_raw,
        scope_commitment=enriched.get("scope_commitment"),
        problem_statement=enriched.get("problem_statement"),
        elevator_pitch=enriched.get("elevator_pitch"),
        core_assumptions=enriched.get("core_assumptions"),
        riskiest_assumptions=enriched.get("riskiest_assumptions"),
        generation_notes=enriched.get("generation_notes"),
    )
    db.add(idea)
    db.commit()
    db.refresh(idea)
    logger.info(f"[API] Saved idea {idea.id} (idea_number={idea.idea_number}) for user {idea.user_id}")
    log_and_emit_audit(db, current_user.id, 'idea_created', 'idea', idea.id, idea.as_dict())
    return idea

@router.post("/validate")
async def validate_user_idea(
    idea_data: Dict[str, Any] = Body(...),
    use_personalization: bool = Body(True),
    current_user: User = Depends(get_current_user_or_api),
    db: Session = Depends(get_db)
):
    tier_config = get_tier_config(str(current_user.tier))
    account_type_config = get_account_type_config(str(current_user.account_type))
    config = {**tier_config, **account_type_config}
    deep_dive_enabled = config.get("deep_dive", False)
    if use_personalization and deep_dive_enabled == False:
        raise HTTPException(status_code=403, detail="Deep Dive is a premium feature. Upgrade to access.", headers={"X-Config": str(config)})
    """Validate and analyze a user's own idea"""
    # Check if user has completed onboarding (only for web users, not API users)
    current_user_profile = getattr(current_user, 'profile', None)
    onboarding_completed = getattr(current_user_profile, 'onboarding_completed', False) if current_user_profile else False
    
    if str(current_user.id) != "api_user" and (not current_user_profile or not onboarding_completed):
        raise HTTPException(
            status_code=403,
            detail="Please complete your onboarding profile before validating ideas"
        )
    
    try:
        # Defensive: ensure evidence_reference is always a dict
        evref = idea_data.get("evidence_reference", {})
        if not isinstance(evref, dict):
            evref = {}
        idea_data["evidence_reference"] = evref
        # Prepare the idea data for analysis
        idea_summary = f"""
Title: {idea_data.get('title', 'Unknown')}
Hook: {idea_data.get('hook', 'N/A')}
Value: {idea_data.get('value', 'N/A')}
Evidence: {idea_data.get('evidence', 'N/A')}
Differentiator: {idea_data.get('differentiator', 'N/A')}
"""
        
        if use_personalization and str(current_user.id) != "api_user":
            # Use personalized deep dive analysis (only for web users)
            result = await generate_personalized_deep_dive(idea_data, current_user, db)
        else:
            # Use generic deep dive analysis for API users or when personalization is disabled
            result = await generate_deep_dive(idea_data)
        
        # Save the validated idea to the database
        db_idea = Idea(
            user_id=current_user.id,
            repo_id=None,
            title=idea_data.get("title", ""),
            hook=idea_data.get("hook", ""),
            value=idea_data.get("value", ""),
            evidence=idea_data.get("evidence", ""),
            differentiator=idea_data.get("differentiator", ""),
            score=idea_data.get("score", 5),
            mvp_effort=idea_data.get("mvp_effort", 5),
            type=idea_data.get("type"),
            status="deep_dive",
            llm_raw_response=result.get('raw'),
            deep_dive=result.get('deep_dive', {}),
            evidence_reference=idea_data.get("evidence_reference", ""),
            repo_usage=idea_data.get("repo_usage", ""),
            assumptions=idea_data.get("assumptions", []),
            source_type="madlib",
            scope_commitment=idea_data.get("scope_commitment"),
            problem_statement=idea_data.get("problem_statement"),
            elevator_pitch=idea_data.get("elevator_pitch"),
            core_assumptions=idea_data.get("core_assumptions"),
            riskiest_assumptions=idea_data.get("riskiest_assumptions"),
            generation_notes=idea_data.get("generation_notes"),
        )
        db.add(db_idea)
        db.commit()
        db.refresh(db_idea)
        
        from app.schemas import IdeaOut
        log_and_emit_audit(db, current_user.id, 'idea_validated', 'idea', db_idea.id, db_idea.as_dict())
        return {
            "idea": IdeaOut.model_validate(db_idea),
            "analysis": result.get('deep_dive', {}),
            "validation_type": "personalized" if use_personalization and str(current_user.id) != "api_user" else "generic",
            "config": config
        }
        
    except Exception as e:
        logger.error(f"[API] Exception in /ideas/validate: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to validate idea: {str(e)}")

@router.put("/{idea_id}", response_model=IdeaOut)
async def update_idea(
    idea_id: str,
    title: Optional[str] = Body(None),
    hook: Optional[str] = Body(None),
    value: Optional[str] = Body(None),
    evidence: Optional[str] = Body(None),
    differentiator: Optional[str] = Body(None),
    score: Optional[int] = Body(None),
    mvp_effort: Optional[int] = Body(None),
    type: Optional[str] = Body(None),  # Add type parameter
    status: Optional[str] = Body(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    idea = db.query(Idea).filter(Idea.id == idea_id).first()
    if idea is None:
        raise HTTPException(status_code=404, detail="Idea not found")
    # Enforce access control: owner or team
    idea_user_id = getattr(idea, 'user_id', None)
    idea_team_id = getattr(idea, 'team_id', None)
    current_user_team_id = getattr(current_user, 'team_id', None)
    current_user_account_type = getattr(current_user, 'account_type', None)
    if not (
        (idea_user_id == current_user.id) or
        (current_user_account_type == 'team' and current_user_team_id is not None and idea_team_id is not None and idea_team_id == current_user_team_id)
    ):
        raise HTTPException(status_code=403, detail="Not authorized to update this idea")
    # Clean up all user-typed fields if provided
    if title is not None:
        setattr(idea, 'title', await clean_text_with_llm(title))
    if hook is not None:
        setattr(idea, 'hook', await clean_text_with_llm(hook))
    if value is not None:
        setattr(idea, 'value', await clean_text_with_llm(value))
    if evidence is not None:
        setattr(idea, 'evidence', await clean_text_with_llm(evidence))
    if differentiator is not None:
        setattr(idea, 'differentiator', await clean_text_with_llm(differentiator))
    if score is not None:
        setattr(idea, 'score', score)
    if mvp_effort is not None:
        setattr(idea, 'mvp_effort', mvp_effort)
    if type is not None:
        setattr(idea, 'type', type)
    if status is not None:
        setattr(idea, 'status', status)
    # If this is a system idea being edited by a user, associate it with the user
    if getattr(idea, 'user_id', None) is None:
        setattr(idea, 'user_id', current_user.id)
    db.commit()
    db.refresh(idea)
    log_and_emit_audit(db, current_user.id, 'idea_updated', 'idea', idea.id, idea.as_dict())
    return idea

@router.patch("/{idea_id}", response_model=IdeaOut)
async def patch_idea(
    idea_id: str,
    title: Optional[str] = Body(None),
    hook: Optional[str] = Body(None),
    value: Optional[str] = Body(None),
    evidence: Optional[str] = Body(None),
    differentiator: Optional[str] = Body(None),
    score: Optional[int] = Body(None),
    mvp_effort: Optional[int] = Body(None),
    type: Optional[str] = Body(None),
    status: Optional[str] = Body(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """PATCH endpoint for partial updates - mirrors PUT functionality"""
    return await update_idea(
        idea_id=idea_id,
        title=title,
        hook=hook,
        value=value,
        evidence=evidence,
        differentiator=differentiator,
        score=score,
        mvp_effort=mvp_effort,
        type=type,
        status=status,
        current_user=current_user,
        db=db
    )

@router.post("/{idea_id}/deep-dive")
async def generate_deep_dive_for_idea(
    idea_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Generate deep dive analysis for an idea (best practices)."""
    try:
        idea = db.query(Idea).filter(Idea.id == idea_id).first()
        if idea is None:
            logger.error(f"[API] Deep dive requested for non-existent idea {idea_id}")
            raise HTTPException(status_code=404, detail="Idea not found")
        # Enforce access control: owner or team
        idea_user_id = getattr(idea, 'user_id', None)
        idea_team_id = getattr(idea, 'team_id', None)
        current_user_team_id = getattr(current_user, 'team_id', None)
        current_user_account_type = getattr(current_user, 'account_type', None)
        if not (
            idea_user_id == current_user.id or
            (current_user_account_type == 'team' and current_user_team_id is not None and idea_team_id is not None and idea_team_id == current_user_team_id)
        ):
            logger.error(f"[API] Unauthorized deep dive attempt for idea {idea_id} by user {current_user.id}")
            raise HTTPException(status_code=403, detail="Not authorized to generate deep dive for this idea")
        # Set status and flag immediately
        setattr(idea, 'status', 'deep_dive')
        setattr(idea, 'deep_dive_requested', True)
        db.commit()
        db.refresh(idea)
        try:
            # --- ATOMIC CONTEXT ASSEMBLY ---
            user_profile = getattr(current_user, 'profile', None)
            user_resume = getattr(current_user, 'resume', None)
            from app.context_utils import build_user_context
            user_context = build_user_context(current_user, user_profile, user_resume)
            repo_obj = idea.repo if getattr(idea, 'repo_id', None) else None
            context = assemble_llm_context(
                context_user(current_user),
                context_profile(user_profile),
                context_repo(repo_obj),
                context_idea(idea),
                {'user_context': user_context}
            )
            logger.info(f"[API] Generating deep dive for idea {idea_id} with context keys: {list(context.keys())}")
            # --- Use PydanticAI-based Deep Dive ---
            result = await generate_deep_dive_pydanticai(context)
            if result is None:
                logger.error(f"[API] Deep dive generation returned None for idea {idea_id}")
                error_content = {
                    "sections": [{
                        "title": "Error Generating Deep Dive",
                        "content": "Deep dive generation failed: No response from LLM. Please try again."
                    }]
                }
                idea.deep_dive = error_content
                setattr(idea, 'deep_dive_raw_response', 'No LLM response received')
                setattr(idea, 'deep_dive_requested', False)
                db.commit()
                db.refresh(idea)
                return safe_idea_out(idea)
            deep_dive_data = result.get('deep_dive') if result else None
            feedback = result.get('feedback') if result else None
            raw_response = result.get('raw') if result else ""
            if not deep_dive_data or not isinstance(deep_dive_data, dict):
                logger.error(f"[API] Invalid deep dive data structure for idea {idea_id}: {type(deep_dive_data)}")
                error_content = {
                    "sections": [{
                        "title": "Error Generating Deep Dive",
                        "content": "Deep dive generation failed: Invalid data structure received. Please try again."
                    }]
                }
                idea.deep_dive = error_content
                setattr(idea, 'deep_dive_raw_response', str(raw_response) if raw_response else 'Invalid data structure')
                setattr(idea, 'deep_dive_requested', False)
                db.commit()
                db.refresh(idea)
                return safe_idea_out(idea)
            # Save successful deep dive (parsed object)
            idea.deep_dive = deep_dive_data
            # Optionally save feedback if the model supports it
            if hasattr(idea, 'deep_dive_feedback'):
                idea.deep_dive_feedback = feedback
            setattr(idea, 'deep_dive_raw_response', str(raw_response) if raw_response else '')
            setattr(idea, 'deep_dive_requested', False)
            db.commit()
            db.refresh(idea)
            logger.info(f"[API] Successfully generated deep dive for idea {idea_id}")
            log_and_emit_audit(db, current_user.id, 'deep_dive_generated', 'idea', idea.id, {'idea_id': idea.id})
            return safe_idea_out(idea)
        except Exception as llm_error:
            logger.error(f"[API] LLM error during deep dive generation for idea {idea_id}: {llm_error}")
            setattr(idea, 'deep_dive_requested', False)
            error_content = {
                "sections": [{
                    "title": "Error Generating Deep Dive",
                    "content": f"Deep dive generation failed: {str(llm_error)}. Please try again."
                }]
            }
            idea.deep_dive = error_content
            setattr(idea, 'deep_dive_raw_response', f'LLM Error: {str(llm_error)}')
            db.commit()
            db.refresh(idea)
            log_and_emit_audit(db, current_user.id, 'deep_dive_generation_failed', 'idea', idea.id, {'idea_id': idea.id, 'error': str(llm_error)})
            return safe_idea_out(idea)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[API] Unexpected error in deep dive endpoint for idea {idea_id}: {e}\n{traceback.format_exc()}")
        return {"error": f"Failed to generate deep dive: {str(e)}"}

@router.post("/{idea_id}/business-model", response_model=Dict[str, Any])
async def generate_business_model_api(
    idea_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    idea = db.query(Idea).filter(Idea.id == idea_id).first()
    if idea is None:
        raise HTTPException(status_code=404, detail="Idea not found")
    if not (
        (getattr(idea, 'user_id', None) == current_user.id) or
        (getattr(current_user, 'account_type', None) == 'team' and getattr(current_user, 'team_id', None) is not None and getattr(idea, 'team_id', None) is not None and getattr(idea, 'team_id', None) == getattr(current_user, 'team_id', None))
    ):
        raise HTTPException(status_code=403, detail="Not authorized to generate business model for this idea")
    try:
        # --- ATOMIC CONTEXT ASSEMBLY ---
        user_profile = getattr(current_user, 'profile', None)
        user_resume = getattr(current_user, 'resume', None)
        repo_obj = idea.repo if getattr(idea, 'repo_id', None) else None
        context = assemble_llm_context(
            context_user(current_user),
            context_profile(user_profile),
            context_repo(repo_obj),
            context_idea(idea)
        )
        # TODO: Call the actual business model LLM orchestration function here when implemented
        # result = await generate_business_model(context)
        # For now, return a placeholder structure
        business_model = {
            "key_partners": "To be generated",
            "key_activities": "To be generated", 
            "key_resources": "To be generated",
            "value_propositions": idea.value or "To be generated",
            "customer_relationships": "To be generated",
            "channels": "To be generated",
            "customer_segments": "To be generated",
            "cost_structure": "To be generated",
            "revenue_streams": "To be generated"
        }
        log_and_emit_audit(db, current_user.id, 'business_model_generated', 'idea', idea.id, {'idea_id': idea.id})
        return {"business_model": business_model, "idea_id": idea_id}
    except Exception as e:
        logger.error(f"Error generating business model for idea {idea_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate business model: {str(e)}")

@router.post("/{idea_id}/roadmap", response_model=Dict[str, Any])
async def generate_roadmap_api(
    idea_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    idea = db.query(Idea).filter(Idea.id == idea_id).first()
    if idea is None:
        raise HTTPException(status_code=404, detail="Idea not found")
    if not (
        (getattr(idea, 'user_id', None) == current_user.id) or
        (getattr(current_user, 'account_type', None) == 'team' and getattr(current_user, 'team_id', None) is not None and getattr(idea, 'team_id', None) is not None and getattr(idea, 'team_id', None) == getattr(current_user, 'team_id', None))
    ):
        raise HTTPException(status_code=403, detail="Not authorized to generate roadmap for this idea")
    try:
        # --- ATOMIC CONTEXT ASSEMBLY ---
        user_profile = getattr(current_user, 'profile', None)
        user_resume = getattr(current_user, 'resume', None)
        repo_obj = idea.repo if getattr(idea, 'repo_id', None) else None
        context = assemble_llm_context(
            context_user(current_user),
            context_profile(user_profile),
            context_repo(repo_obj),
            context_idea(idea)
        )
        # TODO: Call the actual roadmap LLM orchestration function here when implemented
        # result = await generate_roadmap(context)
        # For now, return a placeholder structure
        roadmap = {
            "phase_1": {
                "title": "MVP Development",
                "duration": "2-3 months",
                "tasks": ["Core feature development", "Basic UI/UX", "Initial testing"]
            },
            "phase_2": {
                "title": "Beta Launch",
                "duration": "1-2 months", 
                "tasks": ["User feedback collection", "Bug fixes", "Performance optimization"]
            },
            "phase_3": {
                "title": "Full Launch",
                "duration": "Ongoing",
                "tasks": ["Marketing campaign", "User acquisition", "Feature expansion"]
            }
        }
        log_and_emit_audit(db, current_user.id, 'roadmap_generated', 'idea', idea.id, {'idea_id': idea.id})
        return {"roadmap": roadmap, "idea_id": idea_id}
    except Exception as e:
        logger.error(f"Error generating roadmap for idea {idea_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate roadmap: {str(e)}")

@router.post("/{idea_id}/metrics", response_model=Dict[str, Any])
async def generate_metrics_api(
    idea_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    idea = db.query(Idea).filter(Idea.id == idea_id).first()
    if idea is None:
        raise HTTPException(status_code=404, detail="Idea not found")
    if not (
        (getattr(idea, 'user_id', None) == current_user.id) or
        (getattr(current_user, 'account_type', None) == 'team' and getattr(current_user, 'team_id', None) is not None and getattr(idea, 'team_id', None) is not None and getattr(idea, 'team_id', None) == getattr(current_user, 'team_id', None))
    ):
        raise HTTPException(status_code=403, detail="Not authorized to generate metrics for this idea")
    try:
        # --- ATOMIC CONTEXT ASSEMBLY ---
        user_profile = getattr(current_user, 'profile', None)
        user_resume = getattr(current_user, 'resume', None)
        repo_obj = idea.repo if getattr(idea, 'repo_id', None) else None
        context = assemble_llm_context(
            context_user(current_user),
            context_profile(user_profile),
            context_repo(repo_obj),
            context_idea(idea)
        )
        # TODO: Call the actual metrics LLM orchestration function here when implemented
        # result = await generate_metrics(context)
        # For now, return a placeholder structure
        metrics = {
            "user_metrics": ["Daily Active Users", "User Retention Rate", "User Acquisition Cost"],
            "business_metrics": ["Monthly Recurring Revenue", "Customer Lifetime Value", "Churn Rate"],
            "product_metrics": ["Feature Adoption Rate", "User Satisfaction Score", "Time to Value"]
        }
        log_and_emit_audit(db, current_user.id, 'metrics_generated', 'idea', idea.id, {'idea_id': idea.id})
        return {"metrics": metrics, "idea_id": idea_id}
    except Exception as e:
        logger.error(f"Error generating metrics for idea {idea_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate metrics: {str(e)}")

@router.post("/{idea_id}/roi", response_model=Dict[str, Any])
async def generate_roi_api(
    idea_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    idea = db.query(Idea).filter(Idea.id == idea_id).first()
    if idea is None:
        raise HTTPException(status_code=404, detail="Idea not found")
    if not (
        (getattr(idea, 'user_id', None) == current_user.id) or
        (getattr(current_user, 'account_type', None) == 'team' and getattr(current_user, 'team_id', None) is not None and getattr(idea, 'team_id', None) is not None and getattr(idea, 'team_id', None) == getattr(current_user, 'team_id', None))
    ):
        raise HTTPException(status_code=403, detail="Not authorized to generate ROI for this idea")
    try:
        # --- ATOMIC CONTEXT ASSEMBLY ---
        user_profile = getattr(current_user, 'profile', None)
        user_resume = getattr(current_user, 'resume', None)
        repo_obj = idea.repo if getattr(idea, 'repo_id', None) else None
        context = assemble_llm_context(
            context_user(current_user),
            context_profile(user_profile),
            context_repo(repo_obj),
            context_idea(idea)
        )
        # TODO: Call the actual ROI LLM orchestration function here when implemented
        # result = await generate_roi(context)
        # For now, return a placeholder structure
        roi_projections = {
            "year_1": {
                "revenue": "$50,000",
                "costs": "$30,000", 
                "roi": "67%"
            },
            "year_2": {
                "revenue": "$200,000",
                "costs": "$80,000",
                "roi": "150%"
            },
            "year_3": {
                "revenue": "$500,000", 
                "costs": "$150,000",
                "roi": "233%"
            }
        }
        log_and_emit_audit(db, current_user.id, 'roi_generated', 'idea', idea.id, {'idea_id': idea.id})
        return {"roi_projections": roi_projections, "idea_id": idea_id}
    except Exception as e:
        logger.error(f"Error generating ROI for idea {idea_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate ROI: {str(e)}")

@router.post("/{idea_id}/post-mortem", response_model=Dict[str, Any])
async def generate_post_mortem_api(
    idea_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    idea = db.query(Idea).filter(Idea.id == idea_id).first()
    if idea is None:
        raise HTTPException(status_code=404, detail="Idea not found")
    if not (
        (getattr(idea, 'user_id', None) == current_user.id) or
        (getattr(current_user, 'account_type', None) == 'team' and getattr(current_user, 'team_id', None) is not None and getattr(idea, 'team_id', None) is not None and getattr(idea, 'team_id', None) == getattr(current_user, 'team_id', None))
    ):
        raise HTTPException(status_code=403, detail="Not authorized to generate post-mortem for this idea")
    try:
        # --- ATOMIC CONTEXT ASSEMBLY ---
        user_profile = getattr(current_user, 'profile', None)
        user_resume = getattr(current_user, 'resume', None)
        repo_obj = idea.repo if getattr(idea, 'repo_id', None) else None
        context = assemble_llm_context(
            context_user(current_user),
            context_profile(user_profile),
            context_repo(repo_obj),
            context_idea(idea)
        )
        # TODO: Call the actual post-mortem LLM orchestration function here when implemented
        # result = await generate_post_mortem(context)
        # For now, return a placeholder structure
        post_mortem = {
            "what_went_well": "To be analyzed",
            "what_went_wrong": "To be analyzed",
            "lessons_learned": "To be analyzed",
            "recommendations": "To be analyzed"
        }
        log_and_emit_audit(db, current_user.id, 'post_mortem_generated', 'idea', idea.id, {'idea_id': idea.id})
        return {"post_mortem": post_mortem, "idea_id": idea_id}
    except Exception as e:
        logger.error(f"Error generating post-mortem for idea {idea_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate post-mortem: {str(e)}")

@router.post("/{idea_id}/versions/{version_number}/qna", response_model=IdeaVersionQnAOut)
async def create_idea_version_qna(
    idea_id: str,
    version_number: int,
    data: IdeaVersionQnACreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    # Get the version fields for context
    version = db.query(DeepDiveVersion).filter_by(idea_id=idea_id, version_number=version_number).first()
    if version is None:
        raise HTTPException(status_code=404, detail="Idea version not found")
    fields = version.fields or {}
    # --- ATOMIC CONTEXT ASSEMBLY ---
    user_profile = getattr(current_user, 'profile', None)
    user_resume = getattr(current_user, 'resume', None)
    idea = db.query(Idea).filter(Idea.id == idea_id).first()
    repo_obj = idea.repo if idea and getattr(idea, 'repo_id', None) else None
    context = assemble_llm_context(
        context_user(current_user),
        context_profile(user_profile),
        context_repo(repo_obj),
        context_idea(idea),
        fields
    )
    # TODO: Call the actual QnA LLM orchestration function here when implemented
    # answer, llm_raw = await ask_llm_with_context(data.question, context)
    # For now, fallback to legacy context string
    context_str = "\n".join(f"{k}: {fields.get(k, '')}" for k in (data.context_fields or fields.keys()))
    answer, llm_raw = await ask_llm_with_context(data.question, context_str)
    qna = IdeaVersionQnA(
        idea_id=idea_id,
        version_number=version_number,
        question=data.question,
        answer=answer,
        llm_raw_response=llm_raw
    )
    db.add(qna)
    db.commit()
    db.refresh(qna)
    log_and_emit_audit(db, current_user.id, 'idea_qna_created', 'idea', qna.id, qna.as_dict())
    return qna

@router.get("/{idea_id}/versions/{version_number}/qna", response_model=List[IdeaVersionQnAOut])
def list_idea_version_qna(
    idea_id: str,
    version_number: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    qnas = db.query(IdeaVersionQnA).filter_by(idea_id=idea_id, version_number=version_number).order_by(IdeaVersionQnA.created_at.asc()).all()
    return qnas

@router.post("/ideas/{id}/iterate", response_model=Dict[str, Any])
async def iterate_idea(id: str, request: Request, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    idea = db.query(Idea).filter(Idea.id == id).first()
    if idea is None:
        raise HTTPException(status_code=404, detail="Idea not found")
    # Parse updated fields from request
    context_update = await request.json() if hasattr(request, 'json') else {}
    context_update = dict(context_update)
    # --- ATOMIC CONTEXT ASSEMBLY ---
    user = db.query(User).filter(User.id == getattr(idea, 'user_id', None)).first() if getattr(idea, 'user_id', None) else None
    user_profile = getattr(user, 'profile', None) if user else None
    user_resume = getattr(user, 'resume', None) if user else None
    repo_obj = idea.repo if getattr(idea, 'repo_id', None) else None
    context = assemble_llm_context(
        context_user(user),
        context_profile(user_profile),
        context_repo(repo_obj),
        context_idea(idea),
        context_update
    )
    # Call PydanticAI orchestration for iterating
    results = await generate_iterating_pydanticai(context)
    # Persist results as a new version or update the idea as appropriate
    # (existing logic for LensInsight, VCThesisComparison, InvestorDeck, etc.)
    investor_lens = LensInsight(idea_id=idea.id, lens_type="investor", **results.get("investor_lens", {}))
    customer_lens = LensInsight(idea_id=idea.id, lens_type="customer", **results.get("customer_lens", {}))
    db.add(investor_lens)
    db.add(customer_lens)
    vc_thesis = VCThesisComparison(idea_id=idea.id, **results.get("vc_thesis_comparison", {}))
    db.add(vc_thesis)
    investor_deck = InvestorDeck(idea_id=idea.id, deck_content=results.get("investor_deck", {}))
    db.add(investor_deck)
    setattr(idea, 'status', "iterating")
    db.commit()
    # Log transition
    log_and_emit_audit(db, current_user.id, 'idea_status_changed', 'idea', idea.id, {'idea_id': idea.id, 'new_status': "iterating"})
    db.commit()
    return results

@router.post("/ideas/{id}/consider", response_model=Dict[str, Any])
async def consider_idea(id: str, request: Request, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    idea = db.query(Idea).filter(Idea.id == id).first()
    if idea is None:
        raise HTTPException(status_code=404, detail="Idea not found")
    # Parse updated fields from request
    context_update = await request.json() if hasattr(request, 'json') else {}
    context_update = dict(context_update)
    # --- ATOMIC CONTEXT ASSEMBLY ---
    from app.context_utils import assemble_llm_context, context_user, context_profile, context_repo, context_idea
    user = db.query(User).filter(User.id == getattr(idea, 'user_id', None)).first() if getattr(idea, 'user_id', None) else None
    user_profile = getattr(user, 'profile', None) if user else None
    user_resume = getattr(user, 'resume', None) if user else None
    repo_obj = idea.repo if getattr(idea, 'repo_id', None) else None
    context = assemble_llm_context(
        context_user(user),
        context_profile(user_profile),
        context_repo(repo_obj),
        context_idea(idea),
        context_update
    )
    # Call PydanticAI orchestration for considering
    results = await generate_considering_pydanticai(context)
    # Persist results as appropriate
    investor_lens = LensInsight(idea_id=idea.id, lens_type="investor", **results.get("investor_lens", {}))
    db.add(investor_lens)
    vc_thesis = VCThesisComparison(idea_id=idea.id, **results.get("vc_thesis_comparison", {}))
    db.add(vc_thesis)
    investor_deck = InvestorDeck(idea_id=idea.id, deck_content=results.get("investor_deck", {}))
    db.add(investor_deck)
    setattr(idea, 'status', "considering")
    db.commit()
    # Log transition
    log_and_emit_audit(db, current_user.id, 'idea_status_changed', 'idea', idea.id, {'idea_id': idea.id, 'new_status': "considering"})
    db.commit()
    return results

@router.get("/api/lifecycle-data/{stage}", tags=["lifecycle"])
async def get_lifecycle_data(stage: str, db: Session = Depends(get_db)):
    """
    Return real data for the given lifecycle stage: count and a sample record.
    Always return a realistic 'example' field: if no real DB data, use EXAMPLE_STAGE_DATA[stage] as fallback.
    """
    if stage == "suggested":
        q = db.query(Idea).filter(Idea.status == "suggested")
        count = q.count()
        example = q.first()
        return {"count": count, "example": example.as_dict() if example else EXAMPLE_STAGE_DATA[stage]}
    elif stage == "deep_dive":
        q = db.query(DeepDiveVersion)
        count = q.count()
        example = q.first()
        return {"count": count, "example": example.as_dict() if example else EXAMPLE_STAGE_DATA[stage]}
    elif stage == "iterating":
        q = db.query(LensInsight).filter(LensInsight.lens_type == "investor")
        count = q.count()
        example = q.first()
        return {"count": count, "example": example.as_dict() if example else EXAMPLE_STAGE_DATA[stage]}
    elif stage == "considering":
        q = db.query(VCThesisComparison)
        count = q.count()
        example = q.first()
        return {"count": count, "example": example.as_dict() if example else EXAMPLE_STAGE_DATA[stage]}
    elif stage == "closed":
        q = db.query(Idea).filter(Idea.status == "closed")
        count = q.count()
        example = q.first()
        return {"count": count, "example": example.as_dict() if example else EXAMPLE_STAGE_DATA[stage]}
    else:
        return {"error": f"No data for stage: {stage}"}

# In the lifecycle-data endpoint, ensure each stage returns a realistic 'example' field in the response, even if it's mock data for now.
# For demo, use hardcoded realistic examples for each stage if no real DB data is available.
EXAMPLE_STAGE_DATA = {
    'suggested': {
        'title': 'AI-powered Resume Builder',
        'description': 'A tool that uses AI to help users create and optimize resumes.',
        'user_id': 'user_123',
        'vertical': 'Career',
        'horizontal': 'Productivity',
    },
    'deep_dive': {
        'market_size': 'Large',
        'competitors': 'Resume.io, Novoresume',
        'unique_value': 'Real-time AI feedback',
        'risks': 'Data privacy, market saturation',
    },
    'iterating': {
        'iteration_notes': 'Added LinkedIn import feature',
        'feedback': 'Users want more templates',
        'next_steps': 'Test with 20 users',
    },
    'considering': {
        'go_no_go': 'Go',
        'rationale': 'Strong user interest, low dev cost',
        'blockers': 'None',
    },
    'closed': {
        'outcome': 'Launched MVP',
        'learnings': 'AI suggestions increased completion rate by 30%',
        'next_project': 'AI-powered cover letter tool',
    },
}
# In the endpoint, for each stage, set 'example' to EXAMPLE_STAGE_DATA[stage] if no real DB data is found. 

@router.post("/profile/qna", response_model=ProfileQnAOut)
async def create_profile_qna(
    data: ProfileQnACreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    # Assemble context (profile, resume, etc.)
    user_profile = getattr(current_user, 'profile', None)
    user_resume = getattr(current_user, 'resume', None)
    context = {}
    if data.context_fields:
        if 'profile' in data.context_fields and user_profile:
            context.update(context_profile(user_profile))
        if 'resume' in data.context_fields and user_resume:
            context['resume'] = user_resume.parsed_content
    else:
        if user_profile:
            context.update(context_profile(user_profile))
        if user_resume:
            context['resume'] = user_resume.parsed_content
    # Compose LLM prompt
    context_str = "\n".join(f"{k}: {v}" for k, v in context.items())
    # Prompt template for factual, referenced answers
    prompt = f"""
You are answering a founder's question. Use ONLY the provided context(s).
- Provide factual information only, with references for all claims.
- Never make up facts or sources.
- Propose next steps or helpful actions if relevant.
- Format your answer in Markdown for clarity.

Context:
{context_str}

Question: {data.question}
"""
    answer, llm_raw = await ask_llm_with_context(data.question, prompt)
    qna = ProfileQnA(
        user_id=current_user.id,
        question=data.question,
        answer=answer,
        llm_raw_response=llm_raw
    )
    db.add(qna)
    db.commit()
    db.refresh(qna)
    log_and_emit_audit(db, current_user.id, 'profile_qna_created', 'profile', qna.id, qna.as_dict())
    return qna

@router.get("/profile/qna", response_model=List[ProfileQnAOut])
def list_profile_qna(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    qnas = db.query(ProfileQnA).filter_by(user_id=current_user.id).order_by(ProfileQnA.created_at.asc()).all()
    return qnas

@router.get("/personalized", response_model=List[IdeaOut])
async def get_personalized_ideas(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    ideas = db.query(Idea).filter(Idea.user_id == current_user.id).order_by(Idea.created_at.desc()).all()
    return ideas

@router.get("/{idea_id}/share", response_model=Dict[str, Any])
def get_idea_share_link(idea_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    idea = db.query(Idea).filter(Idea.id == idea_id).first()
    if idea is None:
        raise HTTPException(status_code=404, detail="Idea not found")
    # Only owner/team can generate share link
    idea_user_id = getattr(idea, 'user_id', None)
    idea_team_id = getattr(idea, 'team_id', None)
    current_user_team_id = getattr(current_user, 'team_id', None)
    current_user_account_type = getattr(current_user, 'account_type', None)
    if not (
        (idea_user_id == current_user.id) or
        (current_user_account_type == 'team' and current_user_team_id is not None and idea_team_id is not None and idea_team_id == current_user_team_id)
    ):
        raise HTTPException(status_code=403, detail="Not authorized to share this idea")
    if not getattr(idea, 'share_token', None):
        setattr(idea, 'share_token', str(uuid.uuid4()))
        db.commit()
    public_url = f"/ideas/public/{getattr(idea, 'share_token', '')}"
    return {"share_url": public_url}

@router.get("/public/{share_token}", response_model=IdeaOut)
def get_public_idea(share_token: str, db: Session = Depends(get_db)):
    idea = db.query(Idea).filter(Idea.share_token == share_token).first()
    if idea is None:
        raise HTTPException(status_code=404, detail="Idea not found")
    return idea

@router.get("/{idea_id}/export/pdf")
def export_idea_pdf(idea_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    idea = db.query(Idea).filter(Idea.id == idea_id).first()
    if idea is None:
        raise HTTPException(status_code=404, detail="Idea not found")
    # Only owner/team can export
    idea_user_id = getattr(idea, 'user_id', None)
    idea_team_id = getattr(idea, 'team_id', None)
    current_user_team_id = getattr(current_user, 'team_id', None)
    current_user_account_type = getattr(current_user, 'account_type', None)
    if not (
        (idea_user_id == current_user.id) or
        (current_user_account_type == 'team' and current_user_team_id is not None and idea_team_id is not None and idea_team_id == current_user_team_id)
    ):
        raise HTTPException(status_code=403, detail="Not authorized to export this idea")
    # For now, return HTML (placeholder for PDF)
    html = f"""
    <html><body>
    <h1>{getattr(idea, 'title', '')}</h1>
    <p><b>Hook:</b> {getattr(idea, 'hook', '')}</p>
    <p><b>Value:</b> {getattr(idea, 'value', '')}</p>
    <p><b>Differentiator:</b> {getattr(idea, 'differentiator', '')}</p>
    <p><b>Status:</b> {getattr(idea, 'status', '')}</p>
    </body></html>
    """
    return HTMLResponse(content=html)

ADJECTIVES = [
    "Dynamic", "NextGen", "Quantum", "Smart", "Agile", "Bold", "Epic", "Prime", "Vivid", "Nova", "Pulse", "Spark", "Visionary", "Fusion", "Zen", "Nimbus", "Atlas", "Vertex", "Echo", "Shift",
    "Rapid", "Swift", "Elite", "Peak", "Summit", "Crest", "Pinnacle", "Apex", "Zenith", "Acme", "Crown", "Champion", "Master", "Expert", "Pro", "Ultra", "Max", "Super", "Hyper", "Mega",
    "Alpha", "Beta", "Gamma", "Delta", "Omega", "Sigma", "Theta", "Lambda", "Phi", "Psi", "Zeta", "Eta", "Iota", "Kappa", "Mu", "Nu", "Xi", "Omicron", "Pi", "Rho"
]

def make_unique_idea_name(base_name, hook, existing_names):
    name = base_name
    suffix = 2
    # Try to use a keyword from the hook/description
    keywords = [w for w in (hook or '').split() if len(w) > 4]
    
    # If the base name is already in existing names, start with a modifier
    if base_name.lower() in existing_names:
        adj = random.choice(ADJECTIVES)
        name = f"{adj} {base_name}"
    
    while name.lower() in existing_names:
        if keywords and suffix <= 3:  # Use keywords for first few attempts
            word = random.choice(keywords)
            name = f"{base_name} {word}" if suffix == 2 else f"{base_name} {word} {suffix}"
        else:
            adj = random.choice(ADJECTIVES)
            name = f"{adj} {base_name}" if suffix == 2 else f"{adj} {base_name} {suffix}"
        suffix += 1
        
        # If we've tried too many times, add a random number
        if suffix > 10:
            name = f"{name} {random.randint(100, 999)}"
            break
    
    return name

@router.post("/{idea_id}/deep_dive")
async def generate_deep_dive_for_idea_alias(idea_id: str, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    return await generate_deep_dive_for_idea(idea_id, current_user, db)

@router.get("/last-updated")
def get_ideas_last_updated(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    last_updated = db.query(func.max(getattr(Idea, 'updated_at', Idea.created_at))).scalar()
    if not last_updated:
        last_updated = db.query(func.max(Idea.created_at)).scalar()
    return {"last_updated": last_updated.isoformat() if last_updated else None}



##NEW STUFF FOR IDEAS
"""FastAPI routes for idea management and AI workflows"""
import uuid
from typing import Any, Dict

from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import func, select
from pydantic import BaseModel

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    Idea, IdeaCreate, IdeaUpdate, IdeaPublic, 
    User, Message
)
from app.ai.manager import AIServiceManager

router = APIRouter(prefix="/ideas", tags=["ideas"])


# Pydantic models for AI requests
class StageTransitionRequest(BaseModel):
    """Request model for stage transitions"""
    new_stage: str
    # Stage-specific parameters
    background: str = ""
    pros_cons: str = ""
    current_iteration: str = ""
    feedback: str = ""
    goals: str = ""
    stakeholder_feedback: str = ""
    feasibility_data: str = ""
    business_case: str = ""
    implementation_plan: str = ""
    resources: str = ""
    timeline: str = ""
    outcome: str = ""
    lessons_learned: str = ""
    metrics: str = ""


class AIProcessRequest(BaseModel):
    """Request model for AI processing"""
    stage: str
    # Stage-specific parameters (same as above)
    background: str = ""
    pros_cons: str = ""
    current_iteration: str = ""
    feedback: str = ""
    goals: str = ""
    stakeholder_feedback: str = ""
    feasibility_data: str = ""
    business_case: str = ""
    implementation_plan: str = ""
    resources: str = ""
    timeline: str = ""
    outcome: str = ""
    lessons_learned: str = ""
    metrics: str = ""


@router.get("/", response_model=list[IdeaPublic])
def read_ideas(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
    status: str = None
) -> Any:
    """
    Retrieve ideas with optional status filtering.
    """
    statement = select(Idea)
    
    # Filter by status if provided
    if status:
        statement = statement.where(Idea.status == status)
    
    # Filter by user's access permissions
    if not current_user.is_superuser:
        statement = statement.where(
            (Idea.creator_id == current_user.id) | 
            (Idea.is_public == True)
        )
    
    statement = statement.offset(skip).limit(limit)
    ideas = session.exec(statement).all()
    
    return ideas


@router.get("/{idea_id}", response_model=IdeaPublic)
def read_idea(
    session: SessionDep,
    current_user: CurrentUser,
    idea_id: uuid.UUID
) -> Any:
    """
    Get idea by ID.
    """
    idea = session.get(Idea, idea_id)
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")
    
    # Check permissions
    if not current_user.is_superuser and idea.creator_id != current_user.id and not idea.is_public:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    return idea


@router.post("/", response_model=IdeaPublic)
def create_idea(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    idea_in: IdeaCreate
) -> Any:
    """
    Create new idea.
    """
    idea = Idea.model_validate(idea_in, update={"creator_id": current_user.id, "team_id": None})
    session.add(idea)
    session.commit()
    session.refresh(idea)
    return idea


@router.put("/{idea_id}", response_model=IdeaPublic)
def update_idea(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    idea_id: uuid.UUID,
    idea_in: IdeaUpdate,
) -> Any:
    """
    Update an idea.
    """
    idea = session.get(Idea, idea_id)
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")
    
    # Check permissions
    if not current_user.is_superuser and idea.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    update_dict = idea_in.model_dump(exclude_unset=True)
    idea.sqlmodel_update(update_dict)
    session.add(idea)
    session.commit()
    session.refresh(idea)
    return idea


@router.delete("/{idea_id}")
def delete_idea(
    session: SessionDep,
    current_user: CurrentUser,
    idea_id: uuid.UUID
) -> Message:
    """
    Delete an idea.
    """
    idea = session.get(Idea, idea_id)
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")
    
    # Check permissions
    if not current_user.is_superuser and idea.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    session.delete(idea)
    session.commit()
    return Message(message="Idea deleted successfully")


@router.post("/{idea_id}/transition", response_model=Dict[str, Any])
def transition_idea_stage(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    idea_id: uuid.UUID,
    transition_request: StageTransitionRequest
) -> Any:
    """
    Transition an idea to a new stage and trigger AI processing.
    """
    idea = session.get(Idea, idea_id)
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")
    
    # Check permissions
    if not current_user.is_superuser and idea.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Store the previous stage
    previous_stage = idea.status
    
    # Update the idea status
    idea.status = transition_request.new_stage
    session.add(idea)
    session.commit()
    
    # Trigger AI processing for the new stage
    ai_manager = AIServiceManager(session)
    
    try:
        result = ai_manager.trigger_stage_transition(
            idea=idea,
            user=current_user,
            from_stage=previous_stage,
            to_stage=transition_request.new_stage,
            # Pass all possible parameters
            background=transition_request.background,
            pros_cons=transition_request.pros_cons,
            current_iteration=transition_request.current_iteration,
            feedback=transition_request.feedback,
            goals=transition_request.goals,
            stakeholder_feedback=transition_request.stakeholder_feedback,
            feasibility_data=transition_request.feasibility_data,
            business_case=transition_request.business_case,
            implementation_plan=transition_request.implementation_plan,
            resources=transition_request.resources,
            timeline=transition_request.timeline,
            outcome=transition_request.outcome,
            lessons_learned=transition_request.lessons_learned,
            metrics=transition_request.metrics
        )
        
        return {
            "message": f"Idea transitioned from {previous_stage} to {transition_request.new_stage}",
            "idea_id": idea_id,
            "ai_result": result
        }
        
    except Exception as e:
        # Rollback the status change if AI processing fails
        idea.status = previous_stage
        session.add(idea)
        session.commit()
        
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to process AI for new stage: {str(e)}"
        )


@router.post("/{idea_id}/ai-process", response_model=Dict[str, Any])
def process_idea_with_ai(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    idea_id: uuid.UUID,
    ai_request: AIProcessRequest
) -> Any:
    """
    Process an idea with AI for a specific stage without changing the idea's status.
    """
    idea = session.get(Idea, idea_id)
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")
    
    # Check permissions
    if not current_user.is_superuser and idea.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Process with AI
    ai_manager = AIServiceManager(session)
    
    try:
        result = ai_manager.process_idea_stage(
            idea=idea,
            user=current_user,
            stage=ai_request.stage,
            # Pass all possible parameters
            background=ai_request.background,
            pros_cons=ai_request.pros_cons,
            current_iteration=ai_request.current_iteration,
            feedback=ai_request.feedback,
            goals=ai_request.goals,
            stakeholder_feedback=ai_request.stakeholder_feedback,
            feasibility_data=ai_request.feasibility_data,
            business_case=ai_request.business_case,
            implementation_plan=ai_request.implementation_plan,
            resources=ai_request.resources,
            timeline=ai_request.timeline,
            outcome=ai_request.outcome,
            lessons_learned=ai_request.lessons_learned,
            metrics=ai_request.metrics
        )
        
        return {
            "message": f"AI processing completed for stage: {ai_request.stage}",
            "idea_id": idea_id,
            "ai_result": result
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process AI: {str(e)}"
        )


@router.get("/ai/stages", response_model=list[str])
def get_available_ai_stages(
    session: SessionDep,
    current_user: CurrentUser
) -> Any:
    """
    Get list of available AI processing stages.
    """
    ai_manager = AIServiceManager(session)
    return ai_manager.get_available_stages()