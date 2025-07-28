"""Core LLM Center - Main orchestration interface"""

import logging
from typing import Dict, Any, Optional, List
from sqlmodel import Session

from .types import (
    LLMRequest, LLMResponse, ParsedResponse, 
    PromptType, LLMProvider, ProcessingContext
)
from .config import LLMConfig
from .providers import PROVIDER_REGISTRY, BaseLLMProvider
from .parsers import ResponseParser
from .prompts import PromptManager


logger = logging.getLogger(__name__)


class LLMCenter:
    """Central orchestration service for all LLM interactions"""
    
    def __init__(self, config: Optional[LLMConfig] = None, db_session: Optional[Session] = None):
        """Initialize the LLM Center
        
        Args:
            config: LLM configuration. If None, loads from environment.
            db_session: Database session for logging interactions
        """
        self.config = config or LLMConfig.from_env()
        self.db_session = db_session
        self.providers: Dict[LLMProvider, BaseLLMProvider] = {}
        self.parser = ResponseParser()
        self.prompt_manager = PromptManager()
        
        # Initialize providers
        for provider_type, provider_config in self.config.providers.items():
            provider_class = PROVIDER_REGISTRY[provider_type]
            self.providers[provider_type] = provider_class(provider_config)
    
    async def call_llm(
        self,
        prompt_type: PromptType,
        content: str,
        context: Optional[ProcessingContext] = None,
        provider: Optional[LLMProvider] = None,
        model: Optional[str] = None,
        **kwargs
    ) -> LLMResponse:
        """Make an LLM call
        
        Args:
            prompt_type: Type of prompt being sent
            content: Prompt content 
            context: Processing context
            provider: LLM provider to use (defaults to configured default)
            model: Model to use (defaults to provider default)
            **kwargs: Additional parameters for the LLM call
            
        Returns:
            LLM response
        """
        context = context or ProcessingContext()
        provider = provider or self.config.default_provider
        
        if provider not in self.providers:
            raise ValueError(f"Provider {provider} not available")
        
        request = LLMRequest(
            prompt_type=prompt_type,
            content=content,
            context=context,
            provider=provider,
            model=model,
            **kwargs
        )
        
        logger.info(f"Making LLM call: {prompt_type} via {provider}")
        
        try:
            response = await self.providers[provider].call_llm(request)
            
            # Log to database if session provided
            if self.db_session and context.user_id:
                self._log_llm_interaction(request, response, context)
            
            return response
            
        except Exception as e:
            logger.error(f"LLM call failed: {e}")
            if self.db_session and context.user_id:
                self._log_llm_interaction(request, None, context, error=str(e))
            raise
    
    async def call_llm_with_template(
        self,
        prompt_type: PromptType,
        context: ProcessingContext,
        template_vars: Optional[Dict[str, Any]] = None,
        provider: Optional[LLMProvider] = None,
        model: Optional[str] = None,
        **kwargs
    ) -> LLMResponse:
        """Make an LLM call using a prompt template
        
        Args:
            prompt_type: Type of prompt template to use
            context: Processing context
            template_vars: Variables for template rendering
            provider: LLM provider to use
            model: Model to use
            **kwargs: Additional LLM parameters
            
        Returns:
            LLM response
        """
        template_vars = template_vars or {}
        
        # Render the prompt using the template
        prompt_content = self.prompt_manager.render_prompt(
            prompt_type=prompt_type,
            context=context,
            **template_vars
        )
        
        return await self.call_llm(
            prompt_type=prompt_type,
            content=prompt_content,
            context=context,
            provider=provider,
            model=model,
            **kwargs
        )
    
    async def call_and_parse(
        self,
        prompt_type: PromptType,
        content: str,
        context: Optional[ProcessingContext] = None,
        provider: Optional[LLMProvider] = None,
        model: Optional[str] = None,
        **kwargs
    ) -> ParsedResponse:
        """Make an LLM call and parse the response
        
        Args:
            prompt_type: Type of prompt being sent
            content: Prompt content
            context: Processing context
            provider: LLM provider to use
            model: Model to use
            **kwargs: Additional LLM parameters
            
        Returns:
            Parsed response with structured data
        """
        response = await self.call_llm(
            prompt_type=prompt_type,
            content=content,
            context=context,
            provider=provider,
            model=model,
            **kwargs
        )
        
        return self.parser.parse_response(response)
    
    async def call_template_and_parse(
        self,
        prompt_type: PromptType,
        context: ProcessingContext,
        template_vars: Optional[Dict[str, Any]] = None,
        provider: Optional[LLMProvider] = None,
        model: Optional[str] = None,
        **kwargs
    ) -> ParsedResponse:
        """Make an LLM call with template and parse the response
        
        Args:
            prompt_type: Type of prompt template to use
            context: Processing context
            template_vars: Variables for template rendering
            provider: LLM provider to use
            model: Model to use
            **kwargs: Additional LLM parameters
            
        Returns:
            Parsed response with structured data
        """
        response = await self.call_llm_with_template(
            prompt_type=prompt_type,
            context=context,
            template_vars=template_vars,
            provider=provider,
            model=model,
            **kwargs
        )
        
        return self.parser.parse_response(response)
    
    def _log_llm_interaction(
        self,
        request: LLMRequest,
        response: Optional[LLMResponse],
        context: ProcessingContext,
        error: Optional[str] = None
    ):
        """Log LLM interaction to database"""
        try:
            from ..models import LLMInputLog, LLMProcessingLog, LLMInputLogCreate, LLMProcessingLogCreate
            import uuid
            
            # Create input log
            input_log_data = LLMInputLogCreate(
                input_text=request.content,
                input_type=request.prompt_type.value,
                model_name=request.model or "unknown",
                parameters="{}",
                context="{}"
            )
            
            input_log = LLMInputLog.model_validate(
                input_log_data,
                update={"user_id": context.user_id, "session_id": str(uuid.uuid4())}
            )
            self.db_session.add(input_log)
            self.db_session.flush()
            
            # Create processing log
            processing_log_data = LLMProcessingLogCreate(
                output_text=response.content if response else None,
                status="completed" if response else "error",
                error_message=error,
                processing_time_ms=response.processing_time_ms if response else None,
                tokens_used=response.tokens_used if response else None,
                cost=response.cost if response else None
            )
            
            processing_log = LLMProcessingLog.model_validate(
                processing_log_data,
                update={"input_log_id": input_log.id}
            )
            self.db_session.add(processing_log)
            self.db_session.commit()
            
        except Exception as e:
            logger.error(f"Failed to log LLM interaction: {e}")
            # Don't let logging errors break the main flow


# Global instance (will be initialized on first import)
_llm_center: Optional[LLMCenter] = None


def get_llm_center(db_session: Optional[Session] = None) -> LLMCenter:
    """Get the global LLM Center instance"""
    global _llm_center
    if _llm_center is None:
        _llm_center = LLMCenter(db_session=db_session)
    elif db_session and not _llm_center.db_session:
        _llm_center.db_session = db_session
    return _llm_center