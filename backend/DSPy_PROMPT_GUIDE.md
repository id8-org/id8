# DSPy Prompt Management

This document describes the new DSPy-based prompt management system that replaced the legacy `.rail` files and pydantic-ai integration.

## Overview

All prompts are now managed through the centralized DSPy system using:
- **Jinja2 templates** in `app/prompts/templates/`  
- **PromptManager** in `app/llm_center/prompts.py`
- **DSPy modules** in `app/ai/`

## Template Structure

### Template Files Location
All prompt templates are stored in `app/prompts/templates/` with `.j2` extension:

```
app/prompts/templates/
├── idea_generation.j2    # AI idea generation prompts
├── deep_dive.j2         # Investment-grade deep dive analysis
├── considering.j2       # Idea consideration stage
├── iterating.j2         # Idea iteration and experimentation
├── closed.j2           # Idea closure and post-mortem
├── building.j2         # Building stage prompts
├── general.j2          # General-purpose prompts
└── resume_processing.j2 # Resume processing prompts
```

### Template Variables

All templates support these standard variables:

- `{{ content }}` - Main content/input from user
- `{{ context }}` - ProcessingContext object with:
  - `context.user_id` - Current user ID
  - `context.idea_id` - Current idea ID  
  - `context.repo_id` - Related repository ID
  - `context.stage` - Current processing stage
  - `context.additional_context` - Dict of extra context data

### Example Template Usage

```jinja2
You are analyzing the following idea:

{{ content }}

{% if context and context.additional_context %}
Additional Context:
{% for key, value in context.additional_context.items() %}
- {{ key }}: {{ value }}
{% endfor %}
{% endif %}

Return analysis as JSON...
```

## Using PromptManager

### Basic Usage

```python
from app.llm_center.prompts import PromptManager
from app.types.llm_types import PromptType, ProcessingContext

# Initialize prompt manager
pm = PromptManager()

# Create context
context = ProcessingContext(
    user_id="user123",
    idea_id="idea456", 
    additional_context={"focus": "B2B SaaS"}
)

# Render prompt
prompt = pm.render_prompt(
    prompt_type=PromptType.IDEA_GENERATION,
    context=context,
    content="Generate fintech startup ideas"
)
```

### Prompt Types

Available prompt types in `PromptType` enum:

- `IDEA_GENERATION` - Generate startup ideas
- `DEEP_DIVE` - Investment analysis and deep dives
- `ITERATING` - Iteration and experimentation  
- `CONSIDERING` - Idea consideration analysis
- `BUILDING` - Building stage prompts
- `CLOSED` - Idea closure and post-mortem
- `RESUME_PROCESSING` - Resume/profile processing
- `GENERAL_LLM` - General-purpose LLM calls
- `PITCH_GENERATION` - Pitch generation
- `PERSONALIZED_IDEAS` - Personalized idea generation

## Migration from Legacy System

### What Changed

1. **Removed `.rail` files** - All prompts converted to Jinja2 templates
2. **Removed pydantic-ai** - Replaced with DSPy for LLM orchestration  
3. **Removed prompt_loader.py** - Replaced with PromptManager
4. **Centralized prompts.py** - Hardcoded prompts moved to templates

### Template Migration

Each `.rail` file was converted to preserve the full prompt content:

- `idea_generation.rail` → `idea_generation.j2`
- `deep_dive.rail` → `deep_dive.j2`  
- `considering.rail` → `considering.j2`
- `iterating.rail` → `iterating.j2`
- `closed.rail` → `closed.j2`

All detailed instructions, validation rules, and output formatting from the original `.rail` files are preserved in the new templates.

## Best Practices

1. **Use PromptManager** for all prompt rendering
2. **Template variables** should use Jinja2 syntax
3. **Context data** should be passed through ProcessingContext
4. **Test templates** with different context values
5. **Maintain consistency** with existing template patterns

## DSPy Integration

The system integrates with DSPy through:

- **LLMCenter** - Central orchestration of LLM calls
- **DSPy modules** - Structured prompt handling and response parsing
- **Legacy wrappers** - Backwards compatibility during migration

For advanced DSPy usage, see the modules in `app/ai/` and documentation in `app/llm_center/`.