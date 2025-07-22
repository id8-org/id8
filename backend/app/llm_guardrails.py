from guardrails import Guard
import json
from app.schemas import DeepDiveStage, IteratingStage, ConsideringIdeaData, ClosedStage

def validate_llm_output(stage: str, llm_output: str | dict) -> dict:
    """
    Validate LLM output for a given stage using the appropriate Pydantic model and Guardrails.
    Accepts either a JSON string or a dict as llm_output.
    """
    model_map = {
        "deep_dive": DeepDiveStage,
        "iterating": IteratingStage,
        "considering": ConsideringIdeaData,
        "closed": ClosedStage,
        # Add more mappings as needed for suggested, etc.
    }
    Model = model_map.get(stage)
    if Model is None:
        raise ValueError(f"No validation model defined for stage '{stage}'")
    if isinstance(llm_output, dict):
        llm_output = json.dumps(llm_output)
    elif not isinstance(llm_output, str):
        raise ValueError("llm_output must be a dict or JSON string")
    guard = Guard.for_pydantic(output_class=Model)
    validated = guard.parse(llm_output)
    return validated.dict()