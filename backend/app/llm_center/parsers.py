"""Response parsing and validation utilities"""

import json
import re
import logging
from typing import Dict, Any, List, Optional, Union

from .types import LLMResponse, ParsedResponse, PromptType
from ..schemas import DeepDiveIdeaData, IteratingIdeaData, ConsideringIdeaData, DeepDiveCategoryData
from ..json_repair_util import repair_json_with_py, extract_json_from_llm_response


logger = logging.getLogger(__name__)


class ResponseParser:
    """Central response parser for all LLM outputs"""
    
    def parse_response(self, response: LLMResponse) -> ParsedResponse:
        """Parse an LLM response based on its prompt type"""
        
        try:
            if response.prompt_type == PromptType.IDEA_GENERATION:
                parsed_data = self._parse_idea_generation(response.content)
            elif response.prompt_type == PromptType.DEEP_DIVE:
                parsed_data = self._parse_deep_dive(response.content)
            elif response.prompt_type == PromptType.ITERATING:
                parsed_data = self._parse_iterating(response.content)
            elif response.prompt_type == PromptType.CONSIDERING:
                parsed_data = self._parse_considering(response.content)
            elif response.prompt_type == PromptType.GENERAL_LLM:
                parsed_data = {"content": response.content}
            else:
                parsed_data = {"content": response.content}
            
            return ParsedResponse(
                raw_response=response,
                parsed_data=parsed_data,
                success=True
            )
            
        except Exception as e:
            logger.error(f"Error parsing {response.prompt_type} response: {e}")
            return ParsedResponse(
                raw_response=response,
                parsed_data={"error": str(e), "raw_content": response.content},
                validation_errors=[str(e)],
                success=False
            )
    
    def _parse_idea_generation(self, content: str) -> Dict[str, Any]:
        """Parse idea generation response into structured data"""
        ideas = self._extract_json_array(content)
        parsed_ideas = []
        
        if isinstance(ideas, list) and ideas:
            for idea in ideas:
                if not isinstance(idea, dict):
                    logger.warning(f"Skipping non-dict idea: {idea}")
                    continue
                idea = self._sanitize_idea_fields(idea)
                idea = self._filter_idea_fields(idea)
                parsed_ideas.append(idea)
            return {"ideas": parsed_ideas}
        
        # Fallback: parse by sections
        sections = re.split(r'\*\*Idea \d+|^Idea \d+|^\d+\. ', content, flags=re.MULTILINE)
        for section in sections:
            idea = self._parse_single_idea(section)
            if idea:
                idea = self._filter_idea_fields(idea)
                parsed_ideas.append(idea)
        
        return {"ideas": parsed_ideas}
    
    def _parse_deep_dive(self, content: str) -> Dict[str, Any]:
        """Parse deep dive response"""
        return self._robust_parse_deep_dive_raw_response(content).dict()
    
    def _parse_iterating(self, content: str) -> Dict[str, Any]:
        """Parse iterating response"""
        try:
            data = json.loads(content)
            if 'iteratingTable' not in data or not isinstance(data['iteratingTable'], list):
                raise ValueError('Missing or invalid iteratingTable')
            return data
        except Exception as e:
            logger.error(f"Failed to parse iterating response: {e}")
            raise
    
    def _parse_considering(self, content: str) -> Dict[str, Any]:
        """Parse considering response"""
        try:
            data = json.loads(content)
            if 'consideringTable' not in data or not isinstance(data['consideringTable'], list):
                raise ValueError('Missing or invalid consideringTable')
            return data
        except Exception as e:
            logger.error(f"Failed to parse considering response: {e}")
            raise
    
    def _extract_json_array(self, text: str) -> Optional[List[Dict]]:
        """Extract JSON array from text"""
        match = re.search(r'\[\s*{.*?}\s*\]', text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0))
            except Exception as e:
                logger.error(f'JSON parse error: {e}')
                return None
        
        # Fallback: try to parse the whole text
        try:
            return json.loads(text)
        except Exception as e:
            logger.error(f'JSON parse error: {e}')
            return None
    
    def _sanitize_idea_fields(self, idea: Dict[str, Any]) -> Dict[str, Any]:
        """Sanitize and normalize idea fields"""
        # Remove source_of_inspiration if present
        idea.pop('source_of_inspiration', None)
        
        # Ensure evidence_reference is a dict and has stat+url
        evref = idea.get('evidence_reference', {})
        if not isinstance(evref, dict):
            evref = {}
        stat = evref.get('stat', '').strip() if isinstance(evref.get('stat', ''), str) else ''
        url = evref.get('url', '').strip() if isinstance(evref.get('url', ''), str) else ''
        
        # Check for valid stat and url
        if not stat or not url or url in ('N/A', 'example.com', 'http://example.com', 'https://example.com', '#'):
            logger.warning(f"evidence_reference missing or invalid: {evref}")
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
        
        # Ensure hook field is present
        if "hook" not in idea or not idea["hook"]:
            if idea.get("elevator_pitch"):
                idea["hook"] = idea["elevator_pitch"][:100] + "..." if len(idea["elevator_pitch"]) > 100 else idea["elevator_pitch"]
            elif idea.get("problem_statement"):
                idea["hook"] = idea["problem_statement"][:100] + "..." if len(idea["problem_statement"]) > 100 else idea["problem_statement"]
            else:
                idea["hook"] = "A compelling business opportunity"
        
        # Ensure all required fields are present
        required_fields = {
            "value": idea.get("elevator_pitch", "Value proposition to be defined"),
            "evidence": idea.get("evidence_reference", {}).get("title", "Market research and validation needed"),
            "differentiator": "Unique competitive advantage to be defined",
            "type": "side_hustle",
            "assumptions": idea.get("core_assumptions", []),
            "repo_usage": "AI-generated idea"
        }
        
        for field, default_value in required_fields.items():
            if field not in idea or not idea[field]:
                idea[field] = default_value
        
        return idea
    
    def _filter_idea_fields(self, idea: Dict[str, Any]) -> Dict[str, Any]:
        """Filter out unexpected fields from ideas"""
        # Define allowed fields based on your schema
        allowed_fields = {
            'title', 'hook', 'value', 'evidence', 'differentiator', 'score', 
            'mvp_effort', 'type', 'assumptions', 'evidence_reference', 'repo_usage',
            'scope_commitment', 'source_of_inspiration', 'problem_statement',
            'elevator_pitch', 'core_assumptions', 'riskiest_assumptions', 
            'generation_notes', 'idea_name', 'overall_score', 'effort_score'
        }
        return {k: v for k, v in idea.items() if k in allowed_fields}
    
    def _parse_single_idea(self, section: Optional[str]) -> Optional[Dict[str, Any]]:
        """Parse a single idea section"""
        if not section or not section.strip():
            return None
            
        # Implementation moved from app/llm.py parse_single_idea function
        # This is a simplified version - the full implementation would include
        # all the parsing logic from the original function
        idea = {
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
        
        # Basic title extraction
        lines = section.split('\n')
        for line in lines[:3]:
            line = line.strip()
            if line and len(line) > 3 and len(line) < 100:
                if not line.lower().startswith(('hook:', 'value:', 'evidence:')):
                    idea["title"] = line
                    break
        
        if not idea["title"]:
            return None
            
        return self._sanitize_idea_fields(idea)
    
    def _robust_parse_deep_dive_raw_response(self, raw_response: str) -> DeepDiveIdeaData:
        """Parse deep dive response with robust error handling"""
        if not raw_response:
            return DeepDiveIdeaData()
        
        # Remove triple backticks and whitespace
        cleaned = re.sub(r'^```json|```$', '', raw_response.strip(), flags=re.MULTILINE).strip()
        
        # Find the first JSON object
        match = re.search(r'(\{[\s\S]*?\})', cleaned)
        if match:
            json_str = match.group(1)
            try:
                data = json.loads(json_str)
                deep_dive = self._convert_old_deep_dive_format(data)
                deep_dive.raw_llm_fields = data
                return deep_dive
            except Exception as e:
                logger.error(f"Error parsing deep dive JSON: {e}")
                return DeepDiveIdeaData(raw_llm_fields={"error": str(e), "raw": raw_response})
        
        return DeepDiveIdeaData(raw_llm_fields={"error": "No JSON found", "raw": raw_response})
    
    def _convert_old_deep_dive_format(self, old_data: Dict[str, Any]) -> DeepDiveIdeaData:
        """Convert old deep dive format to new structured format"""
        try:
            # Extract scores from the old format
            signal_scores = old_data.get('Signal Score', {})
            
            def get_score(key):
                for k in signal_scores.keys():
                    if k.lower().replace('-', ' ').replace('_', ' ').strip() == key.lower().replace('-', ' ').replace('_', ' ').strip():
                        return float(signal_scores.get(k, 0))
                return 0.0
            
            # Map to new structure
            return DeepDiveIdeaData(
                raw_llm_fields=old_data
            )
            
        except Exception as e:
            logger.error(f"Error converting old deep dive format: {e}")
            return DeepDiveIdeaData(raw_llm_fields=old_data)