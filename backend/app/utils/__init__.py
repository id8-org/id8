"""Unified utilities for the Idea8 backend application"""

# Note: Import from specific modules to avoid circular dependencies
# Example: from app.utils.business_utils import BUSINESS_VERTICAL_GROUPS
# Example: from app.utils.context_utils import build_user_context
# Example: from app.utils.json_repair_util import repair_json_with_py

# This module provides utility functions organized by category:
# - business_utils: Business-related constants and utilities
# - context_utils: User context building and assembly utilities  
# - json_repair_util: JSON parsing and repair utilities
# - prompt_loader: Prompt loading utilities

__all__ = [
    "business_utils",
    "context_utils", 
    "json_repair_util",
    "prompt_loader"
]