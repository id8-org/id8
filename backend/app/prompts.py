"""
prompts.py

This file previously contained hardcoded prompt templates.
All prompts have been migrated to DSPy and Jinja2 templates.
Use PromptManager from app.llm_center.prompts for all prompt handling.
"""

# This file is kept for backwards compatibility
# All prompt functionality has been moved to:
# - app/llm_center/prompts.py (PromptManager)
# - app/prompts/templates/*.j2 (Jinja2 templates)
# - DSPy modules in app/ai/

# Legacy constants that may still be referenced (can be removed once confirmed unused)
GENERIC_SKILLS_SUMMARY = """
You are an experienced entrepreneur and technologist with expertise in:
- Product development and MVP creation
- Business strategy and market analysis
- Technology implementation and scaling
- User research and product-market fit
- Startup operations and growth
- A preference for practical, fundable business ideas
"""