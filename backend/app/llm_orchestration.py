from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
import logging
from app.llm_guardrails import validate_llm_output
# import asyncio # Remove

logger = logging.getLogger(__name__)

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=2, min=2, max=10),
    retry=retry_if_exception_type(ValueError),
    reraise=True,
)
def call_llm_with_validation(stage: str, prompt: str, llm_func):
    logger.info(f"Calling LLM for stage '{stage}' with retry/validation.")
    llm_output = llm_func(prompt)
    validated = validate_llm_output(stage, llm_output)
    logger.info(f"LLM output for stage '{stage}' passed validation.")
    return validated

# async def call_llm_and_broadcast(stage: str, prompt: str, llm_func): # Remove
#     try:
#         validated = call_llm_with_validation(stage, prompt, llm_func)
#         await ws_manager.broadcast({ # Remove
#             "stage": stage,
#             "status": "completed",
#             "data": validated,
#         })
#         return validated
#     except Exception as e:
#         await ws_manager.broadcast({ # Remove
#             "stage": stage,
#             "status": "error",
#             "error": str(e),
#         })
#         raise