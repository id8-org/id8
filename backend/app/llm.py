"""
DEPRECATED: This module is deprecated and will be removed in a future version.

All LLM functionality has been moved to app.llm_center for better organization.
Use the centralized LLM center instead:

from app.llm_center import LLMCenter
from app.llm_center.legacy_wrappers import call_groq, generate_idea_pitches, etc.

This module now provides backward compatibility by importing from the new centralized system.
"""

import warnings
import os
import httpx
import json
import re
import logging
from typing import Dict, Any, Optional, Union, List
import asyncio
import time
import traceback
from jinja2 import Template
from app.schemas import DeepDiveIdeaData, IteratingIdeaData, ConsideringIdeaData, DeepDiveCategoryData, IteratingExperiment
from app.json_repair_util import repair_json_with_py, extract_json_from_llm_response
from app.context_utils import context_idea, context_user
from app.utils.prompt_loader import load_prompt
from pydantic_ai.agent import Agent

# Backward compatibility imports - DEPRECATED
from app.llm_center.legacy_wrappers import *

# Issue deprecation warning
warnings.warn(
    "app.llm module is deprecated. Use app.llm_center instead.",
    DeprecationWarning,
    stacklevel=2
)

# --- Robust .env loading for local/dev ---
try:
    from dotenv import load_dotenv
    dotenv_loaded = load_dotenv()
    if dotenv_loaded:
        logging.info("[ENV] .env file loaded successfully.")
    else:
        logging.info("[ENV] No .env file found or loaded.")
except ImportError:
    logging.warning("[ENV] python-dotenv not installed; skipping .env loading.")

# Set up logging
logger = logging.getLogger(__name__)

# Utility functions remove_emojis and truncate_with_ellipsis are defined here for use throughout llm.py

def _load_groq_keys():
    # Collect all env vars that start with GROQ_API_KEY_
    keys = []
    for k, v in os.environ.items():
        if k.startswith("GROQ_API_KEY_") and v:
            keys.append((k, v))
    # Sort by number if possible
    keys.sort(key=lambda x: int(x[0].split('_')[-1]) if x[0].split('_')[-1].isdigit() else x[0])
    return [v for _, v in keys]

GROQ_API_KEYS = _load_groq_keys()
if not GROQ_API_KEYS:
    raise ValueError("At least one GROQ_API_KEY_N must be set in the environment (e.g., GROQ_API_KEY_1, GROQ_API_KEY_2, ...)")

_groq_key_counter = 0
_groq_key_lock = asyncio.Lock()

def _get_next_groq_key():
    global _groq_key_counter
    key = GROQ_API_KEYS[_groq_key_counter % len(GROQ_API_KEYS)]
    _groq_key_counter += 1
    return key

async def call_groq(prompt: str, model: str = "moonshotai/kimi-k2-instruct"):
    """Call Groq API with the given prompt, with retries, round robin keys, and longer timeout."""
    logger.info(f"Calling Groq API with model={model}")
    logger.debug(f"Prompt length: {len(prompt)} characters")
    logger.debug(f"First 200 chars of prompt: {prompt[:200]}...")
    logger.debug("Call stack - this is call_groq entry point")

    max_retries = 3
    for attempt in range(1, max_retries + 1):
        async with _groq_key_lock:
            groq_key = _get_next_groq_key()
            key_index = (_groq_key_counter-1)%len(GROQ_API_KEYS)
        logger.info(f"[DEBUG] Using GROQ_API_KEY_{key_index+1}: length={len(groq_key)}, last4={groq_key[-4:]}")
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                logger.info(f"Attempt {attempt} - Making request to Groq API with key index {key_index}...")
                response = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    json={
                        "model": model,
                        "messages": [{"role": "user", "content": prompt}],
                        "temperature": 0.7,
                        "max_tokens": 3000
                    },
                    headers={"Authorization": f"Bearer {groq_key}"}
                )
                logger.info(f"Response status: {response.status_code}")
                logger.debug(f"Response headers: {dict(response.headers)}")
                if response.status_code == 429:
                    retry_after = int(float(response.headers.get('retry-after', 10)))
                    logger.warning(f"Rate limited. Sleeping for {retry_after} seconds before retrying...")
                    await asyncio.sleep(retry_after)
                    continue
                response.raise_for_status()
                result = response.json()
                logger.debug(f"Full API response: {result}")
                content = result["choices"][0]["message"]["content"]
                logger.info(f"Groq API call succeeded. Extracted content length: {len(content)}")
                logger.debug(f"First 200 chars of content: {content[:200]}...")
                return content
        except (httpx.ReadTimeout, httpx.ConnectTimeout, httpx.RequestError) as e:
            logger.warning(f"Error in call_groq (attempt {attempt}): {e}")
            logger.debug(f"Error type: {type(e)}")
            if attempt < max_retries:
                logger.info("Retrying in 3 seconds...")
                await asyncio.sleep(3)
            else:
                logger.error(f"All {max_retries} attempts failed.")
                raise
        except Exception as e:
            logger.error(f"Non-retryable error in call_groq: {e}")
            logger.debug(f"Error type: {type(e)}")
            raise

def extract_json_array(text):
    # Find the first JSON array in the text
    match = re.search(r'\[\s*{.*?}\s*\]', text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except Exception as e:
            print(f'JSON parse error: {e}')
            return None
    # Fallback: try to parse the whole text
    try:
        return json.loads(text)
    except Exception as e:
        print(f'JSON parse error: {e}')
        return None

# Utility: Insert placeholders for missing fields, including idea_number
IDEA_REQUIRED_FIELDS = [
    'title', 'hook', 'value', 'evidence', 'differentiator', 'score', 'mvp_effort', 'type', 'assumptions', 'evidence_reference', 'repo_usage'
]

def remove_emojis(text: str) -> str:
    # Remove all emoji characters from the text
    emoji_pattern = re.compile(
        "["
        "\U0001F600-\U0001F64F"  # emoticons
        "\U0001F300-\U0001F5FF"  # symbols & pictographs
        "\U0001F680-\U0001F6FF"  # transport & map symbols
        "\U0001F1E0-\U0001F1FF"  # flags (iOS)
        "\U00002702-\U000027B0"
        "\U000024C2-\U0001F251"
        "]+",
        flags=re.UNICODE,
    )
    return emoji_pattern.sub(r"", text)

def truncate_with_ellipsis(text: str, max_length: int = 120) -> str:
    if not isinstance(text, str):
        return text
    text = text.strip()
    if len(text) > max_length:
        return text[:max_length - 1].rstrip() + "…"
    return text

def sanitize_idea_fields(idea: Dict[str, Any]) -> Dict[str, Any]:
    # Debug logging to track field mapping
    logger = logging.getLogger(__name__)
    # Remove source_of_inspiration if present
    idea.pop('source_of_inspiration', None)
    # Ensure evidence_reference is a dict and has stat+url
    evref = idea.get('evidence_reference', {})
    if not isinstance(evref, dict):
        evref = {}
    stat = evref.get('stat', '').strip() if isinstance(evref.get('stat', ''), str) else ''
    url = evref.get('url', '').strip() if isinstance(evref.get('url', ''), str) else ''
    # Check for valid stat and url (not empty, not placeholder)
    if not stat or not url or url in ('N/A', 'example.com', 'http://example.com', 'https://example.com', '#'):
        logger.warning(f"[LLM VALIDATION] evidence_reference missing or invalid: {evref}")
        idea['evidence_reference'] = {}
    else:
        idea['evidence_reference'] = {'stat': stat, 'url': url}
    
    # Map new LLM fields to DB fields
    if "idea_name" in idea:
        idea["title"] = idea["idea_name"]
    if "overall_score" in idea:
        try:
            idea["score"] = int(round(float(idea["overall_score"])))
        except Exception:
            idea["score"] = 5
    if "effort_score" in idea:
        try:
            idea["mvp_effort"] = int(round(float(idea["effort_score"])))
        except Exception:
            idea["mvp_effort"] = 5
    
    # Ensure hook field is present (required by validation)
    if "hook" not in idea or not idea["hook"]:
        # Try to create a hook from other fields
        if idea.get("elevator_pitch"):
            idea["hook"] = idea["elevator_pitch"][:100] + "..." if len(idea["elevator_pitch"]) > 100 else idea["elevator_pitch"]
        elif idea.get("problem_statement"):
            idea["hook"] = idea["problem_statement"][:100] + "..." if len(idea["problem_statement"]) > 100 else idea["problem_statement"]
        else:
            idea["hook"] = "A compelling business opportunity"
    
    # Ensure all required fields for validation are present
    required_fields = {
        "value": idea.get("elevator_pitch", "Value proposition to be defined"),
        "evidence": idea.get("evidence_reference", {}).get("title", "Market research and validation needed"),
        "differentiator": "Unique competitive advantage to be defined",
        "type": "side_hustle",  # Default type
        "assumptions": idea.get("core_assumptions", []),
        "repo_usage": "AI-generated idea"
    }
    
    # Set missing required fields
    for field, default_value in required_fields.items():
        if field not in idea or not idea[field]:
            idea[field] = default_value
    
    # Add new fields if present
    for field in [
        "scope_commitment", "source_of_inspiration", "problem_statement",
        "elevator_pitch", "core_assumptions", "riskiest_assumptions", "generation_notes"
    ]:
        if field in idea:
            idea[field] = idea[field]
            logger.info(f"🔍 [DEBUG] Found {field}: {idea[field]}")
        else:
            idea[field] = None
            logger.info(f"🔍 [DEBUG] Missing {field}, setting to None")
    
    # Fallback for legacy fields
    if "title" in idea and "idea_name" not in idea:
        idea["idea_name"] = idea["title"]
    if "score" in idea and "overall_score" not in idea:
        try:
            score_val = idea["score"]
            if score_val is not None:
                idea["overall_score"] = float(score_val)
            else:
                idea["overall_score"] = 5.0
        except Exception:
            idea["overall_score"] = 5.0
    if "mvp_effort" in idea and "effort_score" not in idea:
        try:
            effort_val = idea["mvp_effort"]
            if effort_val is not None:
                idea["effort_score"] = float(effort_val)
            else:
                idea["effort_score"] = 5.0
        except Exception:
            idea["effort_score"] = 5.0
    
    # Ensure evidence_reference is always a dict
    if "evidence_reference" in idea:
        if idea["evidence_reference"] == "" or idea["evidence_reference"] is None:
            idea["evidence_reference"] = {}
        elif isinstance(idea["evidence_reference"], str):
            # If it's a URL string, wrap it in a dict
            idea["evidence_reference"] = {"url": idea["evidence_reference"], "stat": ""}
    
    # Debug logging of final sanitized idea
    logger.info(f"🔍 [DEBUG] sanitize_idea_fields result keys: {list(idea.keys())}")
    logger.info(f"🔍 [DEBUG] Key fields after sanitization:")
    logger.info(f"  - title: {idea.get('title')}")
    logger.info(f"  - hook: {idea.get('hook')}")
    logger.info(f"  - score: {idea.get('score')}")
    logger.info(f"  - mvp_effort: {idea.get('mvp_effort')}")
    logger.info(f"  - scope_commitment: {idea.get('scope_commitment')}")
    logger.info(f"  - source_of_inspiration: {idea.get('source_of_inspiration')}")
    logger.info(f"  - problem_statement: {idea.get('problem_statement')}")
    logger.info(f"  - elevator_pitch: {idea.get('elevator_pitch')}")
    logger.info(f"  - core_assumptions: {idea.get('core_assumptions')}")
    logger.info(f"  - riskiest_assumptions: {idea.get('riskiest_assumptions')}")
    logger.info(f"  - generation_notes: {idea.get('generation_notes')}")
    
    # When calling split, check type first
    if "hook" in idea and isinstance(idea["hook"], str):
        idea["hook"] = idea["hook"].split("\n")[0] if "\n" in idea["hook"] else idea["hook"]
    if "value" in idea and isinstance(idea["value"], str):
        idea["value"] = idea["value"].split("\n")[0] if "\n" in idea["value"] else idea["value"]
    
    return idea

def parse_idea_response(response: Optional[str]) -> List[Dict[str, Any]]:
    """Parse the LLM response to extract structured idea data. Handles JSON, Markdown, and numbered lists."""
    if not response:
        return []
    # Try to extract a JSON array first
    ideas = extract_json_array(response)
    parsed: List[Dict[str, Any]] = []
    if isinstance(ideas, list) and ideas:
        for idea in ideas:
            if not isinstance(idea, dict):
                logger.warning(f"Skipping non-dict idea: {idea}")
                continue
            idea = sanitize_idea_fields(idea)
            idea = filter_idea_fields(idea)  # Remove unexpected fields
            parsed.append(idea)
        return parsed
    # Fallback: split by '**Idea' or numbered headings
    sections = re.split(r'\*\*Idea \d+|^Idea \d+|^\d+\. ', response, flags=re.MULTILINE)
    for section in sections:
        idea = parse_single_idea(section)
        if idea:
            idea = filter_idea_fields(idea)  # Remove unexpected fields
            parsed.append(idea)
    return parsed

def parse_single_idea(section: Optional[str]) -> Optional[Dict[str, Any]]:
    """Parse a single idea section"""
    if not section:
        return None
    section = section.strip()
    if not section:
        return None
    idea: Dict[str, Any] = {
        "title": "",
        "hook": "",
        "value": "",
        "evidence": "",
        "differentiator": "",
        "score": 5,
        "mvp_effort": 5,
        "type": None,
        "assumptions": [],
        "evidence_reference": {},
        "repo_usage": ""
    }
    
    # Try to extract JSON if present
    try:
        parsed_json = json.loads(section)
        if isinstance(parsed_json, dict):
            # Validate that we have at least a title or hook
            if parsed_json.get("title") or parsed_json.get("hook"):
                idea.update(parsed_json)
                idea = sanitize_idea_fields(idea)
                return idea
    except Exception:
        pass
    
    # Extract title from various formats
    lines = section.split('\n')
    if lines:
        # Look for title in first few lines
        for i, line in enumerate(lines[:3]):
            line = line.strip()
            if not line:
                continue
            
            # Skip common headers
            if line.lower().startswith(('hook:', 'value:', 'evidence:', 'differentiator:', 'score:', 'mvp')):
                continue
            
            # If this line looks like a title (not too long, doesn't start with common words)
            if len(line) > 3 and len(line) < 100 and not line.startswith(('•', '-', '*', '1.', '2.', '3.')):
                idea["title"] = line
                break
    
    # If no title found, try to extract from hook or first meaningful line
    if not idea["title"]:
        for line in lines:
            line = line.strip()
            if line and not line.startswith(('Hook:', 'Value:', 'Evidence:', 'Differentiator:', 'Score:', 'MVP')):
                if len(line) > 10 and len(line) < 150:  # Reasonable title length
                    idea["title"] = line
                    break
    
    # Extract structured fields
    current_field = None
    current_content = []
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        # Check for field headers with more flexible matching
        line_lower = line.lower()
        
        if line_lower.startswith('hook') or 'hook:' in line_lower:
            if current_field and current_content:
                idea[current_field] = '\n'.join(current_content).strip()
            current_field = 'hook'
            current_content = []
        elif line_lower.startswith('value') or 'value:' in line_lower:
            if current_field and current_content:
                idea[current_field] = '\n'.join(current_content).strip()
            current_field = 'value'
            current_content = []
        elif line_lower.startswith('evidence') or 'evidence:' in line_lower:
            if current_field and current_content:
                idea[current_field] = '\n'.join(current_content).strip()
            current_field = 'evidence'
            current_content = []
        elif line_lower.startswith('differentiator') or 'differentiator:' in line_lower:
            if current_field and current_content:
                idea[current_field] = '\n'.join(current_content).strip()
            current_field = 'differentiator'
            current_content = []
        elif 'score' in line_lower and ('/10' in line or 'out of 10' in line_lower):
            if current_field and current_content:
                idea[current_field] = '\n'.join(current_content).strip()
            # Extract score
            score_match = re.search(r'(\d+)/10', line)
            if score_match:
                idea["score"] = int(score_match.group(1))
            current_field = None
            current_content = []
        elif ('mvp' in line_lower or 'complexity' in line_lower) and ('/10' in line or 'out of 10' in line_lower):
            if current_field and current_content:
                idea[current_field] = '\n'.join(current_content).strip()
            # Extract MVP effort
            effort_match = re.search(r'(\d+)/10', line)
            if effort_match:
                idea["mvp_effort"] = int(effort_match.group(1))
            current_field = None
            current_content = []
        else:
            # Content for current field
            if current_field:
                current_content.append(line)
    
    # Save last field content
    if current_field and current_content:
        idea[current_field] = '\n'.join(current_content).strip()
    
    # If we still don't have a title, try to use the first meaningful content
    if not idea["title"]:
        if idea["hook"]:
            # Use first sentence of hook as title
            hook_sentences = idea["hook"].split('.')
            if hook_sentences[0]:
                idea["title"] = hook_sentences[0].strip()
        elif idea["value"]:
            # Use first sentence of value as title
            value_sentences = idea["value"].split('.')
            if value_sentences[0]:
                idea["title"] = value_sentences[0].strip()
    
    # Validate that we have at least a title
    if not idea["title"]:
        logger.warning(f"Could not extract title from idea section: {section[:200]}...")
        return None
    
    # Use the sanitizer for all fields
    idea = sanitize_idea_fields(idea)
    
    return idea

def robust_extract_json(response: str) -> Optional[Dict]:
    """
    Extracts and validates JSON from a string, attempting repairs if necessary.
    """
    logging.info("[ROBUST JSON] Starting robust JSON extraction...")
    logging.info(f"[ROBUST JSON] Raw response: {response}")  # Log raw response

    extracted_json = extract_json_from_llm_response(response)
    logging.info(f"[ROBUST JSON] Extracted JSON: {extracted_json}")  # Log extracted JSON

    repaired_json = repair_json_with_py(extracted_json)
    logging.info(f"[ROBUST JSON] Repaired JSON: {repaired_json}")  # Log repaired JSON

    data = layered_json_fix_and_validate(repaired_json)
    logging.info(f"[ROBUST JSON] Data after layered fix: {data}")  # Log final data

    return data

def sanitize_deep_dive_fields(deep_dive: Dict[str, Any]) -> Dict[str, Any]:
    # Ensure all required fields are present and valid
    fields = [
        "product_market_fit_score", "product_market_fit_narrative",
        "market_size_score", "market_size_narrative",
        "market_timing_score", "market_timing_narrative",
        "founders_execution_score", "founders_execution_narrative",
        "technical_feasibility_score", "technical_feasibility_narrative",
        "competitive_moat_score", "competitive_moat_narrative",
        "profitability_potential_score", "profitability_potential_narrative",
        "strategic_exit_score", "strategic_exit_narrative",
        "regulatory_risk_score", "regulatory_risk_narrative",
        "customer_validation_plan",
        "go_to_market_score", "go_to_market_narrative",
        "overall_investor_attractiveness_score", "overall_investor_attractiveness_narrative",
        "generation_notes"
    ]
    for field in fields:
        if field not in deep_dive:
            deep_dive[field] = "N/A" if 'narrative' in field or 'plan' in field or field == 'generation_notes' else None
        elif 'score' in field and deep_dive[field] is not None:
            try:
                deep_dive[field] = float(round(float(deep_dive[field]) * 4) / 4)
            except Exception:
                deep_dive[field] = None
    return deep_dive

def convert_old_deep_dive_format(old_data: Dict[str, Any]) -> DeepDiveIdeaData:
    """Convert old deep dive format to new structured format"""
    try:
        # Extract scores from the old format
        signal_scores = old_data.get('Signal Score', {})
        # Normalize keys for robustness
        def get_score(key):
            for k in signal_scores.keys():
                if k.lower().replace('-', ' ').replace('_', ' ').strip() == key.lower().replace('-', ' ').replace('_', ' ').strip():
                    return float(signal_scores.get(k, 0))
            return 0.0
        # Map new scores
        market_opportunity_scores: Dict[str, Optional[float]] = {
            'product_market_fit': get_score('Product-Market Fit Potential'),
            'market_size': get_score('Market Size'),
            'market_timing': get_score('Market Timing')
        }
        execution_capability_scores: Dict[str, Optional[float]] = {
            'founders_ability': get_score("Founder's Ability to Execute"),
            'technical_feasibility': get_score('Technical Feasibility'),
            'go_to_market': get_score('Go to Market')
        }
        business_viability_scores: Dict[str, Optional[float]] = {
            'profitability_potential': get_score('Profitability Potential'),
            'competitive_moat': get_score('Competitive Moat')
        }
        strategic_alignment_risks_scores: Dict[str, Optional[float]] = {
            'strategic_exit': get_score('Strategic Exit Potential'),
            'regulatory_risk': get_score('Regulatory Risk')
        }
        # Create narratives from the old format
        market_opportunity_narratives: Dict[str, Optional[str]] = {
            'product_market_fit': old_data.get('Product', ''),
            'market_size': old_data.get('Market', ''),
            'market_timing': old_data.get('Timing', '')
        }
        founders_score = get_score("Founder's Ability to Execute")
        execution_capability_narratives: Dict[str, Optional[str]] = {
            'founders_ability': f"Execution capability based on {founders_score}/10 score",
            'technical_feasibility': f"Technical feasibility based on {get_score('Technical Feasibility')}/10 score",
            'go_to_market': "Go to market strategy analysis"
        }
        business_viability_narratives: Dict[str, Optional[str]] = {
            'profitability_potential': f"Profitability potential based on {get_score('Profitability Potential')}/10 score",
            'competitive_moat': old_data.get('Moat', '')
        }
        strategic_alignment_risks_narratives: Dict[str, Optional[str]] = {
            'strategic_exit': f"Strategic exit potential based on {get_score('Strategic Exit Potential')}/10 score",
            'regulatory_risk': "Regulatory risk assessment"
        }
        # Calculate overall score
        overall_score = get_score('Overall Investor Attractiveness')
        return DeepDiveIdeaData(
            market_opportunity=DeepDiveCategoryData(
                scores=market_opportunity_scores,
                narratives=market_opportunity_narratives,
                customer_validation_plan="Customer validation plan based on market analysis"
            ),
            execution_capability=DeepDiveCategoryData(
                scores=execution_capability_scores,
                narratives=execution_capability_narratives,
                customer_validation_plan="Execution capability validation plan"
            ),
            business_viability=DeepDiveCategoryData(
                scores=business_viability_scores,
                narratives=business_viability_narratives,
                customer_validation_plan="Business viability validation plan"
            ),
            strategic_alignment_risks=DeepDiveCategoryData(
                scores=strategic_alignment_risks_scores,
                narratives=strategic_alignment_risks_narratives,
                customer_validation_plan="Strategic alignment validation plan"
            ),
            overall_score=overall_score,
            summary=old_data.get('Summary', ''),
            raw_llm_fields=old_data
        )
    except Exception as e:
        logging.error(f"Error converting old deep dive format: {e}")
        return DeepDiveIdeaData(raw_llm_fields=old_data)

def robust_parse_deep_dive_raw_response(raw_response: str) -> DeepDiveIdeaData:
    import re, json
    from app.schemas import DeepDiveIdeaData
    if not raw_response:
        return DeepDiveIdeaData()
    # Remove triple backticks and whitespace
    cleaned = re.sub(r'^```json|```$', '', raw_response.strip(), flags=re.MULTILINE).strip()
    # Find the first JSON object in the string
    match = re.search(r'(\{[\s\S]*?\})', cleaned)
    if match:
        json_str = match.group(1)
        try:
            data = json.loads(json_str)
            deep_dive = convert_old_deep_dive_format(data)
            deep_dive.raw_llm_fields = data
            return deep_dive
        except Exception as e:
            import logging
            logging.error(f"Error parsing deep dive JSON: {e}")
            return DeepDiveIdeaData(raw_llm_fields={"error": str(e), "raw": raw_response})
    return DeepDiveIdeaData(raw_llm_fields={"error": "No JSON found", "raw": raw_response})

def parse_deep_dive_response(response: str) -> DeepDiveIdeaData:
    try:
        return robust_parse_deep_dive_raw_response(response)
    except Exception as e:
        import logging
        logging.error(f"Failed to parse deep dive response: {e}")
        logging.error(f"Raw response: {response}")
        return DeepDiveIdeaData(
            raw_llm_fields={"error": str(e), "raw": response}
        )

def parse_iterating_response(response: str) -> IteratingIdeaData:
    try:
        data = json.loads(response)
        if 'iteratingTable' not in data or not isinstance(data['iteratingTable'], list):
            raise ValueError('Missing or invalid iteratingTable')
        return IteratingIdeaData(**data)
    except Exception as e:
        logging.error(f"Failed to parse iterating response: {e}")
        raise

def parse_considering_response(response: str) -> ConsideringIdeaData:
    try:
        data = json.loads(response)
        if 'consideringTable' not in data or not isinstance(data['consideringTable'], list):
            raise ValueError('Missing or invalid consideringTable')
        return ConsideringIdeaData(**data)
    except Exception as e:
        logging.error(f"Failed to parse considering response: {e}")
        raise

def parse_by_headers(text: str) -> List[Dict[str, Any]]:
    """Parse text by looking for markdown headers or section titles."""
    sections = []
    
    # Common section headers to look for
    header_patterns = [
        r'^#+\s*(.+)$',  # Markdown headers
        r'^([A-Z][A-Za-z\s]+):\s*$',  # Title: format
        r'^([A-Z][A-Za-z\s]+)\s*[-–—]\s*$',  # Title - format
        r'^(\d+\.\s*[A-Z][A-Za-z\s]+)',  # 1. Title format
    ]
    
    lines = text.split('\n')
    current_section = None
    current_content = []
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        # Check if this line is a header
        is_header = False
        header_title = None
        
        for pattern in header_patterns:
            match = re.match(pattern, line, re.IGNORECASE)
            if match:
                is_header = True
                header_title = match.group(1).strip()
                break
        
        if is_header:
            # Save previous section
            if current_section and current_content:
                sections.append({
                    "title": current_section,
                    "content": "\n".join(current_content).strip()
                })
            
            # Start new section
            current_section = header_title
            current_content = []
        else:
            # Add to current section content
            if current_section:
                current_content.append(line)
    
    # Save last section
    if current_section and current_content:
        sections.append({
            "title": current_section,
            "content": "\n".join(current_content).strip()
        })
    
    return sections

def parse_by_numbering(text: str) -> List[Dict[str, Any]]:
    """Parse text by looking for numbered sections or bullet points."""
    sections = []
    
    # Split by numbered sections (1., 2., etc.)
    numbered
