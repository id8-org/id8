# LLM Center Migration Guide

## Overview

All LLM functionality has been centralized into the `app.llm_center` module for better organization, maintainability, and extensibility. This guide explains how to migrate from the old scattered LLM system to the new centralized system.

## What Changed

### Before (Scattered)
- `app.llm.py` - Main LLM functions mixed with utilities
- `app.llm_orchestration.py` - Basic retry logic
- Direct Groq API calls throughout codebase
- Inconsistent prompt handling
- Duplicate validation and parsing logic

### After (Centralized)
- `app.llm_center/` - Unified LLM orchestration module
- Single configuration source
- Pluggable provider system (Groq, OpenAI, Anthropic)
- Centralized prompt templates
- Consistent response parsing and validation
- Comprehensive logging and monitoring

## New Architecture

```
app/llm_center/
├── __init__.py          # Main exports
├── core.py              # LLMCenter - main orchestration class
├── providers.py         # Provider implementations (Groq, OpenAI, etc.)
├── config.py            # Configuration management
├── prompts.py           # Prompt template system
├── parsers.py           # Response parsing and validation
├── types.py             # Type definitions
└── legacy_wrappers.py   # Backward compatibility wrappers
```

## Migration Paths

### Option 1: Use Legacy Wrappers (Immediate)
All existing code continues to work via compatibility wrappers:

```python
# Old way (still works)
from app.llm import call_groq, generate_idea_pitches

# Uses legacy wrappers automatically
response = await call_groq("Generate ideas about AI")
ideas = await generate_idea_pitches(prompt)
```

### Option 2: Migrate to Centralized System (Recommended)
Update to use the new centralized system:

```python
# New way (recommended)
from app.llm_center import LLMCenter, PromptType, ProcessingContext

llm_center = LLMCenter()
context = ProcessingContext(user_id="123", stage="idea_generation")

# Direct LLM call
response = await llm_center.call_llm(
    prompt_type=PromptType.GENERAL_LLM,
    content="Generate ideas about AI",
    context=context
)

# Template-based call with parsing
parsed_response = await llm_center.call_template_and_parse(
    prompt_type=PromptType.IDEA_GENERATION,
    context=context,
    template_vars={"topic": "AI tools"}
)
```

## Migration Examples

### Basic LLM Calls
```python
# Old
from app.llm import call_groq
response = await call_groq("Your prompt here")

# New
from app.llm_center import LLMCenter, PromptType
llm_center = LLMCenter()
response = await llm_center.call_llm(
    prompt_type=PromptType.GENERAL_LLM,
    content="Your prompt here"
)
```

### Idea Generation
```python
# Old
from app.llm import generate_idea_pitches
ideas = await generate_idea_pitches(prompt, user_context)

# New
from app.llm_center import LLMCenter, PromptType, ProcessingContext
llm_center = LLMCenter()
context = ProcessingContext(additional_context=user_context)
parsed_response = await llm_center.call_template_and_parse(
    prompt_type=PromptType.IDEA_GENERATION,
    context=context,
    template_vars={"content": prompt}
)
ideas = parsed_response.parsed_data.get("ideas", [])
```

### AI Services
```python
# Old
class MyService(AIService):
    def process_stage(self, idea, user, **kwargs):
        # Direct LLM calls
        pass

# New
class MyService(AIService):
    async def process_stage(self, idea, user, **kwargs):
        # Use centralized LLM via base class
        response = await self.call_llm_for_stage(
            prompt_type=PromptType.CONSIDERING,
            content=f"Analyze: {idea.title}",
            user=user,
            idea=idea
        )
        return {"analysis": response.content}
```

## Configuration

### Environment Variables
The system uses the same environment variables but through centralized configuration:

```bash
# Groq API keys (round-robin)
GROQ_API_KEY_1=your_key_1
GROQ_API_KEY_2=your_key_2

# Optional: OpenAI
OPENAI_API_KEY=your_openai_key

# Optional: Anthropic
ANTHROPIC_API_KEY=your_anthropic_key
```

### Configuration in Code
```python
from app.llm_center import LLMConfig

# Load from environment
config = LLMConfig.from_env()

# Customize configuration
config.default_provider = LLMProvider.OPENAI
```

## Prompt Templates

### Creating Templates
Templates are stored in `app/prompts/templates/` with `.j2` extension:

```jinja2
<!-- app/prompts/templates/my_template.j2 -->
Analyze the following idea: {{ content }}

{% if context.user_id %}
User ID: {{ context.user_id }}
{% endif %}

Additional context:
{% for key, value in context.additional_context.items() %}
- {{ key }}: {{ value }}
{% endfor %}
```

### Using Templates
```python
from app.llm_center import LLMCenter, PromptType, ProcessingContext

llm_center = LLMCenter()
context = ProcessingContext(
    user_id="123",
    additional_context={"industry": "fintech"}
)

response = await llm_center.call_llm_with_template(
    prompt_type=PromptType.IDEA_GENERATION,
    context=context,
    template_vars={"content": "Generate fintech ideas"}
)
```

## Benefits of Migration

1. **Centralized Configuration** - Single place to manage all LLM settings
2. **Provider Flexibility** - Easy to switch between Groq, OpenAI, Anthropic
3. **Better Error Handling** - Centralized retry logic and error recovery
4. **Consistent Logging** - All LLM interactions logged consistently
5. **Template System** - Reusable prompt templates with variable substitution
6. **Type Safety** - Strong typing for all LLM operations
7. **Extensibility** - Easy to add new providers or prompt types

## Deprecation Timeline

1. **Phase 1** (Current) - Legacy wrappers provide full backward compatibility
2. **Phase 2** (Next release) - Deprecation warnings added to old imports
3. **Phase 3** (Future) - Legacy wrappers marked for removal
4. **Phase 4** (Later) - Old `app.llm` module removed

## Getting Help

- Check the `app.llm_center.legacy_wrappers` module for compatibility functions
- Review the prompt templates in `app/prompts/templates/`
- Look at updated routers and services for migration examples
- Test your changes with the centralized system before removing legacy imports

## Best Practices

1. **Use the centralized system** for new code
2. **Migrate incrementally** - start with new features, then update existing code
3. **Leverage templates** for consistent prompt generation
4. **Use proper context** - include user, idea, and stage information
5. **Handle errors gracefully** - the centralized system provides better error recovery
6. **Monitor LLM usage** - centralized logging makes this easier