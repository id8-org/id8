from typing import Optional, Dict, Any, List
from app.models import User, UserProfile, UserResume, Repo
from app.llm_center.legacy_wrappers import generate_idea_pitches, generate_deep_dive, sanitize_idea_fields
import logging
from app.context_utils import build_user_context

logger = logging.getLogger(__name__)

def match_best_repo_to_context(db, vertical: str, horizontal: str, business_model: str, context: str) -> Optional[Any]:
    """
    Find the best matching trending repo for the given context using simple keyword scoring.
    """
    repos = db.query(Repo).all()
    if not repos:
        return None
    # Build a context string to match
    context_text = f"{vertical or ''} {horizontal or ''} {business_model or ''} {context or ''}".lower()
    def score_repo(repo):
        score = 0
        summary_val = getattr(repo, 'summary', None)
        language_val = getattr(repo, 'language', None)
        name_val = getattr(repo, 'name', None)
        summary = str(summary_val) if summary_val is not None else ''
        language = str(language_val) if language_val is not None else ''
        name = str(name_val) if name_val is not None else ''
        if isinstance(summary, str) and summary.strip() != '' and any(word in summary.lower() for word in context_text.split()):
            score += sum(word in summary.lower() for word in context_text.split())
        if isinstance(language, str) and language.strip() != '' and language.lower() in context_text:
            score += 1
        if isinstance(name, str) and name.strip() != '' and name.lower() in context_text:
            score += 1
        return score
    best_repo = max(repos, key=score_repo, default=None)
    if best_repo is None or score_repo(best_repo) == 0:
        return None
    return best_repo

async def generate_personalized_ideas(
    repo: Optional[Any],
    user: User,
    db: Any,
    additional_context: str = ""
) -> Dict[str, Any]:
    """Generate personalized ideas based on user profile and preferences. For team accounts, aggregate all team member profiles."""
    try:
        if user.account_type == 'team' and user.team_id:
            # Aggregate all team member profiles
            team_members = db.query(User).filter(User.team_id == user.team_id).all()
            team_contexts = []
            for member in team_members:
                profile = db.query(UserProfile).filter(UserProfile.user_id == member.id).first()
                resume = db.query(UserResume).filter(UserResume.user_id == member.id).first()
                team_contexts.append(build_user_context(member, profile, resume))
            user_context = '\n\n'.join(team_contexts)
        else:
            # Get user profile and resume
            profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
            resume = db.query(UserResume).filter(UserResume.user_id == user.id).first()
            user_context = build_user_context(user, profile, resume)
        # Combine with additional context
        full_context = f"{user_context}\n\nAdditional Context: {additional_context}" if additional_context else user_context
        # Use repo summary as description if repo is provided
        repo_description = ''
        if repo is not None and hasattr(repo, 'summary'):
            summary_val = getattr(repo, 'summary', None)
            if isinstance(summary_val, str) and summary_val.strip() != '':
                repo_description = summary_val
        # Fallback: if repo_description is empty, use user_context or a generic string
        if not repo_description:
            repo_description = user_context or 'A trending open source project.'
        result = await generate_idea_pitches({'repo_description': repo_description, 'user_context': full_context})
        result['user_context'] = user_context
        result['matched_repo'] = {
            'id': repo.id,
            'name': repo.name,
            'url': repo.url,
            'summary': repo.summary,
            'language': repo.language
        } if repo else None
        # After calling generate_idea_pitches, ensure assumptions and repo_usage are present in each idea
        valid_ideas = []
        if 'ideas' in result and isinstance(result['ideas'], list):
            for idea in result['ideas']:
                # Always sanitize fields to ensure all required fields are present
                idea = sanitize_idea_fields(idea)
                # Defensive: skip if required fields are missing or empty
                required_fields = ["title", "hook", "value", "evidence", "differentiator", "call_to_action"]
                missing = [f for f in required_fields if not idea.get(f)]
                if missing:
                    logger.warning(f"Skipping personalized idea due to missing fields: {missing}. Idea: {idea}. Raw: {result.get('raw')}")
                    continue
                if 'assumptions' not in idea:
                    idea['assumptions'] = []
                if 'repo_usage' not in idea:
                    idea['repo_usage'] = ''
                valid_ideas.append(idea)
        result['ideas'] = valid_ideas
        if not valid_ideas:
            logger.error(f"No valid personalized ideas generated for user {user.id}. Raw LLM response: {result.get('raw')}")
            # Return a user-friendly error instead of raising
            return {
                'ideas': [],
                'error': 'No high-quality ideas could be generated. Please try again or adjust your input.',
                'llm_raw': result.get('raw')
            }
        return result
    except Exception as e:
        logger.error(f"Error generating personalized ideas for user {user.id}: {e}")
        raise

async def generate_personalized_deep_dive(
    idea_data: Dict[str, Any],
    user: User,
    db: Any
) -> Dict[str, Any]:
    """Generate personalized deep dive analysis based on user profile. For team accounts, aggregate all team member profiles."""
    try:
        logger.info(f"[PersonalizedDeepDive] Starting personalized deep dive for user {user.id}")
        if user.account_type == 'team' and user.team_id:
            team_members = db.query(User).filter(User.team_id == user.team_id).all()
            team_contexts = []
            for member in team_members:
                profile = db.query(UserProfile).filter(UserProfile.user_id == member.id).first()
                resume = db.query(UserResume).filter(UserResume.user_id == member.id).first()
                team_contexts.append(build_user_context(member, profile, resume))
            user_context = '\n\n'.join(team_contexts)
        else:
            profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
            resume = db.query(UserResume).filter(UserResume.user_id == user.id).first()
            user_context = build_user_context(user, profile, resume)
        logger.info(f"[PersonalizedDeepDive] Built user context (length: {len(user_context)})")
        enhanced_idea_data = idea_data.copy()
        enhanced_idea_data['user_context'] = user_context
        logger.info(f"[PersonalizedDeepDive] Enhanced idea data keys: {list(enhanced_idea_data.keys())}")
        result = await generate_deep_dive(enhanced_idea_data)
        logger.info(f"[PersonalizedDeepDive] generate_deep_dive returned result type: {type(result)}")
        logger.debug(f"[PersonalizedDeepDive] Result keys: {list(result.keys()) if isinstance(result, dict) else 'Not a dict'}")
        deep_dive = result.get('deep_dive', {})
        logger.info(f"[PersonalizedDeepDive] Deep dive type: {type(deep_dive)}")
        logger.debug(f"[PersonalizedDeepDive] Deep dive content: {deep_dive}")
        if isinstance(deep_dive, dict):
            for section in ["Signal Score", "Summary", "Product", "Market", "Moat", "Funding"]:
                try:
                    content = safe_extract_section(deep_dive, section)
                    logger.info(f"[PersonalizedDeepDive] Section '{section}' content length: {len(content) if content else 0}")
                    if not content:
                        logger.warning(f"[PersonalizedDeepDive] Section '{section}' missing in deep dive output for user {user.id}.")
                except Exception as section_error:
                    logger.error(f"[PersonalizedDeepDive] Error extracting section '{section}': {section_error}")
                    logger.error(f"[PersonalizedDeepDive] Section error type: {type(section_error)}")
        logger.info("[PersonalizedDeepDive] Returning result successfully")
        return result
    except Exception as e:
        logger.error(f"[PersonalizedDeepDive] Error generating personalized deep dive for user {user.id}: {e}")
        logger.debug(f"[PersonalizedDeepDive] Exception type: {type(e)}")
        logger.debug(f"[PersonalizedDeepDive] Exception traceback: {e}")
        return {
            "deep_dive": {
                "sections": [
                    {"title": "Error Generating Deep Dive", "content": f"An error occurred: {str(e)}"}
                ]
            },
            "raw": ""
        }

def get_user_preferences(user: User, db: Any) -> Dict[str, Any]:
    """Get user preferences for idea filtering and ranking"""
    profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
    
    preferences = {
        'preferred_industries': [],
        'preferred_business_models': [],
        'risk_tolerance': 'medium',
        'time_availability': 'full_time'
    }
    
    if profile:
        preferences.update({
            'preferred_industries': getattr(profile, 'preferred_industries', []) or [],
            'preferred_business_models': getattr(profile, 'preferred_business_models', []) or [],
            'risk_tolerance': getattr(profile, 'risk_tolerance', 'medium') or 'medium',
            'time_availability': getattr(profile, 'time_availability', 'full_time') or 'full_time'
        })
    
    return preferences

def filter_ideas_by_preferences(ideas: List[Dict[str, Any]], preferences: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Filter and rank ideas based on user preferences"""
    if not preferences['preferred_industries'] and not preferences['preferred_business_models']:
        return ideas
    
    def calculate_preference_score(idea: Dict[str, Any]) -> float:
        score = 0.0
        
        # Check if idea matches preferred industries
        if preferences['preferred_industries']:
            idea_text = f"{idea.get('title', '')} {idea.get('hook', '')} {idea.get('value', '')}".lower()
            for industry in preferences['preferred_industries']:
                if industry.lower() in idea_text:
                    score += 2.0
        
        # Check if idea matches preferred business models
        if preferences['preferred_business_models']:
            idea_text = f"{idea.get('title', '')} {idea.get('hook', '')} {idea.get('value', '')}".lower()
            for model in preferences['preferred_business_models']:
                if model.lower() in idea_text:
                    score += 1.5
        
        # Adjust score based on risk tolerance
        if preferences['risk_tolerance'] == 'low':
            # Prefer lower effort ideas
            effort = idea.get('mvp_effort', 5)
            if effort <= 3:
                score += 1.0
        elif preferences['risk_tolerance'] == 'high':
            # Prefer higher potential ideas
            idea_score = idea.get('score', 5)
            if idea_score >= 8:
                score += 1.0
        
        return score
    
    # Calculate preference scores
    scored_ideas = [(idea, calculate_preference_score(idea)) for idea in ideas]
    
    # Sort by preference score (descending) and then by original score
    scored_ideas.sort(key=lambda x: (x[1], x[0].get('score', 0)), reverse=True)
    
    # Return ideas without scores
    return [idea for idea, score in scored_ideas]

async def run_llm_with_user_context(
    user: User,
    db: Any,
    llm_func,
    idea_data: Optional[dict] = None,
    extra_args: Optional[dict] = None,
    inject_context_into: str = 'idea_data',
    additional_context: str = ''
) -> dict:
    """
    Generic pipeline to run any LLM function with user context injected.
    - user: User object
    - db: SQLAlchemy session
    - llm_func: the LLM function to call (e.g., generate_case_study)
    - idea_data: dict of idea fields (title, hook, etc.)
    - extra_args: dict of extra args for the LLM function (e.g., lens_type, company_name)
    - inject_context_into: where to inject user_context ('idea_data' or 'context')
    - additional_context: extra string to append to user context
    """
    if idea_data is None:
        idea_data = {}
    if extra_args is None:
        extra_args = {}
    profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
    resume = db.query(UserResume).filter(UserResume.user_id == user.id).first()
    user_context = build_user_context(user, profile, resume)
    if additional_context:
        user_context = f"{user_context}\n\n{additional_context}"
    # Inject user_context into idea_data or as a separate arg
    idea_data = idea_data.copy()
    idea_data['user_context'] = user_context
    # Merge extra_args
    call_args = extra_args.copy() if extra_args else {}
    # If the LLM function is generate_case_study, generate_market_snapshot, or generate_investor_deck, merge idea_data and extra_args into a single context dict
    if llm_func.__name__ in ['generate_case_study', 'generate_market_snapshot', 'generate_investor_deck']:
        context = {**idea_data, **call_args}
        result = await llm_func(context)
    else:
        # Most LLM funcs take idea_data as first arg
        call_args = {**{'idea_data': idea_data}, **call_args}
        result = await llm_func(**call_args)
    result['user_context'] = user_context
    return result

def safe_extract_section(deep_dive, section_title):
    try:
        logger.info(f"[SafeExtract] Extracting section '{section_title}' from deep_dive type: {type(deep_dive)}")
        logger.debug(f"[SafeExtract] Deep dive content: {deep_dive}")
        
        if not isinstance(deep_dive, dict):
            logger.warning(f"[SafeExtract] Deep dive is not a dict, it's {type(deep_dive)}")
            return ''
            
        sections = deep_dive.get('sections', [])
        logger.info(f"[SafeExtract] Sections type: {type(sections)}, length: {len(sections) if isinstance(sections, list) else 'not a list'}")
        
        if not isinstance(sections, list):
            logger.warning(f"[SafeExtract] Sections is not a list, it's {type(sections)}")
            return ''
            
        for i, section in enumerate(sections):
            logger.info(f"[SafeExtract] Section {i}: {section}")
            if isinstance(section, dict):
                title = section.get('title', '')
                logger.debug(f"[SafeExtract] Section {i} title: '{title}'")
                if section_title.lower() in title.lower():
                    content = section.get('content', '')
                    logger.info(f"[SafeExtract] Found section '{section_title}' with content length: {len(content)}")
                    return content
        
        logger.info(f"[SafeExtract] Section '{section_title}' not found in any section")
        return ''
        
    except Exception as e:
        logger.error(f"[SafeExtract] Error extracting section '{section_title}': {e}")
        logger.debug(f"[SafeExtract] Error type: {type(e)}")
        logger.debug(f"[SafeExtract] Deep dive that caused error: {deep_dive}")
        return '' 