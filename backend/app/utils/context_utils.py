import logging
from typing import Optional, List

logger = logging.getLogger(__name__)

def build_user_context(
    user,
    profile=None,
    resume=None,
    include_fields: Optional[List[str]] = None,
    exclude_fields: Optional[List[str]] = None,
) -> str:
    """
    Build a robust, flexible user context string for LLM prompts.
    - include_fields: Only include these context parts (if specified)
    - exclude_fields: Exclude these context parts (if specified)
    """
    # All possible context fields
    context_parts = {}
    # Basic user info
    context_parts['user'] = f"User: {getattr(user, 'first_name', '')} {getattr(user, 'last_name', '')}"
    context_parts['email'] = f"Email: {getattr(user, 'email', '')}"
    # Profile fields
    if profile:
        if getattr(profile, 'background', None):
            context_parts['background'] = f"Background: {profile.background}"
        if getattr(profile, 'location', None):
            loc = getattr(profile, 'location', None)
            if isinstance(loc, dict):
                loc_str = ', '.join(f"{k}: {v}" for k, v in loc.items() if v)
                context_parts['location'] = f"Location: {loc_str}"
            else:
                context_parts['location'] = f"Location: {loc}"
        if getattr(profile, 'skills', None):
            context_parts['skills'] = f"Skills: {', '.join(profile.skills)}"
        if getattr(profile, 'verticals', None):
            context_parts['verticals'] = f"Verticals: {', '.join(profile.verticals)}"
        if getattr(profile, 'horizontals', None):
            context_parts['horizontals'] = f"Horizontals: {', '.join(profile.horizontals)}"
        if getattr(profile, 'interests', None):
            context_parts['interests'] = f"Interests: {', '.join(profile.interests)}"
        if getattr(profile, 'preferred_business_models', None):
            context_parts['business_models'] = f"Preferred Business Models: {', '.join(profile.preferred_business_models)}"
        if getattr(profile, 'risk_tolerance', None):
            context_parts['risk_tolerance'] = f"Risk Tolerance: {profile.risk_tolerance}"
        if getattr(profile, 'time_availability', None):
            context_parts['time_availability'] = f"Time Availability: {profile.time_availability}"
    # Resume fields
    if resume is not None and getattr(resume, 'is_processed', False) is True:
        if getattr(resume, 'extracted_skills', None):
            context_parts['resume_skills'] = f"Resume Skills: {', '.join(resume.extracted_skills)}"
        if getattr(resume, 'work_experience', None):
            work_exp = []
            for exp in resume.work_experience:
                if isinstance(exp, dict):
                    title = exp.get('title', '')
                    company = exp.get('company', '')
                    if title and company:
                        work_exp.append(f"{title} at {company}")
            if work_exp:
                context_parts['work_experience'] = f"Work Experience: {'; '.join(work_exp)}"
        if getattr(resume, 'education', None):
            education_list = []
            for edu in resume.education:
                if isinstance(edu, dict):
                    degree = edu.get('degree', '')
                    institution = edu.get('institution', '')
                    if degree and institution:
                        education_list.append(f"{degree} from {institution}")
            if education_list:
                context_parts['education'] = f"Education: {'; '.join(education_list)}"
    # Determine which fields to include
    all_fields = list(context_parts.keys())
    if include_fields is not None:
        fields = [f for f in include_fields if f in context_parts]
    elif exclude_fields is not None:
        fields = [f for f in all_fields if f not in exclude_fields]
    else:
        fields = all_fields
    # Log what is included/excluded
    logger.info(f"[ContextUtils] Building user context. Included fields: {fields}")
    if include_fields:
        logger.info(f"[ContextUtils] Explicitly included fields: {include_fields}")
    if exclude_fields:
        logger.info(f"[ContextUtils] Explicitly excluded fields: {exclude_fields}")
    # Build the context string
    user_context = "\n".join([context_parts[f] for f in fields if f in context_parts])
    # Add a summary if we have enough information
    summary = None
    if 'skills' in fields or 'interests' in fields or 'verticals' in fields or 'horizontals' in fields:
        summary = f"Summary: {getattr(user, 'first_name', '')} is a professional with "
        if 'skills' in fields and 'skills' in context_parts:
            summary += f"skills in {', '.join(profile.skills[:3])}" if profile and getattr(profile, 'skills', None) else ''
        if 'interests' in fields and 'interests' in context_parts:
            summary += f", interested in {', '.join(profile.interests[:2])}" if profile and getattr(profile, 'interests', None) else ''
        if 'verticals' in fields and 'verticals' in context_parts:
            summary += f", working in {', '.join(profile.verticals[:2])}" if profile and getattr(profile, 'verticals', None) else ''
        if 'horizontals' in fields and 'horizontals' in context_parts:
            summary += f", focusing on {', '.join(profile.horizontals[:2])}" if profile and getattr(profile, 'horizontals', None) else ''
        summary += "."
    if summary:
        user_context = summary + "\n\n" + user_context
    return user_context

# Atomic context builders

def context_user(user) -> dict:
    if not user:
        return {}
    if isinstance(user, list):
        # Multiple users (team)
        return {
            'team_users': [
                {
                    'user_id': getattr(u, 'id', ''),
                    'user_name': f"{getattr(u, 'first_name', '')} {getattr(u, 'last_name', '')}",
                    'user_email': getattr(u, 'email', ''),
                    'user_tier': getattr(u, 'tier', ''),
                    'user_account_type': getattr(u, 'account_type', ''),
                } for u in user if u
            ]
        }
    # Single user
    return {
        'user_id': getattr(user, 'id', ''),
        'user_name': f"{getattr(user, 'first_name', '')} {getattr(user, 'last_name', '')}",
        'user_email': getattr(user, 'email', ''),
        'user_tier': getattr(user, 'tier', ''),
        'user_account_type': getattr(user, 'account_type', ''),
    }

def context_profile(profile) -> dict:
    if not profile:
        return {}
    if isinstance(profile, list):
        # Multiple profiles (team)
        return {
            'team_profiles': [
                {
                    'profile_background': getattr(p, 'background', ''),
                    'profile_location': ', '.join(f"{k}: {v}" for k, v in getattr(p, 'location', {}).items()) if isinstance(getattr(p, 'location', None), dict) else getattr(p, 'location', ''),
                    'profile_skills': ', '.join(getattr(p, 'skills', []) or []),
                    'profile_verticals': ', '.join(getattr(p, 'verticals', []) or []),
                    'profile_horizontals': ', '.join(getattr(p, 'horizontals', []) or []),
                    'profile_interests': ', '.join(getattr(p, 'interests', []) or []),
                    'profile_business_models': ', '.join(getattr(p, 'preferred_business_models', []) or []),
                    'profile_risk_tolerance': getattr(p, 'risk_tolerance', ''),
                    'profile_time_availability': getattr(p, 'time_availability', ''),
                } for p in profile if p
            ]
        }
    # Single profile
    return {
        'profile_background': getattr(profile, 'background', ''),
        'profile_location': ', '.join(f"{k}: {v}" for k, v in getattr(profile, 'location', {}).items()) if isinstance(getattr(profile, 'location', None), dict) else getattr(profile, 'location', ''),
        'profile_skills': ', '.join(getattr(profile, 'skills', []) or []),
        'profile_verticals': ', '.join(getattr(profile, 'verticals', []) or []),
        'profile_horizontals': ', '.join(getattr(profile, 'horizontals', []) or []),
        'profile_interests': ', '.join(getattr(profile, 'interests', []) or []),
        'profile_business_models': ', '.join(getattr(profile, 'preferred_business_models', []) or []),
        'profile_risk_tolerance': getattr(profile, 'risk_tolerance', ''),
        'profile_time_availability': getattr(profile, 'time_availability', ''),
    }

def context_resume(resume) -> dict:
    if not resume:
        return {}
    if isinstance(resume, list):
        # Multiple resumes (team)
        return {
            'team_resumes': [
                context_resume(r) for r in resume if r
            ]
        }
    if not getattr(resume, 'is_processed', False):
        return {}
    work_exp = []
    for exp in getattr(resume, 'work_experience', []) or []:
        if isinstance(exp, dict):
            title = exp.get('title', '')
            company = exp.get('company', '')
            if title and company:
                work_exp.append(f"{title} at {company}")
    education_list = []
    for edu in getattr(resume, 'education', []) or []:
        if isinstance(edu, dict):
            degree = edu.get('degree', '')
            institution = edu.get('institution', '')
            if degree and institution:
                education_list.append(f"{degree} from {institution}")
    return {
        'resume_skills': ', '.join(getattr(resume, 'extracted_skills', []) or []),
        'resume_work_experience': '; '.join(work_exp),
        'resume_education': '; '.join(education_list),
    }

def context_repo(repo) -> dict:
    if not repo:
        return {}
    return {
        'repo_id': getattr(repo, 'id', ''),
        'repo_name': getattr(repo, 'name', ''),
        'repo_url': getattr(repo, 'url', ''),
        'repo_summary': getattr(repo, 'summary', ''),
        'repo_language': getattr(repo, 'language', ''),
    }

def context_idea(idea) -> dict:
    if not idea:
        return {}
    # Handle SQLAlchemy model objects
    if hasattr(idea, '__dict__'):
        # SQLAlchemy model - extract attributes
        return {
            'title': getattr(idea, 'title', ''),
            'hook': getattr(idea, 'hook', ''),
            'value': getattr(idea, 'value', ''),
            'evidence': getattr(idea, 'evidence', ''),
            'differentiator': getattr(idea, 'differentiator', ''),
            'call_to_action': getattr(idea, 'call_to_action', ''),
            'score': getattr(idea, 'score', None),
            'mvp_effort': getattr(idea, 'mvp_effort', None),
            'status': getattr(idea, 'status', ''),
            'type': getattr(idea, 'type', ''),
            'scope_commitment': getattr(idea, 'scope_commitment', ''),
            'source_of_inspiration': getattr(idea, 'source_of_inspiration', ''),
            'problem_statement': getattr(idea, 'problem_statement', ''),
            'elevator_pitch': getattr(idea, 'elevator_pitch', ''),
            'core_assumptions': getattr(idea, 'core_assumptions', []),
            'riskiest_assumptions': getattr(idea, 'riskiest_assumptions', []),
            'generation_notes': getattr(idea, 'generation_notes', ''),
        }
    elif isinstance(idea, dict):
        # Dictionary - copy all fields
        return {k: v for k, v in idea.items()}
    else:
        # Fallback - try to convert to dict
        return {}

def context_deep_dive(deep_dive) -> dict:
    if not deep_dive:
        return {}
    return {'deep_dive': deep_dive}

def context_market(market_snapshot) -> dict:
    if not market_snapshot:
        return {}
    return {'market_snapshot': market_snapshot}

def context_lens(lens_insight) -> dict:
    if not lens_insight:
        return {}
    return {'lens_insight': lens_insight}

def context_revisions(revisions) -> dict:
    if not revisions:
        return {}
    return {'revisions': revisions}

def assemble_llm_context(*context_pieces) -> dict:
    context = {}
    for piece in context_pieces:
        if piece:
            if isinstance(piece, list):
                # Merge list of dicts (e.g., team context)
                for subpiece in piece:
                    if subpiece:
                        context.update(subpiece)
            else:
                context.update(piece)
    return context

# Update build_llm_context_for_idea to use atomic pieces

def build_llm_context_for_idea(
    idea: dict,
    previous_outputs: Optional[dict] = None,
    revisions: Optional[list] = None,
    user=None,
    profile=None,
    resume=None,
    repo=None
) -> dict:
    previous_outputs = previous_outputs or {}
    revisions = revisions or []
    context = assemble_llm_context(
        context_idea(idea),
        *(context_deep_dive(previous_outputs.get('deep_dive')) if previous_outputs.get('deep_dive') else []),
        *(context_market(previous_outputs.get('market_snapshot')) if previous_outputs.get('market_snapshot') else []),
        *(context_lens(previous_outputs.get('lens_insight')) if previous_outputs.get('lens_insight') else []),
        context_revisions(revisions),
        context_user(user),
        context_profile(profile),
        context_resume(resume),
        context_repo(repo)
    )
    return context 