from fastapi import APIRouter, HTTPException, Request
from app.llm import call_groq
import logging

router = APIRouter()

@router.post("/api/llm")
async def llm_endpoint(request: Request):
    try:
        data = await request.json()
        prompt = data.get("prompt")
        if not prompt:
            raise HTTPException(status_code=400, detail="Missing prompt.")
        response = await call_groq(prompt)
        return {"result": response}
    except Exception as e:
        logging.error(f"[LLM API] Error: {e}")
        raise HTTPException(status_code=500, detail=f"LLM call failed: {str(e)}") 