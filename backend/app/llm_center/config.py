"""Configuration management for LLM Center"""

import os
from typing import Dict, List, Optional, Any
from pydantic import BaseModel
from ..types.llm_types import LLMProvider


class ProviderConfig(BaseModel):
    """Configuration for a specific LLM provider"""
    api_keys: List[str]
    default_model: str
    models: Dict[str, Dict[str, Any]]
    timeout: int = 60
    max_retries: int = 3
    retry_delay: int = 3


class LLMConfig(BaseModel):
    """Central configuration for all LLM providers and settings"""
    
    default_provider: LLMProvider = LLMProvider.GROQ
    providers: Dict[LLMProvider, ProviderConfig]
    
    @classmethod
    def from_env(cls) -> "LLMConfig":
        """Create configuration from environment variables"""
        
        # Load Groq API keys
        groq_keys = []
        for k, v in os.environ.items():
            if k.startswith("GROQ_API_KEY_") and v:
                groq_keys.append(v)
        
        # Sort by number if possible
        groq_key_items = []
        for k, v in os.environ.items():
            if k.startswith("GROQ_API_KEY_") and v:
                groq_key_items.append((k, v))
        groq_key_items.sort(key=lambda x: int(x[0].split('_')[-1]) if x[0].split('_')[-1].isdigit() else x[0])
        groq_keys = [v for _, v in groq_key_items]
        
        if not groq_keys:
            raise ValueError("At least one GROQ_API_KEY_N must be set in the environment")
        
        # OpenAI keys
        openai_keys = []
        openai_key = os.environ.get("OPENAI_API_KEY")
        if openai_key:
            openai_keys.append(openai_key)
        
        # Anthropic keys  
        anthropic_keys = []
        anthropic_key = os.environ.get("ANTHROPIC_API_KEY")
        if anthropic_key:
            anthropic_keys.append(anthropic_key)
        
        providers = {
            LLMProvider.GROQ: ProviderConfig(
                api_keys=groq_keys,
                default_model="moonshotai/kimi-k2-instruct",
                models={
                    "moonshotai/kimi-k2-instruct": {"max_tokens": 3000, "context_window": 8192},
                    "llama-3.1-70b-versatile": {"max_tokens": 3000, "context_window": 8192},
                    "llama-3.1-8b-instant": {"max_tokens": 3000, "context_window": 8192},
                },
                timeout=60,
                max_retries=3,
                retry_delay=3
            )
        }
        
        if openai_keys:
            providers[LLMProvider.OPENAI] = ProviderConfig(
                api_keys=openai_keys,
                default_model="gpt-4o-mini",
                models={
                    "gpt-4o-mini": {"max_tokens": 3000, "context_window": 16384},
                    "gpt-4o": {"max_tokens": 3000, "context_window": 128000},
                },
                timeout=60,
                max_retries=3,
                retry_delay=3
            )
        
        if anthropic_keys:
            providers[LLMProvider.ANTHROPIC] = ProviderConfig(
                api_keys=anthropic_keys,
                default_model="claude-3-sonnet-20240229",
                models={
                    "claude-3-sonnet-20240229": {"max_tokens": 3000, "context_window": 200000},
                    "claude-3-haiku-20240307": {"max_tokens": 3000, "context_window": 200000},
                },
                timeout=60,
                max_retries=3,
                retry_delay=3
            )
        
        return cls(
            default_provider=LLMProvider.GROQ,
            providers=providers
        )
    
    def get_provider_config(self, provider: LLMProvider) -> ProviderConfig:
        """Get configuration for a specific provider"""
        if provider not in self.providers:
            raise ValueError(f"Provider {provider} not configured")
        return self.providers[provider]