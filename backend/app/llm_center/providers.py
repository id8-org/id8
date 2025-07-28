"""LLM Provider implementations"""

import httpx
import asyncio
import logging
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from datetime import datetime

from ..types.llm_types import LLMRequest, LLMResponse, LLMProvider
from .config import ProviderConfig


logger = logging.getLogger(__name__)


class BaseLLMProvider(ABC):
    """Base class for all LLM providers"""
    
    def __init__(self, config: ProviderConfig):
        self.config = config
        self._key_counter = 0
        self._key_lock = asyncio.Lock()
    
    def _get_next_key(self) -> str:
        """Get the next API key in round-robin fashion"""
        key = self.config.api_keys[self._key_counter % len(self.config.api_keys)]
        self._key_counter += 1
        return key
    
    @abstractmethod
    async def call_llm(self, request: LLMRequest) -> LLMResponse:
        """Make an LLM call with the given request"""
        pass


class GroqProvider(BaseLLMProvider):
    """Groq LLM provider implementation"""
    
    async def call_llm(self, request: LLMRequest) -> LLMResponse:
        """Call Groq API with retry logic and round-robin keys"""
        
        model = request.model or self.config.default_model
        start_time = datetime.now()
        
        logger.info(f"Calling Groq API with model={model}")
        logger.debug(f"Prompt length: {len(request.content)} characters")
        logger.debug(f"First 200 chars of prompt: {request.content[:200]}...")
        
        for attempt in range(1, self.config.max_retries + 1):
            async with self._key_lock:
                api_key = self._get_next_key()
                key_index = (self._key_counter - 1) % len(self.config.api_keys)
            
            logger.info(f"Attempt {attempt} - Using GROQ_API_KEY_{key_index+1}: length={len(api_key)}, last4={api_key[-4:]}")
            
            try:
                async with httpx.AsyncClient(timeout=self.config.timeout) as client:
                    response = await client.post(
                        "https://api.groq.com/openai/v1/chat/completions",
                        json={
                            "model": model,
                            "messages": [{"role": "user", "content": request.content}],
                            "temperature": request.temperature,
                            "max_tokens": request.max_tokens
                        },
                        headers={"Authorization": f"Bearer {api_key}"}
                    )
                    
                    logger.info(f"Response status: {response.status_code}")
                    
                    if response.status_code == 429:
                        retry_after = int(float(response.headers.get('retry-after', 10)))
                        logger.warning(f"Rate limited. Sleeping for {retry_after} seconds before retrying...")
                        await asyncio.sleep(retry_after)
                        continue
                    
                    response.raise_for_status()
                    result = response.json()
                    
                    content = result["choices"][0]["message"]["content"]
                    processing_time = int((datetime.now() - start_time).total_seconds() * 1000)
                    
                    logger.info(f"Groq API call succeeded. Processing time: {processing_time}ms")
                    logger.debug(f"First 200 chars of response: {content[:200]}...")
                    
                    return LLMResponse(
                        content=content,
                        prompt_type=request.prompt_type,
                        provider=LLMProvider.GROQ,
                        model=model,
                        processing_time_ms=processing_time,
                        tokens_used=result.get("usage", {}).get("total_tokens"),
                        created_at=start_time,
                        metadata=request.metadata,
                        raw_response=result
                    )
                    
            except (httpx.ReadTimeout, httpx.ConnectTimeout, httpx.RequestError) as e:
                logger.warning(f"Error in Groq call (attempt {attempt}): {e}")
                if attempt < self.config.max_retries:
                    logger.info(f"Retrying in {self.config.retry_delay} seconds...")
                    await asyncio.sleep(self.config.retry_delay)
                else:
                    logger.error(f"All {self.config.max_retries} attempts failed.")
                    raise
            except Exception as e:
                logger.error(f"Non-retryable error in Groq call: {e}")
                raise


class OpenAIProvider(BaseLLMProvider):
    """OpenAI LLM provider implementation"""
    
    async def call_llm(self, request: LLMRequest) -> LLMResponse:
        """Call OpenAI API"""
        # Implementation would go here for OpenAI
        # For now, raise NotImplementedError
        raise NotImplementedError("OpenAI provider not yet implemented")


class AnthropicProvider(BaseLLMProvider):
    """Anthropic LLM provider implementation"""
    
    async def call_llm(self, request: LLMRequest) -> LLMResponse:
        """Call Anthropic API"""
        # Implementation would go here for Anthropic
        # For now, raise NotImplementedError
        raise NotImplementedError("Anthropic provider not yet implemented")


# Provider registry
PROVIDER_REGISTRY = {
    LLMProvider.GROQ: GroqProvider,
    LLMProvider.OPENAI: OpenAIProvider,
    LLMProvider.ANTHROPIC: AnthropicProvider,
}