import logging
from typing import Dict, Any
from app.llm import robust_extract_json, sanitize_idea_fields
from app.llm_guardrails import validate_llm_output
from app.db import get_db
from app.models import LLMInputLog, LLMProcessingLog
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

async def run_llm_pipeline(stage: str, context: Dict[str, Any], user: Any, reason: str, llm_func):
    """
    Orchestrate the full LLM processing pipeline:
    - Log/store input context
    - Call LLM and store raw output
    - Clean/repair output
    - Normalize fields
    - Validate with Guardrails/Pydantic
    - Log/store all steps and errors
    - Return validated output
    """
    db_gen = get_db()
    db: Session = next(db_gen)
    # 1. Log/store input context
    input_log = LLMInputLog(user_id=user.id, stage=stage, reason=reason, context_json=str(context))
    db.add(input_log)
    db.commit()
    db.refresh(input_log)
    # 2. Call LLM
    try:
        raw_output = await llm_func(context)
    except Exception as e:
        logger.error(f"[LLM_PIPELINE] LLM call failed: {e}")
        processing_log = LLMProcessingLog(input_id=input_log.id, error=str(e), step="llm_call")
        db.add(processing_log)
        db.commit()
        raise
    # 3. Log/store raw output
    input_log.raw_output = str(raw_output)
    db.commit()
    # 4. Clean/repair
    try:
        cleaned = robust_extract_json(raw_output)
        if cleaned is None:
            raise ValueError("robust_extract_json returned None")
    except Exception as e:
        logger.error(f"[LLM_PIPELINE] Cleaning/repair failed: {e}")
        processing_log = LLMProcessingLog(input_id=input_log.id, error=str(e), step="cleaning")
        db.add(processing_log)
        db.commit()
        raise
    # 5. Normalize
    try:
        normalized = sanitize_idea_fields(cleaned)
    except Exception as e:
        logger.error(f"[LLM_PIPELINE] Normalization failed: {e}")
        processing_log = LLMProcessingLog(input_id=input_log.id, error=str(e), step="normalization")
        db.add(processing_log)
        db.commit()
        raise
    # 6. Validate
    try:
        validated = validate_llm_output(stage, normalized)
    except Exception as e:
        logger.error(f"[LLM_PIPELINE] Validation failed: {e}")
        processing_log = LLMProcessingLog(input_id=input_log.id, error=str(e), step="validation", raw_output=str(raw_output))
        db.add(processing_log)
        db.commit()
        raise
    # 7. Store validated output (optional: link to idea record)
    input_log.cleaned_output = str(validated)
    db.commit()
    return validated 