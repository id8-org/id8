"""
Compatibility wrapper for legacy LLM functions

This module provides backward compatibility while migrating to the centralized LLM center.
These functions wrap the centralized LLM service to maintain the same interface.
"""

import asyncio
from typing import Dict, Any, List, Optional
from app.llm_center import LLMCenter, PromptType, ProcessingContext
from app.llm_center.parsers import ResponseParser
from app.types import DeepDiveIdeaData, IteratingIdeaData, ConsideringIdeaData


# Initialize the LLM center
_llm_center = None


def get_llm_center():
    """Get or create the LLM center instance"""
    global _llm_center
    if _llm_center is None:
        _llm_center = LLMCenter()
    return _llm_center


async def call_groq(prompt: str, model: str = "moonshotai/kimi-k2-instruct") -> str:
    """
    Legacy wrapper for call_groq function
    """
    llm_center = get_llm_center()
    response = await llm_center.call_llm(
        prompt_type=PromptType.GENERAL_LLM,
        content=prompt,
        model=model
    )
    return response.content


async def generate_idea_pitches(
    ideas_prompt: str,
    user_context: Optional[Dict[str, Any]] = None
) -> List[Dict[str, Any]]:
    """
    Legacy wrapper for generate_idea_pitches function
    """
    llm_center = get_llm_center()
    context = ProcessingContext()
    if user_context:
        context.additional_context = user_context
    
    parsed_response = await llm_center.call_template_and_parse(
        prompt_type=PromptType.IDEA_GENERATION,
        context=context,
        template_vars={'content': ideas_prompt}
    )
    
    if parsed_response.success and 'ideas' in parsed_response.parsed_data:
        return parsed_response.parsed_data['ideas']
    else:
        return []


async def generate_deep_dive(
    deep_dive_prompt: str,
    user_context: Optional[Dict[str, Any]] = None
) -> DeepDiveIdeaData:
    """
    Legacy wrapper for generate_deep_dive function
    """
    llm_center = get_llm_center()
    context = ProcessingContext()
    if user_context:
        context.additional_context = user_context
    
    parsed_response = await llm_center.call_template_and_parse(
        prompt_type=PromptType.DEEP_DIVE,
        context=context,
        template_vars={'content': deep_dive_prompt}
    )
    
    if parsed_response.success:
        # Convert parsed data back to DeepDiveIdeaData
        return DeepDiveIdeaData(**parsed_response.parsed_data)
    else:
        return DeepDiveIdeaData(raw_llm_fields={'error': 'Failed to parse response'})


async def orchestrate_iterating(
    iterating_prompt: str,
    user_context: Optional[Dict[str, Any]] = None
) -> IteratingIdeaData:
    """
    Legacy wrapper for orchestrate_iterating function
    """
    llm_center = get_llm_center()
    context = ProcessingContext()
    if user_context:
        context.additional_context = user_context
    
    parsed_response = await llm_center.call_template_and_parse(
        prompt_type=PromptType.ITERATING,
        context=context,
        template_vars={'content': iterating_prompt}
    )
    
    if parsed_response.success:
        return IteratingIdeaData(**parsed_response.parsed_data)
    else:
        raise ValueError(f"Failed to parse iterating response: {parsed_response.validation_errors}")


async def orchestrate_considering(
    considering_prompt: str,
    user_context: Optional[Dict[str, Any]] = None
) -> ConsideringIdeaData:
    """
    Legacy wrapper for orchestrate_considering function
    """
    llm_center = get_llm_center()
    context = ProcessingContext()
    if user_context:
        context.additional_context = user_context
    
    parsed_response = await llm_center.call_template_and_parse(
        prompt_type=PromptType.CONSIDERING,
        context=context,
        template_vars={'content': considering_prompt}
    )
    
    if parsed_response.success:
        return ConsideringIdeaData(**parsed_response.parsed_data)
    else:
        raise ValueError(f"Failed to parse considering response: {parsed_response.validation_errors}")


async def clean_text_with_llm(text: str) -> str:
    """
    Legacy wrapper for text cleaning with LLM
    """
    prompt = f"Clean and normalize the following text, removing any formatting issues or inconsistencies:\n\n{text}"
    return await call_groq(prompt)


def render_prompt(template_str: str, **kwargs) -> str:
    """
    Legacy wrapper for prompt rendering
    """
    llm_center = get_llm_center()
    return llm_center.prompt_manager.create_inline_prompt(template_str, **kwargs)


async def analyze_version_impact(current_version: str, new_version: str) -> Dict[str, Any]:
    """
    Legacy wrapper for version impact analysis
    """
    prompt = f"""
    Analyze the impact of changing from version:
    {current_version}
    
    To version:
    {new_version}
    
    Provide a JSON response with impact_score (1-10) and summary.
    """
    response = await call_groq(prompt)
    try:
        import json
        return json.loads(response)
    except:
        return {"impact_score": 5, "summary": "Unable to analyze impact"}


# These functions would need to be implemented based on the original logic
# For now, they return basic implementations

def validate_idea_dict(idea: Dict[str, Any]) -> bool:
    """Basic idea validation"""
    required_fields = ['title', 'hook', 'value']
    return all(field in idea and idea[field] for field in required_fields)


def is_unique_differentiator(differentiator: str) -> bool:
    """Check if differentiator is unique enough"""
    return len(differentiator) > 20 and differentiator.lower() not in ['unique', 'different', 'better']


def is_specific_problem_statement(statement: str) -> bool:
    """Check if problem statement is specific"""
    return len(statement) > 30 and 'specific' not in statement.lower()


def is_real_actionable_cta(cta: str) -> bool:
    """Check if CTA is actionable"""
    action_words = ['start', 'begin', 'create', 'build', 'develop', 'launch']
    return any(word in cta.lower() for word in action_words)


def is_real_repo_url(url: str) -> bool:
    """Check if repo URL is real"""
    return url.startswith(('https://github.com', 'https://gitlab.com')) and len(url) > 20


def is_compelling_pitch(pitch: str) -> bool:
    """Check if pitch is compelling"""
    return len(pitch) > 50 and len(pitch.split()) > 10


def sanitize_idea_fields(idea: Dict[str, Any]) -> Dict[str, Any]:
    """
    Legacy wrapper for idea field sanitization
    """
    parser = ResponseParser()
    return parser._sanitize_idea_fields(idea)


# Additional LLM functions for advanced features
async def generate_case_study(*args, **kwargs):
    """Placeholder for case study generation"""
    prompt = "Generate a case study based on the provided parameters"
    return await call_groq(prompt)


async def generate_market_snapshot(*args, **kwargs):
    """Placeholder for market snapshot generation"""
    prompt = "Generate a market snapshot based on the provided parameters"
    return await call_groq(prompt)


async def generate_lens_insight(*args, **kwargs):
    """Placeholder for lens insight generation"""
    prompt = "Generate lens insights based on the provided parameters"
    return await call_groq(prompt)


async def generate_vc_thesis_comparison(*args, **kwargs):
    """Placeholder for VC thesis comparison generation"""
    prompt = "Generate VC thesis comparison based on the provided parameters"
    return await call_groq(prompt)


async def generate_investor_deck(*args, **kwargs):
    """Placeholder for investor deck generation"""
    prompt = "Generate investor deck content based on the provided parameters"
    return await call_groq(prompt)


async def generate_iteration_experiment(*args, **kwargs):
    """Generate iteration experiment using DSPy"""
    prompt = "Generate iteration experiment based on the provided parameters"
    return await call_groq(prompt)


def robust_extract_json(response: str) -> Optional[Dict]:
    """
    Legacy wrapper for robust JSON extraction
    """
    parser = ResponseParser()
    # This is a simplified version - the full implementation would use
    # the existing JSON repair utilities
    try:
        import json
        return json.loads(response)
    except:
        return None