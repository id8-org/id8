from fastapi import APIRouter, HTTPException, Request
from app.llm_center import LLMCenter, PromptType, ProcessingContext
import logging

router = APIRouter()

@router.post("/api/llm")
async def llm_endpoint(request: Request):
    try:
        data = await request.json()
        prompt = data.get("prompt")
        if not prompt:
            raise HTTPException(status_code=400, detail="Missing prompt.")
        
        # Use the centralized LLM center
        llm_center = LLMCenter()
        context = ProcessingContext()
        
        response = await llm_center.call_llm(
            prompt_type=PromptType.GENERAL_LLM,
            content=prompt,
            context=context
        )
        
        return {"result": response.content}
    except Exception as e:
        logging.error(f"[LLM API] Error: {e}")
        raise HTTPException(status_code=500, detail=f"LLM call failed: {str(e)}") 