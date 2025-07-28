"""Type definitions for the LLM Center"""

from enum import Enum
from typing import Dict, Any, Optional, List, Union
from pydantic import BaseModel
from datetime import datetime


class LLMProvider(str, Enum):
    """Supported LLM providers"""
    GROQ = "groq"
    OPENAI = "openai"
    ANTHROPIC = "anthropic"


class PromptType(str, Enum):
    """Types of prompts supported by the system"""
    IDEA_GENERATION = "idea_generation"
    DEEP_DIVE = "deep_dive"
    ITERATING = "iterating"
    CONSIDERING = "considering"
    BUILDING = "building"
    CLOSED = "closed"
    RESUME_PROCESSING = "resume_processing"
    GENERAL_LLM = "general_llm"
    PITCH_GENERATION = "pitch_generation"
    PERSONALIZED_IDEAS = "personalized_ideas"


class ProcessingContext(BaseModel):
    """Context information for LLM processing"""
    user_id: Optional[str] = None
    idea_id: Optional[str] = None
    repo_id: Optional[str] = None
    stage: Optional[str] = None
    additional_context: Dict[str, Any] = {}


class LLMRequest(BaseModel):
    """Request structure for LLM calls"""
    prompt_type: PromptType
    content: str
    context: ProcessingContext = ProcessingContext()
    model: Optional[str] = None
    provider: Optional[LLMProvider] = None
    temperature: float = 0.7
    max_tokens: int = 3000
    metadata: Dict[str, Any] = {}


class LLMResponse(BaseModel):
    """Response structure from LLM calls"""
    content: str
    prompt_type: PromptType
    provider: LLMProvider
    model: str
    processing_time_ms: Optional[int] = None
    tokens_used: Optional[int] = None
    cost: Optional[float] = None
    created_at: datetime
    metadata: Dict[str, Any] = {}
    raw_response: Dict[str, Any] = {}


class ParsedResponse(BaseModel):
    """Parsed and validated response from LLM"""
    raw_response: LLMResponse
    parsed_data: Dict[str, Any]
    validation_errors: List[str] = []
    success: bool = True