"""AI Configuration and utilities"""
import os
from typing import Optional
import dspy
from app.core.config import settings

# Configure DSPy LM
def get_dspy_lm() -> dspy.LM:
    """Initialize and return the DSPy Language Model"""
    # Default to OpenAI, but allow configuration via environment
    model_name = os.getenv("AI_MODEL", "gpt-4o-mini")
    api_key = os.getenv("OPENAI_API_KEY")
    
    if not api_key:
        # For development, return a dummy LM that logs instead of making API calls
        return DummyLM()
    
    return dspy.LM(model=model_name, api_key=api_key)

class DummyLM(dspy.LM):
    """Dummy LM for development without real API calls"""
    
    def __init__(self):
        super().__init__(model="dummy", api_key="dummy")
    
    def __call__(self, prompt=None, messages=None, **kwargs):
        # Log the prompt and return a dummy response
        if messages:
            print(f"[DUMMY LM] Messages: {messages}")
        elif prompt:
            print(f"[DUMMY LM] Prompt: {prompt}")
        
        return "This is a dummy AI response for development purposes. The analysis has been completed successfully."
    
    def generate(self, prompt=None, messages=None, **kwargs):
        """Generate method for DSPy compatibility"""
        response = self(prompt=prompt, messages=messages, **kwargs)
        return [response]
    
    def basic_request(self, prompt=None, messages=None, **kwargs):
        """Basic request method for DSPy compatibility"""
        response = self(prompt=prompt, messages=messages, **kwargs)
        return [{"text": response}]

# Global LM instance
lm = get_dspy_lm()
dspy.configure(lm=lm)