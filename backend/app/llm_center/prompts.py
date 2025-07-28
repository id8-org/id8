"""Prompt management and template handling"""

import os
from typing import Dict, Any, Optional
from jinja2 import Template, Environment, FileSystemLoader
from .types import PromptType, ProcessingContext


class PromptManager:
    """Central prompt management system"""
    
    def __init__(self, prompt_dir: Optional[str] = None):
        """Initialize the prompt manager
        
        Args:
            prompt_dir: Directory containing prompt templates. 
                       If None, uses app/prompts/ by default.
        """
        if prompt_dir is None:
            # Default to app/prompts/templates/ directory
            current_dir = os.path.dirname(os.path.abspath(__file__))
            prompt_dir = os.path.join(os.path.dirname(current_dir), "prompts", "templates")
        
        self.prompt_dir = prompt_dir
        self.env = Environment(loader=FileSystemLoader(prompt_dir))
        self._prompt_cache: Dict[str, Template] = {}
    
    def render_prompt(
        self, 
        prompt_type: PromptType, 
        context: ProcessingContext,
        **kwargs
    ) -> str:
        """Render a prompt template with the given context
        
        Args:
            prompt_type: Type of prompt to render
            context: Processing context with user, idea, repo info
            **kwargs: Additional template variables
            
        Returns:
            Rendered prompt string
        """
        template_name = self._get_template_name(prompt_type)
        template = self._load_template(template_name)
        
        # Prepare template variables
        template_vars = {
            'context': context,
            'user_id': context.user_id,
            'idea_id': context.idea_id,
            'repo_id': context.repo_id,
            'stage': context.stage,
            **context.additional_context,
            **kwargs
        }
        
        return template.render(**template_vars)
    
    def _get_template_name(self, prompt_type: PromptType) -> str:
        """Map prompt type to template file name"""
        template_mapping = {
            PromptType.IDEA_GENERATION: "idea_generation.j2",
            PromptType.DEEP_DIVE: "deep_dive.j2", 
            PromptType.ITERATING: "iterating.j2",
            PromptType.CONSIDERING: "considering.j2",
            PromptType.BUILDING: "building.j2",
            PromptType.RESUME_PROCESSING: "resume_processing.j2",
            PromptType.PITCH_GENERATION: "pitch_generation.j2",
            PromptType.PERSONALIZED_IDEAS: "personalized_ideas.j2",
            PromptType.GENERAL_LLM: "general.j2"
        }
        
        return template_mapping.get(prompt_type, "general.j2")
    
    def _load_template(self, template_name: str) -> Template:
        """Load and cache a template"""
        if template_name not in self._prompt_cache:
            try:
                self._prompt_cache[template_name] = self.env.get_template(template_name)
            except Exception:
                # Fallback to a basic template if the specific one doesn't exist
                basic_template = Template("{{ content }}")
                self._prompt_cache[template_name] = basic_template
        
        return self._prompt_cache[template_name]
    
    def create_inline_prompt(self, template_str: str, **kwargs) -> str:
        """Create and render an inline prompt template
        
        Args:
            template_str: Template string with Jinja2 syntax
            **kwargs: Template variables
            
        Returns:
            Rendered prompt string
        """
        template = Template(template_str)
        return template.render(**kwargs)


def load_prompt_from_file(prompt_path: str) -> str:
    """Load a prompt from a file (backwards compatibility function)"""
    try:
        with open(prompt_path, 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        return "Prompt template not found"