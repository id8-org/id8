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
    numbered_sections = re.split(r'\n\s*\d+\.\s*', text)
    
    if len(numbered_sections) > 1:
        # Skip the first empty section
        for i, section in enumerate(numbered_sections[1:], 1):
            if section.strip():
                # Try to extract title from first line
                lines = section.strip().split('\n')
                title = lines[0].strip()
                content = '\n'.join(lines[1:]).strip() if len(lines) > 1 else ""
                
                # If no content, use title as content
                if not content:
                    content = title
                    title = f"Section {i}"
                
                sections.append({
                    "title": title,
                    "content": content
                })
    
    # If no numbered sections, try bullet points
    if not sections:
        bullet_sections = re.split(r'\n\s*[-*•]\s*', text)
        if len(bullet_sections) > 1:
            for i, section in enumerate(bullet_sections[1:], 1):
                if section.strip():
                    sections.append({
                        "title": f"Section {i}",
                        "content": section.strip()
                    })
    
    return sections

def parse_numbered_sections(response: str) -> Dict[str, Any]:
    """Parse response with numbered sections (1., 2., etc.)"""
    deep_dive = {
        "product_clarity": "",
        "timing": "",
        "market_opportunity": "",
        "strategic_moat": "",
        "business_funding": "",
        "investor_scoring": "",
        "summary": ""
    }
    
    # Split by numbered sections
    sections = re.split(r'\n\s*\d+\.\s*', response)
    if len(sections) >= 6:  # Expect at least 6 sections
        deep_dive["product_clarity"] = sections[1] if len(sections) > 1 else ""
        deep_dive["timing"] = sections[2] if len(sections) > 2 else ""
        deep_dive["market_opportunity"] = sections[3] if len(sections) > 3 else ""
        deep_dive["strategic_moat"] = sections[4] if len(sections) > 4 else ""
        deep_dive["business_funding"] = sections[5] if len(sections) > 5 else ""
        deep_dive["investor_scoring"] = sections[6] if len(sections) > 6 else ""
        deep_dive["summary"] = sections[7] if len(sections) > 7 else ""
    
    return deep_dive

def parse_paragraph_sections(response: str) -> Dict[str, Any]:
    """Parse response by splitting into paragraphs and assigning to sections"""
    deep_dive = {
        "product_clarity": "",
        "timing": "",
        "market_opportunity": "",
        "strategic_moat": "",
        "business_funding": "",
        "investor_scoring": "",
        "summary": ""
    }
    
    # Split into paragraphs (double line breaks)
    paragraphs = re.split(r'\n\s*\n', response)
    
    # Assign paragraphs to sections based on content keywords
    for paragraph in paragraphs:
        paragraph = paragraph.strip()
        if not paragraph:
            continue
            
        paragraph_lower = paragraph.lower()
        
        # Assign based on content keywords
        if any(word in paragraph_lower for word in ['product', 'mvp', 'solution', 'feature']):
            if not deep_dive["product_clarity"]:
                deep_dive["product_clarity"] = paragraph
        elif any(word in paragraph_lower for word in ['timing', 'now', 'market', 'trend']):
            if not deep_dive["timing"]:
                deep_dive["timing"] = paragraph
        elif any(word in paragraph_lower for word in ['market', 'size', 'opportunity', 'potential']):
            if not deep_dive["market_opportunity"]:
                deep_dive["market_opportunity"] = paragraph
        elif any(word in paragraph_lower for word in ['competitive', 'advantage', 'moat', 'differentiator']):
            if not deep_dive["strategic_moat"]:
                deep_dive["strategic_moat"] = paragraph
        elif any(word in paragraph_lower for word in ['business', 'model', 'revenue', 'funding', 'financial']):
            if not deep_dive["business_funding"]:
                deep_dive["business_funding"] = paragraph
        elif any(word in paragraph_lower for word in ['score', 'rating', 'investor', 'attractive']):
            if not deep_dive["investor_scoring"]:
                deep_dive["investor_scoring"] = paragraph
        elif any(word in paragraph_lower for word in ['summary', 'conclusion', 'overall', 'recommend']):
            if not deep_dive["summary"]:
                deep_dive["summary"] = paragraph
        else:
            # Assign to first empty section
            for key in deep_dive:
                if not deep_dive[key]:
                    deep_dive[key] = paragraph
                    break
    
    return deep_dive

def parse_investor_scoring(scoring_text: str) -> Dict[str, Any]:
    """Parse the investor scoring table and extract individual scores"""
    if not scoring_text:
        return {}
    
    # Define the expected scoring categories
    scoring_categories = [
        "Product-Market Fit Potential",
        "Market Size & Timing", 
        "Founder's Ability to Execute",
        "Technical Feasibility",
        "Competitive Moat",
        "Profitability Potential",
        "Strategic Exit Potential",
        "Overall Investor Attractiveness"
    ]
    
    parsed_scores = {}
    lines = scoring_text.split('\n')
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        # Look for lines that contain a category name and a score
        for category in scoring_categories:
            if category in line:
                # Try to extract score using various patterns
                score_match = re.search(r'(\d+)/10', line)
                if score_match:
                    score = int(score_match.group(1))
                    parsed_scores[category] = score
                    break
                # Also try to find just a number
                score_match = re.search(r'\b(\d+)\b', line)
                if score_match:
                    score = int(score_match.group(1))
                    if 1 <= score <= 10:  # Validate it's a reasonable score
                        parsed_scores[category] = score
                        break
    
    # Add the raw text as well for reference
    parsed_scores['raw_text'] = scoring_text
    
    return parsed_scores

def is_english(text: Optional[str]) -> bool:
    # Simple heuristic: if most characters are ASCII, assume English
    if not text:
        return False
    ascii_chars = sum(1 for c in text if ord(c) < 128)
    return ascii_chars / max(1, len(text)) > 0.85

class SafeDict(Dict[str, Any]):
    def __missing__(self, key):
        logger.warning(f"[LLM] Missing key '{key}' in prompt context. Filling with empty string.")
        return ""

def render_prompt(template: str, context: Dict[str, Any]) -> str:
    logger.info(f"[LLM] Rendering prompt. Template (first 200 chars): {template[:200]}")
    logger.info(f"[LLM] Prompt context keys: {list(context.keys())}")
    try:
        jinja_template = Template(template)
        prompt = jinja_template.render(**context)
        return prompt
    except Exception as e:
        logger.error(f"[LLM] Exception during prompt rendering: {e}")
        logger.error(f"[LLM] Template: {template}")
        logger.error(f"[LLM] Context: {context}")
        raise

async def generate_idea_pitches(context: Dict[str, Any], use_perplexity: bool = True) -> Dict[str, Any]:
    '''
    Generate idea pitches using the unified 'idea_generation' prompt and a context dict.
    Context should include at least:
      - repo_description
      - user_context (optional)
    '''
    prompt_template = load_prompt('idea_generation')
    prompt = render_prompt(prompt_template, context)
    logger.info(f"[LLM] User is generating ideas. Prompt (first 500 chars): {prompt[:500]}")
    start_time = time.time()
    try:
        logger.info(json.dumps({"llm_request": {"model": "moonshotai/kimi-k2-instruct", "prompt": prompt, "context": context}}, indent=2))
        response = await call_groq(prompt)
        elapsed = time.time() - start_time
        logger.info(f"[LLM] LLM call completed. Time: {elapsed:.2f}s, Response length: {len(response) if response else 0}, Type: {type(response)}")
        logger.info(f"[LLM] LLM raw response (first 1000 chars): {response[:1000] if response else 'EMPTY'}")
        if response is None:
            logger.error(f"[LLM] Idea generation failed: No response from LLM.")
            return {"raw": None, "ideas": [{"error": "Idea generation failed: No response from LLM."}]}
        if not is_english(response):
            prompt_en = prompt + "\n\nPlease respond in English only."
            logger.info(f"[LLM] Response not in English, retrying with explicit English instruction.")
            response = await call_groq(prompt_en)
            logger.info(f"[LLM] LLM retry completed. Response length: {len(response) if response else 0}")
        if not isinstance(response, str):
            response = str(response) if response is not None else ""
        logger.info(f"[LLM] Parsing LLM response. Raw length: {len(response) if response else 0}")
        ideas = []
        # --- Robust JSON parsing and fallback logic ---
        try:
            parsed = robust_extract_json(response)
            logger.info(f"[LLM] Parsed JSON from LLM response. Type: {type(parsed)} Value: {parsed}")
            if isinstance(parsed, list):
                for item in parsed:
                    if isinstance(item, dict):
                        item = sanitize_idea_fields(item)
                        if not validate_idea_dict(item):
                            logger.warning(f"[LLM] Skipping idea due to failed schema validation: {item}")
                            continue
                        ideas.append(item)
            elif isinstance(parsed, dict):
                item = sanitize_idea_fields(parsed)
                if not validate_idea_dict(item):
                    logger.warning(f"[LLM] Skipping idea due to failed schema validation: {item}")
                else:
                    ideas.append(item)
            logger.info(f"[LLM] Final parsed ideas: {ideas}")
        except Exception as e:
            logger.error(f"[LLM] Exception parsing JSON from LLM response: {e}\n{traceback.format_exc()}")
            preamble_phrases = [
                "I'm ready to generate", "Please provide", "Once I have", "go ahead and provide", "What is your onboarding profile", "Please share", "I'll generate", "Let's get started"
            ]
            if any(phrase in response for phrase in preamble_phrases):
                logger.error(f"[LLM] LLM returned a preamble or request for more info instead of ideas. Raw: {response[:1000]}")
                return {
                    "raw": response,
                    "ideas": [{
                        "title": "[ERROR] LLM did not generate ideas",
                        "hook": "",
                        "value": "",
                        "evidence": "",
                        "differentiator": "",
                        "score": None,
                        "mvp_effort": None,
                        "assumptions": [],
                        "evidence_reference": "",
                        "repo_usage": "",
                        "error": "LLM did not generate ideas. It may need more context or a different prompt. See raw output.",
                    }]
                }
            array = extract_json_array(response)
            if isinstance(array, list) and array:
                for item in array:
                    if isinstance(item, dict):
                        item = sanitize_idea_fields(item)
                        if not validate_idea_dict(item):
                            logger.warning(f"[LLM] Skipping idea due to failed schema validation: {item}")
                            continue
                        ideas.append(item)
            logger.info(f"[LLM] Fallback parsed ideas: {ideas}")
        if not ideas:
            logger.error(f"[LLM] No valid ideas parsed. Raw LLM response: {response}")
        return {"raw": response, "ideas": ideas}
    except Exception as e:
        logger.error(f"[LLM] Exception during LLM call or parsing: {e}\n{traceback.format_exc()}")
        return {
            "raw": None,
            "ideas": [{
                "title": "[ERROR] Exception during idea generation",
                "hook": "",
                "value": "",
                "evidence": "",
                "differentiator": "",
                "score": None,
                "mvp_effort": None,
                "assumptions": [],
                "evidence_reference": "",
                "repo_usage": "",
                "error": f"Idea generation failed: {str(e)}"
            }]
        }

async def generate_deep_dive(context: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generate a deep dive analysis for an idea using the canonical prompt and a context dict.
    Context should include at least:
      - title
      - hook
      - value
      - evidence
      - differentiator
      - user_context (optional)
    """
    logger = logging.getLogger(__name__)
    prompt_template = load_prompt('deep_dive')
    prompt = render_prompt(prompt_template, context)
    logger.info(f"🔍 [DeepDive] Prompt length: {len(prompt)} characters")
    logger.info(f"🔍 [DeepDive] Prompt preview: {prompt[:200]}...")
    response = None
    try:
        logger.info("🔍 [DeepDive] About to call LLM with model moonshotai/kimi-k2-instruct")
        logger.info(json.dumps({"llm_request": {"model": "moonshotai/kimi-k2-instruct", "prompt": prompt, "context": context}}, indent=2))
        response = await call_groq(prompt, model="moonshotai/kimi-k2-instruct")
        logger.info(f"🔍 [DeepDive] LLM call completed. Response type: {type(response)}")
        logger.info(f"🔍 [DeepDive] Raw LLM response length: {len(response) if response else 0}")
        if response:
            logger.info(f"🔍 [DeepDive] Raw LLM response (first 1000 chars): {response[:1000]}")
            logger.info(f"🔍 [DeepDive] Raw LLM response (last 500 chars): {response[-500:] if len(response) > 500 else response}")
        else:
            logger.error("🔍 [DeepDive] LLM returned empty response!")
            return {"deep_dive": {"sections": [{"title": "Error", "content": "No response from LLM"}]}, "raw": ""}
        
        parsed_result = parse_deep_dive_response(response)
        logger.info(f"🔍 [DeepDive] Parsed result type: {type(parsed_result)}")
        # Convert DeepDiveIdeaData to dict for storage
        if hasattr(parsed_result, 'dict'):
            parsed_dict = parsed_result.dict()
        elif isinstance(parsed_result, dict):
            parsed_dict = parsed_result
        else:
            # Fallback: create a basic dict structure
            parsed_dict = {"sections": []}
        logger.info(f"🔍 [DeepDive] Parsed result structure: {list(parsed_dict.keys()) if isinstance(parsed_dict, dict) else 'Not a dict'}")
        return {
            "deep_dive": parsed_dict,
            "raw": response
        }
    except Exception as e:
        logger.error(f"🔍 [DeepDive] Error generating deep dive: {e}")
        logger.error(f"🔍 [DeepDive] Exception type: {type(e)}")
        logger.error(f"🔍 [DeepDive] LLM response that caused error: {response}")
        error_content = {"sections": [{"title": "Error Generating Analysis", "content": f"An unexpected error occurred: {str(e)}"}]}
        return {"deep_dive": error_content, "raw": ""}

async def generate_case_study(context: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generate a case study analysis for an idea using the canonical prompt and a context dict.
    Context should include at least:
      - title
      - hook
      - value
      - evidence
      - differentiator
      - company_name (optional)
    """
    logger = logging.getLogger(__name__)
    company_name = context.get('company_name')
    if company_name:
        prompt = render_prompt(load_prompt('case_study'), context)
    else:
        prompt = render_prompt(load_prompt('case_study_generic'), context)
    try:
        logger.info(f"Generating case study for idea: {context.get('title', 'N/A')}")
        logger.info(json.dumps({"llm_request": {"model": "moonshotai/kimi-k2-instruct", "prompt": prompt, "context": context}}, indent=2))
        response = await call_groq(prompt, model="moonshotai/kimi-k2-instruct")
        logger.info(f"Case study raw response length: {len(response) if response else 0}")
        if response:
            logger.debug(f"Case study raw response preview: {response[:500]}...")
        parsed_result = parse_case_study_response(response)
        logger.info(f"Case study parsing result keys: {list(parsed_result.keys())}")
        return parsed_result
    except Exception as e:
        logger.error(f"Error generating case study: {e}")
        return {"error": f"Failed to generate case study: {str(e)}"}

async def generate_market_snapshot(context: Dict[str, Any]) -> Dict[str, Any]:
    logger = logging.getLogger(__name__)
    prompt = render_prompt(load_prompt('market_snapshot'), context)
    try:
        logger.info(f"Generating market snapshot for idea: {context.get('title', 'N/A')}")
        logger.info(json.dumps({"llm_request": {"model": "moonshotai/kimi-k2-instruct", "prompt": prompt, "context": context}}, indent=2))
        response = await call_groq(prompt, model="moonshotai/kimi-k2-instruct")
        logger.info(f"Market snapshot raw response length: {len(response) if response else 0}")
        if response:
            logger.debug(f"Market snapshot raw response preview: {response[:500]}...")
        parsed_result = parse_market_snapshot_response(response)
        logger.info(f"Market snapshot parsing result keys: {list(parsed_result.keys())}")
        return parsed_result
    except Exception as e:
        logger.error(f"Error generating market snapshot: {e}")
        return {"error": f"Failed to generate market snapshot: {str(e)}"}

async def generate_lens_insight(context: Dict[str, Any]) -> Dict[str, Any]:
    logger = logging.getLogger(__name__)
    lens_type = context.get('lens_type', 'founder')
    if lens_type == 'founder':
        prompt = render_prompt(load_prompt('lens_insight_founder'), context)
    elif lens_type == 'investor':
        prompt = render_prompt(load_prompt('lens_insight_investor'), context)
    elif lens_type == 'customer':
        prompt = render_prompt(load_prompt('lens_insight_customer'), context)
    else:
        logger.warning(f"Unknown lens_type '{lens_type}', defaulting to founder.")
        prompt = render_prompt(load_prompt('lens_insight_founder'), context)
    try:
        logger.info(f"Generating {lens_type} lens insight for idea: {context.get('title', 'N/A')}")
        logger.info(json.dumps({"llm_request": {"model": "moonshotai/kimi-k2-instruct", "prompt": prompt, "context": context}}, indent=2))
        response = await call_groq(prompt, model="moonshotai/kimi-k2-instruct")
        logger.info(f"{lens_type} lens raw response length: {len(response) if response else 0}")
        if response:
            logger.debug(f"{lens_type} lens raw response preview: {response[:500]}...")
        parsed_result = parse_lens_insight_response(response)
        logger.info(f"{lens_type} lens parsing result keys: {list(parsed_result.keys())}")
        return parsed_result
    except Exception as e:
        logger.error(f"Error generating {lens_type} lens insight: {e}")
        return {"error": f"Failed to generate {lens_type} lens insight: {str(e)}"}

async def generate_vc_thesis_comparison(context: Dict[str, Any]) -> Dict[str, Any]:
    logger = logging.getLogger(__name__)
    vc_firm = context.get('vc_firm')
    if vc_firm:
        prompt = render_prompt(load_prompt('vc_thesis_comparison'), context)
    else:
        prompt = render_prompt(load_prompt('vc_thesis_comparison_generic'), context)
    try:
        logger.info(f"Generating VC thesis comparison for idea: {context.get('title', 'N/A')}")
        logger.info(json.dumps({"llm_request": {"model": "moonshotai/kimi-k2-instruct", "prompt": prompt, "context": context}}, indent=2))
        response = await call_groq(prompt, model="moonshotai/kimi-k2-instruct")
        return parse_vc_thesis_comparison_response(response)
    except Exception as e:
        logger.error(f"Error generating VC thesis comparison: {e}")
        return {}

async def generate_investor_deck(context: Dict[str, Any]) -> Dict[str, Any]:
    if context.get("vc_firm"):
        vc_firm_section = f"This deck should be tailored to the investment thesis of {context['vc_firm']}."
        vc_firm_guidance = f"Highlight how this idea aligns with {context['vc_firm']}'s thesis and address any potential concerns."
    else:
        vc_firm_section = "Compare this idea to the most relevant VC archetype and explain why it fits."
        vc_firm_guidance = "Choose a VC archetype that would be most likely to invest in this idea and explain the fit."
    context = dict(context)
    context["vc_firm_section"] = vc_firm_section
    context["vc_firm_guidance"] = vc_firm_guidance
    prompt = render_prompt(load_prompt('investor_deck'), context)
    try:
        logger.info(json.dumps({"llm_request": {"model": "moonshotai/kimi-k2-instruct", "prompt": prompt, "context": context}}, indent=2))
        response = await call_groq(prompt, model="moonshotai/kimi-k2-instruct")
        return parse_investor_deck_response(response)
    except Exception as e:
        logger.error(f"Error generating investor deck: {e}")
        return {}

# Parsing functions for new features
def parse_case_study_response(response: Optional[str]) -> Dict[str, Any]:
    if not response:
        logger.info("No case study response to parse")
        return {}
    logger.info(f"Parsing case study response (length: {len(response)})")
    try:
        cleaned = extract_json_from_llm_response(response)
        data = json.loads(cleaned)
        if isinstance(data, dict):
            logger.info("Successfully parsed case study as JSON")
            return data
        elif isinstance(data, list) and len(data) > 0:
            logger.info("Successfully parsed case study as JSON array, returning first item")
            return data[0]
    except Exception as e:
        logger.debug(f"Case study JSON parsing failed: {e}")
    # Fallback: Parse by headers
    logger.info("Attempting to parse case study by headers")
    sections = parse_by_headers(response)
    if sections:
        logger.info(f"Successfully parsed case study by headers with {len(sections)} sections")
        case_study = {}
        for section in sections:
            key = section["title"].lower().replace(" ", "_")
            case_study[key] = section["content"]
        return case_study
    logger.warning("All case study parsing methods failed, returning raw response")
    return {"raw_analysis": response}

def parse_market_snapshot_response(response: Optional[str]) -> Dict[str, Any]:
    if not response:
        logger.info("No market snapshot response to parse")
        return {}
    logger.info(f"Parsing market snapshot response (length: {len(response)})")
    try:
        cleaned = extract_json_from_llm_response(response)
        data = json.loads(cleaned)
        if isinstance(data, dict):
            logger.info("Successfully parsed market snapshot as JSON")
            return data
        elif isinstance(data, list) and len(data) > 0:
            logger.info("Successfully parsed market snapshot as JSON array, returning first item")
            return data[0]
    except Exception as e:
        logger.debug(f"Market snapshot JSON parsing failed: {e}")
    logger.info("Attempting to parse market snapshot by headers")
    sections = parse_by_headers(response)
    if sections:
        logger.info(f"Successfully parsed market snapshot by headers with {len(sections)} sections")
        snapshot = {}
        for section in sections:
            key = section["title"].lower().replace(" ", "_")
            snapshot[key] = section["content"]
        return snapshot
    logger.warning("All market snapshot parsing methods failed, returning raw response")
    return {"raw_analysis": response}

def parse_lens_insight_response(response: Optional[str]) -> Dict[str, Any]:
    if not response:
        logger.info("No lens insight response to parse")
        return {}
    logger.info(f"Parsing lens insight response (length: {len(response)})")
    try:
        cleaned = extract_json_from_llm_response(response)
        data = json.loads(cleaned)
        if isinstance(data, dict):
            logger.info("Successfully parsed lens insight as JSON")
            processed_data = {}
            for key, value in data.items():
                if key in ['opportunities', 'risks', 'recommendations'] and isinstance(value, list):
                    processed_data[key] = '\n'.join([f"• {item}" for item in value])
                else:
                    processed_data[key] = value
            return processed_data
        elif isinstance(data, list) and len(data) > 0:
            logger.info("Successfully parsed lens insight as JSON array, returning first item")
            first_item = data[0]
            if isinstance(first_item, dict):
                processed_data = {}
                for key, value in first_item.items():
                    if key in ['opportunities', 'risks', 'recommendations'] and isinstance(value, list):
                        processed_data[key] = '\n'.join([f"• {item}" for item in value])
                    else:
                        processed_data[key] = value
                return processed_data
            return first_item
    except Exception as e:
        logger.debug(f"Lens insight JSON parsing failed: {e}")
    logger.info("Attempting to parse lens insight by headers")
    sections = parse_by_headers(response)
    if sections:
        logger.info(f"Successfully parsed lens insight by headers with {len(sections)} sections")
        insight = {}
        for section in sections:
            key = section["title"].lower().replace(" ", "_")
            insight[key] = section["content"]
        return insight
    logger.warning("All lens insight parsing methods failed, returning raw response")
    return {"raw_analysis": response}

def parse_vc_thesis_comparison_response(response: Optional[str]) -> Dict[str, Any]:
    if not response:
        logger.info("No VC thesis comparison response to parse")
        return {}
    logger.info(f"Parsing VC thesis comparison response (length: {len(response)})")
    try:
        cleaned = extract_json_from_llm_response(response)
        data = json.loads(cleaned)
        if isinstance(data, dict):
            logger.info("Successfully parsed VC thesis comparison as JSON")
            return data
        elif isinstance(data, list) and len(data) > 0:
            logger.info("Successfully parsed VC thesis comparison as JSON array, returning first item")
            return data[0]
    except Exception as e:
        logger.debug(f"VC thesis comparison JSON parsing failed: {e}")
    logger.info("Attempting to parse VC thesis comparison by headers")
    sections = parse_by_headers(response)
    if sections:
        logger.info(f"Successfully parsed VC thesis comparison by headers with {len(sections)} sections")
        comparison = {}
        for section in sections:
            key = section["title"].lower().replace(" ", "_")
            comparison[key] = section["content"]
        return comparison
    logger.warning("All VC thesis comparison parsing methods failed, returning raw response")
    return {"raw_analysis": response}

def parse_investor_deck_response(response: Optional[str]) -> Dict[str, Any]:
    if not response:
        logger.info("No investor deck response to parse")
        return {}
    logger.info(f"Parsing investor deck response (length: {len(response)})")
    try:
        cleaned = extract_json_from_llm_response(response)
        data = json.loads(cleaned)
        if isinstance(data, dict) and "slides" in data:
            logger.info("Successfully parsed investor deck as JSON")
            return data
        elif isinstance(data, list) and len(data) > 0:
            logger.info("Successfully parsed investor deck as JSON array, returning first item")
            return data[0]
    except Exception as e:
        logger.debug(f"Investor deck JSON parsing failed: {e}")
    logger.info("Attempting to parse investor deck by headers")
    sections = parse_by_headers(response)
    if sections:
        logger.info(f"Successfully parsed investor deck by headers with {len(sections)} sections")
        slides = []
        for i, section in enumerate(sections, 1):
            slides.append({
                "slide_number": i,
                "slide_type": section["title"].lower().replace(" ", "_"),
                "title": section["title"],
                "content": section["content"],
                "key_points": []
            })
        return {"title": "Investor Deck", "slides": slides}
    logger.warning("All investor deck parsing methods failed, returning raw response")
    return {"raw_analysis": response}

def parse_business_model_response(response: Optional[str]) -> Dict[str, Any]:
    if not response:
        logger.info("No business model response to parse")
        return {"error": "No response"}
    logger.info(f"Parsing business model response (length: {len(response)})")
    try:
        cleaned = extract_json_from_llm_response(response)
        data = json.loads(cleaned)
        if isinstance(data, dict):
            logger.info("Successfully parsed business model as JSON")
            return data
        elif isinstance(data, list) and len(data) > 0:
            logger.info("Successfully parsed business model as JSON array, returning first item")
            return data[0]
    except Exception as e:
        logger.debug(f"Business model JSON parsing failed: {e}")
    logger.info("Attempting to parse business model by headers")
    sections = parse_by_headers(response)
    if sections:
        logger.info(f"Successfully parsed business model by headers with {len(sections)} sections")
        business_model = {}
        for section in sections:
            key = section["title"].lower().replace(" ", "_")
            business_model[key] = section["content"]
        return business_model
    logger.warning("All business model parsing methods failed, returning raw response")
    return {"raw_analysis": response}

def parse_roadmap_response(response: Optional[str]) -> Dict[str, Any]:
    if not response:
        logger.info("No roadmap response to parse")
        return {"error": "No response"}
    logger.info(f"Parsing roadmap response (length: {len(response)})")
    try:
        cleaned = extract_json_from_llm_response(response)
        data = json.loads(cleaned)
        if isinstance(data, dict):
            logger.info("Successfully parsed roadmap as JSON")
            return data
        elif isinstance(data, list) and len(data) > 0:
            logger.info("Successfully parsed roadmap as JSON array, returning first item")
            return data[0]
    except Exception as e:
        logger.debug(f"Roadmap JSON parsing failed: {e}")
    logger.info("Attempting to parse roadmap by headers")
    sections = parse_by_headers(response)
    if sections:
        logger.info(f"Successfully parsed roadmap by headers with {len(sections)} sections")
        roadmap = {}
        for section in sections:
            key = section["title"].lower().replace(" ", "_")
            roadmap[key] = section["content"]
        return roadmap
    logger.warning("All roadmap parsing methods failed, returning raw response")
    return {"raw_analysis": response}

def parse_metrics_response(response: Optional[str]) -> Dict[str, Any]:
    if not response:
        logger.info("No metrics response to parse")
        return {"error": "No response"}
    logger.info(f"Parsing metrics response (length: {len(response)})")
    try:
        cleaned = extract_json_from_llm_response(response)
        data = json.loads(cleaned)
        if isinstance(data, dict):
            logger.info("Successfully parsed metrics as JSON")
            return data
        elif isinstance(data, list) and len(data) > 0:
            logger.info("Successfully parsed metrics as JSON array, returning first item")
            return data[0]
    except Exception as e:
        logger.debug(f"Metrics JSON parsing failed: {e}")
    logger.info("Attempting to parse metrics by headers")
    sections = parse_by_headers(response)
    if sections:
        logger.info(f"Successfully parsed metrics by headers with {len(sections)} sections")
        metrics = {}
        for section in sections:
            key = section["title"].lower().replace(" ", "_")
            metrics[key] = section["content"]
        return metrics
    logger.warning("All metrics parsing methods failed, returning raw response")
    return {"raw_analysis": response}

def parse_roi_response(response: Optional[str]) -> Dict[str, Any]:
    if not response:
        logger.info("No ROI response to parse")
        return {"error": "No response"}
    logger.info(f"Parsing ROI response (length: {len(response)})")
    try:
        cleaned = extract_json_from_llm_response(response)
        data = json.loads(cleaned)
        if isinstance(data, dict):
            logger.info("Successfully parsed ROI as JSON")
            return data
        elif isinstance(data, list) and len(data) > 0:
            logger.info("Successfully parsed ROI as JSON array, returning first item")
            return data[0]
    except Exception as e:
        logger.debug(f"ROI JSON parsing failed: {e}")
    logger.info("Attempting to parse ROI by headers")
    sections = parse_by_headers(response)
    if sections:
        logger.info(f"Successfully parsed ROI by headers with {len(sections)} sections")
        roi = {}
        for section in sections:
            key = section["title"].lower().replace(" ", "_")
            roi[key] = section["content"]
        return roi
    logger.warning("All ROI parsing methods failed, returning raw response")
    return {"raw_analysis": response}

def parse_post_mortem_response(response: Optional[str]) -> Dict[str, Any]:
    if not response:
        logger.info("No post-mortem response to parse")
        return {"error": "No response"}
    logger.info(f"Parsing post-mortem response (length: {len(response)})")
    try:
        data = json.loads(response)
        if isinstance(data, dict):
            logger.info("Successfully parsed post-mortem as JSON")
            return data
        elif isinstance(data, list) and len(data) > 0:
            logger.info("Successfully parsed post-mortem as JSON array, returning first item")
            return data[0]
    except json.JSONDecodeError as e:
        logger.debug(f"Post-mortem JSON parsing failed: {e}")
    try:
        json_match = re.search(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', response, re.DOTALL)
        if json_match:
            data = json.loads(json_match.group(0))
            if isinstance(data, dict):
                logger.info("Successfully extracted post-mortem JSON from within response")
                return data
    except (json.JSONDecodeError, AttributeError) as e:
        logger.debug(f"Post-mortem JSON extraction failed: {e}")
    logger.info("Attempting to parse post-mortem by headers")
    sections = parse_by_headers(response)
    if sections:
        logger.info(f"Successfully parsed post-mortem by headers with {len(sections)} sections")
        post_mortem = {}
        for section in sections:
            key = section["title"].lower().replace(" ", "_")
            post_mortem[key] = section["content"]
        return post_mortem
    logger.warning("All post-mortem parsing methods failed, returning raw response")
    return {"raw_analysis": response}

async def clean_text_with_llm(text: str) -> str:
    """
    Use the LLM to correct spelling and grammar in the given text, preserving meaning and tone.
    Returns the cleaned text. If the LLM call fails, returns the original text.
    """
    prompt = (
        "Correct any spelling and grammar errors in the following text, but do not change the meaning or tone. "
        "Return only the corrected text, with no extra commentary.\n\n"
        f"{text}"
    )
    try:
        logger.info(json.dumps({"llm_request": {"model": "moonshotai/kimi-k2-instruct", "prompt": prompt, "context": {}}}, indent=2))
        cleaned = await call_groq(prompt, model="moonshotai/kimi-k2-instruct")
        # Remove any leading/trailing whitespace and ensure no extra LLM commentary
        if isinstance(cleaned, str):
            return cleaned.strip()
        else:
            return text
    except Exception as e:
        logger.error(f"clean_text_with_llm failed: {e}")
        return text

async def orchestrate_iterating(context: Dict[str, Any]) -> Dict[str, Any]:
    """
    Orchestrate the iterating stage: run investor/customer lens, VC thesis, and investor deck.
    Returns a dict with all results.
    """
    results = {}
    # Investor lens
    investor_lens = await generate_lens_insight({**context, "lens_type": "investor"})
    results["investor_lens"] = investor_lens
    # Customer lens
    customer_lens = await generate_lens_insight({**context, "lens_type": "customer"})
    results["customer_lens"] = customer_lens
    # VC thesis comparison
    vc_thesis = await generate_vc_thesis_comparison(context)
    results["vc_thesis_comparison"] = vc_thesis
    # Investor deck
    investor_deck = await generate_investor_deck(context)
    results["investor_deck"] = investor_deck
    return results

async def orchestrate_considering(context: Dict[str, Any]) -> Dict[str, Any]:
    """
    Orchestrate the considering stage: run investor deck, investor lens, and VC thesis.
    Returns a dict with all results.
    """
    results = {}
    # Investor deck
    investor_deck = await generate_investor_deck(context)
    results["investor_deck"] = investor_deck
    # Investor lens
    investor_lens = await generate_lens_insight({**context, "lens_type": "investor"})
    results["investor_lens"] = investor_lens
    # VC thesis comparison
    vc_thesis = await generate_vc_thesis_comparison(context)
    results["vc_thesis_comparison"] = vc_thesis
    return results

# --- NEW ORCHESTRATION FUNCTIONS ---

def sanitize_iterating_fields(iterating: Dict[str, Any]) -> Dict[str, Any]:
    fields = [
        "validate_assumptions", "iteration_log", "rescore", "business_model_canvas_updates",
        "market_snapshot", "analogous_success_failure_analysis", "early_traction_plan",
        "feedback_loops", "pivot_persevere_kill_framework", "validation_metrics_dashboard", "generation_notes"
    ]
    for field in fields:
        if field not in iterating:
            iterating[field] = "N/A" if field == "generation_notes" else []
    # Enforce .25 increments for scores/confidence in rescore
    if isinstance(iterating.get("rescore"), list):
        for item in iterating["rescore"]:
            for key in ["score", "confidence"]:
                if key in item and item[key] is not None:
                    try:
                        item[key] = float(round(float(item[key]) * 4) / 4)
                    except Exception:
                        item[key] = None
    return iterating

# --- Layered JSON Repair and Self-Healing ---
def layered_json_fix_and_validate(response: str, schema_validator=None, max_retries=3, stream_repair_func=None, ai_self_heal_func=None):
    """
    Layered approach to robustly parse, repair, and validate LLM JSON output.
    1. If stream_repair_func is provided, repair the stream first.
    2. Try to parse as JSON.
    3. If parsing fails, run jsonrepair.
    4. If schema validation fails, use ai_self_heal_func (e.g., AI SDK Plus) to self-heal.
    5. Final repair attempt if needed.
    """
    logger = logging.getLogger(__name__)
    raw = response
    # 1. Stream repair (if available)
    if stream_repair_func:
        try:
            logger.info("[LAYERED JSON] Running stream repair...")
            raw = stream_repair_func(raw)
        except Exception as e:
            logger.warning(f"[LAYERED JSON] Stream repair failed: {e}")
    # 2. Try to parse
    try:
        data = json.loads(raw)
    except Exception:
        # 3. Try jsonrepair
        try:
            logger.info("[LAYERED JSON] Running jsonrepair...")
            repaired = repair_json_with_py(raw)  # switched to Python-native dirtyjson
            data = json.loads(repaired)
        except Exception as e:
            logger.warning(f"[LAYERED JSON] jsonrepair failed: {e}")
            data = None
    # 4. Schema validation and AI self-healing
    fixed = raw  # Ensure 'fixed' is always defined
    if schema_validator and data is not None and not schema_validator(data):
        logger.info("[LAYERED JSON] Schema validation failed, attempting AI self-healing...")
        import inspect, asyncio
        def maybe_await(func, *args, **kwargs):
            if inspect.iscoroutinefunction(func):
                try:
                    loop = asyncio.get_running_loop()
                    # If we're in an async context, raise an error to force caller to handle it
                    raise RuntimeError("layered_json_fix_and_validate must be called from an async context to use async self-heal.")
                except RuntimeError:
                    # No running event loop, so we can use asyncio.run
                    return asyncio.run(func(*args, **kwargs))
            else:
                return func(*args, **kwargs)
        for attempt in range(max_retries):
            if ai_self_heal_func:
                try:
                    fixed = maybe_await(ai_self_heal_func, raw, schema_validator)
                    data = json.loads(fixed)
                    if schema_validator(data):
                        logger.info(f"[LAYERED JSON] AI self-healing succeeded on attempt {attempt+1}")
                        break
                except Exception as e:
                    logger.warning(f"[LAYERED JSON] AI self-healing attempt {attempt+1} failed: {e}")
            # Final repair after AI self-heal
            try:
                repaired = repair_json_with_py(fixed)  # switched to Python-native dirtyjson
                data = json.loads(repaired)
                if schema_validator(data):
                    logger.info(f"[LAYERED JSON] Final repair after AI self-heal succeeded on attempt {attempt+1}")
                    break
            except Exception as e:
                logger.warning(f"[LAYERED JSON] Final repair after AI self-heal failed: {e}")
    return data


def dummy_ai_self_heal(raw, schema_validator):
    # TODO: Integrate AI SDK Plus or similar self-healing loop
    # For now, just return the raw string
    return raw

# Update robust_extract_json to use the new layered function
def robust_extract_json(response: str):
    """Extract the first valid JSON object or array from a string, using layered repair and validation. Now with fallback to extract JSON from code blocks."""
    if not response:
        return None
    import logging
    logger = logging.getLogger(__name__)
    # Try to extract JSON from code block first
    import re
    code_block_match = re.search(r'```json\s*([\s\S]+?)```', response, re.IGNORECASE)
    if not code_block_match:
        code_block_match = re.search(r'```\s*([\s\S]+?)```', response)
    if code_block_match:
        json_candidate = code_block_match.group(1).strip()
        logger.info("[LLM] Fallback: Extracted JSON from code block in LLM response.")
        response = json_candidate
    # Remove markdown code block markers (in case any remain)
    response = re.sub(r'```(?:json)?', '', response, flags=re.IGNORECASE).strip()
    # Remove preamble lines before the first { or [
    match = re.search(r'([\[{].*)', response, re.DOTALL)
    if match:
        response = match.group(1)
    # Use layered repair/validation pipeline
    return layered_json_fix_and_validate(
        response,
        schema_validator=validate_idea_dict,  # or other schema as needed
        max_retries=3,
        stream_repair_func=dummy_stream_repair,
        ai_self_heal_func=dummy_ai_self_heal
    )

async def analyze_version_impact(old_fields: Dict[str, Any], new_fields: Dict[str, Any], changed_fields: List[str]) -> Dict[str, Any]:
    """Analyze the impact of version changes and provide actionable insights."""
    import json
    import logging
    logger = logging.getLogger(__name__)
    try:
        context = {
            "old_version": json.dumps(old_fields, indent=2),
            "new_version": json.dumps(new_fields, indent=2),
            "fields_changed": ', '.join(changed_fields)
        }
        prompt = render_prompt(load_prompt('impact_analysis'), context)
        response = await call_groq(prompt)
        # Try to parse JSON response
        if response is not None:
            try:
                return json.loads(response)
            except Exception:
                # Fallback if JSON parsing fails
                return {
                    "impact": response[:200] + "..." if len(response) > 200 else response,
                    "moveNeedle": "Focus on validating core assumptions and market demand."
                }
        else:
            return {
                "impact": "No response from LLM.",
                "moveNeedle": "Consider testing key assumptions with potential customers."
            }
    except Exception as e:
        logger.error(f"Error in impact analysis: {e}")
        return {
            "impact": "Unable to analyze impact at this time.",
            "moveNeedle": "Consider testing key assumptions with potential customers."
        }

# --- Strict LLM Prompt Schema ---
LLM_IDEA_SCHEMA = '''
Respond with a JSON object with the following fields:
{
  "title": string,
  "hook": string,
  "value": string,
  "evidence": string,
  "differentiator": string,
  "score": integer (1-10),
  "mvp_effort": integer (1-10),
  "type": string,
  "assumptions": array of strings,
  "repo_usage": string
}
'''

def render_idea_prompt(context: Dict[str, Any]) -> str:
    """Render the LLM prompt with schema and context."""
    prompt = f"""
{LLM_IDEA_SCHEMA}
Context:
{context.get('user_context', '')}
"""
    logging.info(f"[LLM PROMPT] Prompt sent to LLM:\n{prompt}")
    return prompt

def validate_idea_dict(idea: Dict[str, Any], existing_ideas=None) -> bool:
    """Validate that the parsed idea dict has all required fields and correct types, and meets quality standards."""
    # Only strictly require title and hook
    if not idea.get("title") or not isinstance(idea.get("title"), str) or not idea["title"].strip():
        logging.warning(f"[LLM VALIDATION] Missing or empty required field: title in idea: {idea}")
        return False
    if not idea.get("hook") or not isinstance(idea.get("hook"), str) or not idea["hook"].strip():
        logging.warning(f"[LLM VALIDATION] Missing or empty required field: hook in idea: {idea}")
        return False
    # Uniqueness check
    if existing_ideas and is_duplicate_idea(idea, existing_ideas):
        logging.warning(f"[LLM QUALITY] Duplicate idea detected: {idea}")
        return False
    # Warn for other fields but do not skip
    evref = idea.get("evidence_reference", {})
    if not isinstance(evref, dict) or not evref.get("stat") or not is_non_paywalled_url(evref.get("url", "")):
        logging.warning(f"[LLM QUALITY] Invalid or missing evidence_reference (stat/url) in idea: {idea}")
    if not is_unique_differentiator(idea.get("differentiator", "")):
        logging.warning(f"[LLM QUALITY] Generic or non-unique differentiator in idea: {idea}")
    if not is_specific_problem_statement(idea.get("problem_statement", "")):
        logging.warning(f"[LLM QUALITY] Problem statement is not specific or lacks a real source: {idea}")
    if not is_real_actionable_cta(idea.get("elevator_pitch", "")):
        logging.warning(f"[LLM QUALITY] Elevator pitch is not compelling or specific: {idea}")
    # Warn for generic/boilerplate titles but do not skip
    generic_terms = ["ai-powered", "platform", "solution", "personalized", "chatbot", "automation"]
    if any(g in idea.get("title", "").lower() for g in generic_terms):
        logging.warning(f"[LLM QUALITY] Title is generic or boilerplate: {idea}")
    return True

def filter_idea_fields(idea: Dict[str, Any]) -> Dict[str, Any]:
    """Filter out unexpected fields from LLM response, keeping only expected fields."""
    expected_fields = {
        "title", "hook", "value", "evidence", "differentiator", "score", "mvp_effort", "type", "assumptions", "repo_usage", "elevator_pitch",
        "problem_statement", "evidence_reference", "core_assumptions", "riskiest_assumptions",
        "generation_notes", "scope_commitment", "source_of_inspiration", "repo_url",
        "repo_name", "repo_description", "mvp_steps", "prerequisites"
    }
    
    # Filter out unexpected fields
    filtered_idea = {}
    for key, value in idea.items():
        if key in expected_fields:
            filtered_idea[key] = value
        else:
            logging.info(f"[LLM FILTER] Removed unexpected field '{key}' from idea response")
    
    return filtered_idea

# --- Layered JSON Repair and Self-Healing ---
def dummy_stream_repair(raw):
    """
    Placeholder for streaming JSON repair. Now uses Python-native repair_json_with_py.
    """
    logger = logging.getLogger(__name__)
    try:
        return repair_json_with_py(raw)
    except Exception as e:
        logger.warning(f"[LAYERED JSON] Streaming repair failed: {e}")
        return raw

async def ai_self_heal_llm(raw, schema_validator, schema_hint=None, max_retries=2):
    """
    Use the LLM itself to fix its output by providing the invalid JSON and schema errors.
    Optionally, provide a schema_hint (string) to help the LLM fix its output.
    """
    logger = logging.getLogger(__name__)
    import openai  # or your LLM client
    prompt = f"""
Your previous response did not match the required JSON schema.
Schema hint: {schema_hint or ''}
Here is your invalid JSON:
{raw}
Please fix the JSON so it is valid and matches the schema. Only return the corrected JSON object or array.
"""
    for attempt in range(max_retries):
        try:
            logger.info(f"[LAYERED JSON] AI self-heal attempt {attempt+1}")
            # Replace with your actual LLM call (OpenAI, Groq, etc.)
            # This is a placeholder for demonstration:
            response = await call_groq(prompt)
            # Try to parse and validate
            if response is None:
                continue
            data = None
            try:
                data = json.loads(response)
            except Exception:
                try:
                    data = json.loads(repair_json_with_py(response))
                except Exception:
                    data = None
            if data is not None and schema_validator(data):
                logger.info(f"[LAYERED JSON] AI self-heal succeeded on attempt {attempt+1}")
                return json.dumps(data)
        except Exception as e:
            logger.warning(f"[LAYERED JSON] AI self-heal attempt {attempt+1} failed: {e}")
    logger.error("[LAYERED JSON] AI self-heal failed after all attempts.")
    return raw

import types
layered_json_fix_and_validate.__globals__['dummy_stream_repair'] = dummy_stream_repair
layered_json_fix_and_validate.__globals__['dummy_ai_self_heal'] = ai_self_heal_llm

def get_iteration_context(idea, version=None, step_data=None, user=None, previous_learnings=None):
    context = context_idea(idea)
    if version:
        context['version'] = version
    if previous_learnings:
        context['learnings'] = previous_learnings
    if step_data:
        context.update(step_data)
    if user:
        context.update(context_user(user))
    return context

async def run_iteration_frame(idea, version, user=None, previous_learnings=None):
    context = get_iteration_context(idea, version, user=user, previous_learnings=previous_learnings)
    prompt = render_prompt(load_prompt('iteration_frame'), context)
    response = await call_groq(prompt)
    return response

async def run_iteration_design(idea, version, risk_focus, user=None, previous_learnings=None):
    context = get_iteration_context(idea, version, {'risk_focus': risk_focus}, user=user, previous_learnings=previous_learnings)
    prompt = render_prompt(load_prompt('iteration_design'), context)
    response = await call_groq(prompt)
    return response

async def run_iteration_success_criteria(idea, version, hypothesis, method, user=None):
    context = get_iteration_context(idea, version, {'hypothesis': hypothesis, 'method': method}, user=user)
    prompt = render_prompt(load_prompt('iteration_success_criteria'), context)
    response = await call_groq(prompt)
    return response

async def run_iteration_confidence(idea, version, hypothesis, method, success_metric, target, user=None):
    context = get_iteration_context(idea, version, {
        'hypothesis': hypothesis,
        'method': method,
        'success_metric': success_metric,
        'target': target
    }, user=user)
    prompt = render_prompt(load_prompt('iteration_confidence'), context)
    response = await call_groq(prompt)
    return response

async def run_iteration_results(idea, version, hypothesis, method, task_list, tools, success_metric, target, user=None):
    context = get_iteration_context(idea, version, {
        'hypothesis': hypothesis,
        'method': method,
        'task_list': task_list,
        'tools': tools,
        'success_metric': success_metric,
        'target': target
    }, user=user)
    prompt = render_prompt(load_prompt('iteration_results'), context)
    response = await call_groq(prompt)
    return response

async def run_iteration_decision(idea, version, raw_results, learnings, hypothesis_supported, user=None):
    context = get_iteration_context(idea, version, {
        'raw_results': raw_results,
        'learnings': learnings,
        'hypothesis_supported': hypothesis_supported
    }, user=user)
    prompt = render_prompt(load_prompt('iteration_decision'), context)
    response = await call_groq(prompt)
    return response

def load_prompt_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

async def generate_suggested(context: Dict[str, Any]) -> Dict[str, Any]:
    # Use the unified idea_generation prompt for suggested stage
    prompt_template = load_prompt('idea_generation')
    prompt = render_prompt(prompt_template, context)
    response = await call_groq(prompt, model="moonshotai/kimi-k2-instruct")
    return {"suggested": response, "raw": response}

async def generate_iterating(context: Dict[str, Any]) -> Dict[str, Any]:
    prompt_template = load_prompt('iterating')
    prompt = render_prompt(prompt_template, context)
    response = await call_groq(prompt, model="moonshotai/kimi-k2-instruct")
    return {"iterating": response, "raw": response}

def is_valid_url(url: str) -> bool:
    import re
    if not url or not isinstance(url, str):
        return False
    # Must be http(s) and not a placeholder or markdown
    return bool(re.match(r'^https?://[^\s]+$', url))

def is_specific_call_to_action(cta: str) -> bool:
    if not cta or not isinstance(cta, str):
        return False
    generic = ["learn more", "get started", "click here", "sign up", "request info", "contact us", "more info"]
    return not any(g in cta.lower() for g in generic) and len(cta.strip()) > 10

def is_valid_repo_usage(repo: str) -> bool:
    if not repo:
        return True  # Blank is allowed
    if repo.startswith("http"):
        return is_valid_url(repo)
    # Allow clear integration paths
    allowed = ["integrate with", "use ", "connect to", "via ", "for workflow", "automation"]
    return any(a in repo.lower() for a in allowed) and len(repo.strip()) > 10

def is_non_paywalled_url(url: str) -> bool:
    if not url or not isinstance(url, str):
        return False
    # Must be http(s), not placeholder, not markdown, not paywalled
    if 'example.com' in url or 'paywall' in url or 'forrester.com' in url or 'gartner.com' in url:
        return False
    return bool(re.match(r'^https?://[^\s]+$', url))

def is_unique_differentiator(diff: str) -> bool:
    if not diff or not isinstance(diff, str):
        return False
    generic = ["ai-powered", "personalized", "machine learning", "automation", "chatbot", "platform"]
    return not any(g in diff.lower() for g in generic) and len(diff.strip()) > 15

def is_specific_problem_statement(ps: str) -> bool:
    if not ps or not isinstance(ps, str):
        return False
    # Must mention a real pain point and a source (URL, stat, or report)
    return ("http" in ps or "%" in ps or "study" in ps or "report" in ps) and len(ps.strip()) > 30

def is_real_actionable_cta(cta: str) -> bool:
    if not cta or not isinstance(cta, str):
        return False
    generic = ["learn more", "get started", "click here", "sign up", "request info", "contact us", "more info"]
    return ("http" in cta or "demo" in cta or "signup" in cta or "contact" in cta) and not any(g in cta.lower() for g in generic) and len(cta.strip()) > 15

def is_real_repo_url(repo: str) -> bool:
    if not repo:
        return True  # Blank is allowed
    if repo.startswith("http"):
        return is_non_paywalled_url(repo)
    return False

def is_compelling_pitch(pitch: str) -> bool:
    if not pitch or not isinstance(pitch, str):
        return False
    return len(pitch.strip()) > 30 and not any(g in pitch.lower() for g in ["ai-powered", "platform", "solution", "personalized"])

def is_duplicate_idea(new_idea, existing_ideas):
    for idea in existing_ideas:
        if (
            idea.get('title', '').lower() == new_idea.get('title', '').lower() or
            idea.get('differentiator', '').lower() == new_idea.get('differentiator', '').lower() or
            idea.get('problem_statement', '').lower() == new_idea.get('problem_statement', '').lower()
        ):
            return True
    return False

def get_deep_dive_agent():
    # Define the agent for Deep Dive using PydanticAI
    return Agent(
        'groq:moonshotai/kimi-k2-instruct',
        output_type=DeepDiveIdeaData,
        system_prompt=load_prompt('deep_dive'),
    )

async def generate_deep_dive_pydanticai(context: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generate a deep dive analysis for an idea using PydanticAI Agent for robust output validation.
    Context should include at least:
      - title
      - hook
      - value
      - evidence
      - differentiator
      - user_context (optional)
    """
    import re
    logger = logging.getLogger(__name__)
    agent = get_deep_dive_agent()
    max_retries = 3
    last_error = None
    DeepDiveModel = DeepDiveIdeaData
    for attempt in range(1, max_retries + 1):
        try:
            logger.info(f"[PydanticAI] Deep Dive agent attempt {attempt} with context keys: {list(context.keys())}")
            context_str = json.dumps(context, indent=2)
            # Run the agent and get the validated output
            result = await agent.run(context_str)
            deep_dive_data = result.output.dict() if hasattr(result.output, 'dict') else dict(result.output)
            # Try to get the original LLM response string (if available)
            llm_response_str = getattr(result, 'llm_response', None)
            if llm_response_str is None:
                # Fallback: just use the stringified output
                llm_response_str = json.dumps(deep_dive_data)
            feedback = None
            # Try to extract feedback/self-scores from the LLM response string
            if llm_response_str and isinstance(llm_response_str, str):
                json_objects = re.findall(r'{[\s\S]*?}', llm_response_str)
                if len(json_objects) > 1:
                    try:
                        feedback = json.loads(json_objects[1])
                    except Exception as e:
                        logger.warning(f"[PydanticAI] Failed to parse feedback/self-scores JSON: {e}")
            logger.info(f"[PydanticAI] Deep Dive agent run complete. Output type: {type(result.output)}")
            return {
                "deep_dive": deep_dive_data,
                "feedback": feedback,
                "raw": llm_response_str
            }
        except Exception as e:
            last_error = e
            logger.error(f"[PydanticAI] Error generating deep dive (attempt {attempt}): {e}\n{traceback.format_exc()}")
            # Try to repair JSON and retry
            if attempt < max_retries:
                try:
                    # Try to extract and repair the first JSON object from the error string
                    response_str = str(e)
                    json_candidates = re.findall(r'{[\s\S]*?}', response_str)
                    if json_candidates:
                        from app.json_repair_util import repair_json_with_py
                        repaired = repair_json_with_py(json_candidates[0])
                        repaired_data = json.loads(repaired)
                        # Validate with DeepDiveIdeaData
                        validated = DeepDiveModel.parse_obj(repaired_data)
                        logger.info(f"[PydanticAI] Successfully repaired and validated JSON on retry {attempt}")
                        return {
                            "deep_dive": validated.dict() if hasattr(validated, 'dict') else dict(validated),
                            "feedback": None,
                            "raw": repaired
                        }
                except Exception as repair_e:
                    logger.warning(f"[PydanticAI] Repair attempt failed: {repair_e}")
            # Optionally, could add LLM self-heal here
    # If all attempts fail, return error content
    error_content = {"sections": [{"title": "Error Generating Analysis", "content": str(last_error)}]}
    return {"deep_dive": error_content, "feedback": None, "raw": None}

def get_iterating_agent():
    """Return a PydanticAI Agent for the Iterating stage."""
    return Agent(
        'groq:moonshotai/kimi-k2-instruct',
        output_type=IteratingIdeaData,
        system_prompt=load_prompt('iterating'),
    )

def get_considering_agent():
    """Return a PydanticAI Agent for the Considering stage."""
    return Agent(
        'groq:moonshotai/kimi-k2-instruct',
        output_type=ConsideringIdeaData,
        system_prompt=load_prompt('considering'),
    )

async def generate_iterating_pydanticai(context: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generate iterating analysis using PydanticAI Agent with robust output validation and retry/repair logic.
    """
    import re
    logger = logging.getLogger(__name__)
    agent = get_iterating_agent()
    max_retries = 3
    last_error = None
    for attempt in range(1, max_retries + 1):
        try:
            logger.info(f"[PydanticAI] Iterating agent attempt {attempt} with context keys: {list(context.keys())}")
            context_str = json.dumps(context, indent=2)
            result = await agent.run(context_str)
            iterating_data = result.output.dict() if hasattr(result.output, 'dict') else dict(result.output)
            llm_response_str = getattr(result, 'llm_response', None)
            if llm_response_str is None:
                llm_response_str = json.dumps(iterating_data)
            feedback = None
            if llm_response_str and isinstance(llm_response_str, str):
                json_objects = re.findall(r'{[\s\S]*?}', llm_response_str)
                if len(json_objects) > 1:
                    try:
                        feedback = json.loads(json_objects[1])
                    except Exception as e:
                        logger.warning(f"[PydanticAI] Failed to parse feedback/self-scores JSON: {e}")
            logger.info(f"[PydanticAI] Iterating agent run complete. Output type: {type(result.output)}")
            return {
                "iterating": iterating_data,
                "feedback": feedback,
                "raw": llm_response_str
            }
        except Exception as e:
            last_error = e
            logger.error(f"[PydanticAI] Error generating iterating (attempt {attempt}): {e}\n{traceback.format_exc()}")
            if attempt < max_retries:
                try:
                    response_str = str(e)
                    json_candidates = re.findall(r'{[\s\S]*?}', response_str)
                    if json_candidates:
                        from app.json_repair_util import repair_json_with_py
                        repaired = repair_json_with_py(json_candidates[0])
                        repaired_data = json.loads(repaired)
                        from app.schemas import IteratingIdeaData
                        validated = IteratingIdeaData.parse_obj(repaired_data)
                        logger.info(f"[PydanticAI] Successfully repaired and validated JSON on retry {attempt}")
                        return {
                            "iterating": validated.dict() if hasattr(validated, 'dict') else dict(validated),
                            "feedback": None,
                            "raw": repaired
                        }
                except Exception as repair_e:
                    logger.warning(f"[PydanticAI] Repair attempt failed: {repair_e}")
    error_content = {"sections": [{"title": "Error Generating Iterating Analysis", "content": str(last_error)}]}
    return {"iterating": error_content, "feedback": None, "raw": None}

async def generate_considering_pydanticai(context: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generate considering analysis using PydanticAI Agent with robust output validation and retry/repair logic.
    """
    import re
    logger = logging.getLogger(__name__)
    agent = get_considering_agent()
    max_retries = 3
    last_error = None
    for attempt in range(1, max_retries + 1):
        try:
            logger.info(f"[PydanticAI] Considering agent attempt {attempt} with context keys: {list(context.keys())}")
            context_str = json.dumps(context, indent=2)
            result = await agent.run(context_str)
            considering_data = result.output.dict() if hasattr(result.output, 'dict') else dict(result.output)
            llm_response_str = getattr(result, 'llm_response', None)
            if llm_response_str is None:
                llm_response_str = json.dumps(considering_data)
            feedback = None
            if llm_response_str and isinstance(llm_response_str, str):
                json_objects = re.findall(r'{[\s\S]*?}', llm_response_str)
                if len(json_objects) > 1:
                    try:
                        feedback = json.loads(json_objects[1])
                    except Exception as e:
                        logger.warning(f"[PydanticAI] Failed to parse feedback/self-scores JSON: {e}")
            logger.info(f"[PydanticAI] Considering agent run complete. Output type: {type(result.output)}")
            return {
                "considering": considering_data,
                "feedback": feedback,
                "raw": llm_response_str
            }
        except Exception as e:
            last_error = e
            logger.error(f"[PydanticAI] Error generating considering (attempt {attempt}): {e}\n{traceback.format_exc()}")
            if attempt < max_retries:
                try:
                    response_str = str(e)
                    json_candidates = re.findall(r'{[\s\S]*?}', response_str)
                    if json_candidates:
                        from app.json_repair_util import repair_json_with_py
                        repaired = repair_json_with_py(json_candidates[0])
                        repaired_data = json.loads(repaired)
                        from app.schemas import ConsideringIdeaData
                        validated = ConsideringIdeaData.parse_obj(repaired_data)
                        logger.info(f"[PydanticAI] Successfully repaired and validated JSON on retry {attempt}")
                        return {
                            "considering": validated.dict() if hasattr(validated, 'dict') else dict(validated),
                            "feedback": None,
                            "raw": repaired
                        }
                except Exception as repair_e:
                    logger.warning(f"[PydanticAI] Repair attempt failed: {repair_e}")
    error_content = {"sections": [{"title": "Error Generating Considering Analysis", "content": str(last_error)}]}
    return {"considering": error_content, "feedback": None, "raw": None}

def get_iteration_experiment_agent():
    """Return a PydanticAI Agent for the experiment-first Iterating stage."""
    return Agent(
        'groq:moonshotai/kimi-k2-instruct',
        output_type=IteratingExperiment,
        system_prompt=load_prompt('iterating/iteration'),
    )

async def generate_iteration_experiment_pydanticai(context: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generate an experiment proposal for the Iterating stage using PydanticAI Agent with robust output validation and retry/repair logic.
    """
    import re
    logger = logging.getLogger(__name__)
    agent = get_iteration_experiment_agent()
    max_retries = 3
    last_error = None
    for attempt in range(1, max_retries + 1):
        try:
            logger.info(f"[PydanticAI] Iteration Experiment agent attempt {attempt} with context keys: {list(context.keys())}")
            context_str = json.dumps(context, indent=2)
            result = await agent.run(context_str)
            experiment_data = result.output.dict() if hasattr(result.output, 'dict') else dict(result.output)
            llm_response_str = getattr(result, 'llm_response', None)
            if llm_response_str is None:
                llm_response_str = json.dumps(experiment_data)
            feedback = None
            if llm_response_str and isinstance(llm_response_str, str):
                json_objects = re.findall(r'{[\s\S]*?}', llm_response_str)
                if len(json_objects) > 1:
                    try:
                        feedback = json.loads(json_objects[1])
                    except Exception as e:
                        logger.warning(f"[PydanticAI] Failed to parse feedback/self-scores JSON: {e}")
            logger.info(f"[PydanticAI] Iteration Experiment agent run complete. Output type: {type(result.output)}")
            return {
                "experiment": experiment_data,
                "feedback": feedback,
                "raw": llm_response_str
            }
        except Exception as e:
            last_error = e
            logger.error(f"[PydanticAI] Error generating iteration experiment (attempt {attempt}): {e}\n{traceback.format_exc()}")
            if attempt < max_retries:
                try:
                    response_str = str(e)
                    json_candidates = re.findall(r'{[\s\S]*?}', response_str)
                    if json_candidates:
                        from app.json_repair_util import repair_json_with_py
                        repaired = repair_json_with_py(json_candidates[0])
                        repaired_data = json.loads(repaired)
                        validated = IteratingExperiment.parse_obj(repaired_data)
                        logger.info(f"[PydanticAI] Successfully repaired and validated JSON on retry {attempt}")
                        return {
                            "experiment": validated.dict() if hasattr(validated, 'dict') else dict(validated),
                            "feedback": None,
                            "raw": repaired
                        }
                except Exception as repair_e:
                    logger.warning(f"[PydanticAI] Repair attempt failed: {repair_e}")
    error_content = {"sections": [{"title": "Error Generating Iteration Experiment", "content": str(last_error)}]}
    return {"experiment": error_content, "feedback": None, "raw": None}
