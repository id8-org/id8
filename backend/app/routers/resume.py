from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
import os
import aiofiles
import uuid
import json
import re

from app.db import get_db
from app.auth import get_current_active_user
from app.schemas import UserResume
from app.models import User as UserModel, UserResume as UserResumeModel
from app.utilities import extract_text_from_resume
from app.llm_center import LLMCenter, PromptType, ProcessingContext
from app.tiers import get_tier_config, get_account_type_config
from app.json_repair_util import extract_json_from_llm_response

router = APIRouter(prefix="/resume", tags=["resume"])

# Ensure upload directory exists
UPLOAD_DIR = "uploads/resumes"
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc", ".txt"}

def is_valid_file_extension(filename: str) -> bool:
    """Check if file has valid extension"""
    return any(filename.lower().endswith(ext) for ext in ALLOWED_EXTENSIONS)

@router.post("/upload", response_model=UserResume)
async def upload_resume(
    file: UploadFile = File(...),
    current_user: UserModel = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Upload and process user resume"""
    # Validate file extension
    filename = file.filename or "uploaded_resume"
    if not is_valid_file_extension(filename):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # Check file size (max 10MB)
    if file.size and file.size > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File too large. Maximum size is 10MB"
        )
    
    # Generate unique filename
    file_extension = os.path.splitext(filename)[1]
    unique_filename = f"{current_user.id}_{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    # Save file
    try:
        async with aiofiles.open(file_path, 'wb') as f:
            content = await file.read()
            await f.write(content)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save file: {str(e)}"
        )
    
    # Check if user already has a resume
    existing_resume = db.query(UserResumeModel).filter(UserResumeModel.user_id == current_user.id).first()
    
    safe_content_type = file.content_type or "application/octet-stream"
    safe_file_size = int(len(content)) if content is not None else 0
    if existing_resume:
        # Update existing resume (use instance attributes, not class attributes)
        existing_resume.original_filename = filename  # type: ignore[assignment]
        existing_resume.file_path = file_path  # type: ignore[assignment]
        existing_resume.file_size = safe_file_size  # type: ignore[assignment]
        existing_resume.content_type = safe_content_type  # type: ignore[assignment]
        existing_resume.is_processed = False  # type: ignore[assignment]
        existing_resume.processing_error = ""  # type: ignore[assignment]
        db.commit()
        db.refresh(existing_resume)
        return existing_resume
    else:
        # Create new resume record
        db_resume = UserResumeModel(
            user_id=current_user.id,
            original_filename=str(filename),
            file_path=str(file_path),
            file_size=int(safe_file_size),
            content_type=str(safe_content_type),
            is_processed=bool(False),
            processing_error=str("")
        )  # type: ignore
        db.add(db_resume)
        db.commit()
        db.refresh(db_resume)
        return db_resume

@router.get("/", response_model=UserResume)
async def get_user_resume(
    current_user: UserModel = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get current user's resume"""
    tier = str(current_user.tier) if hasattr(current_user, 'tier') else 'free'
    account_type = str(current_user.account_type) if hasattr(current_user, 'account_type') else 'solo'
    tier_config = get_tier_config(tier)
    account_type_config = get_account_type_config(account_type)
    config = {**tier_config, **account_type_config}
    resume = db.query(UserResumeModel).filter(UserResumeModel.user_id == current_user.id).first()
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found"
        )
    return {"resume": resume, "config": config}

@router.delete("/")
async def delete_user_resume(
    current_user: UserModel = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete current user's resume"""
    resume = db.query(UserResumeModel).filter(UserResumeModel.user_id == current_user.id).first()
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found"
        )
    
    # Delete file from filesystem (use instance attribute)
    try:
        if os.path.exists(str(resume.file_path)):  # type: ignore[arg-type]
            os.remove(str(resume.file_path))  # type: ignore[arg-type]
    except Exception as e:
        # Log error but don't fail the request
        print(f"Failed to delete file {resume.file_path}: {e}")
    
    # Delete from database
    db.delete(resume)
    db.commit()
    
    return {"message": "Resume deleted successfully"}

@router.post("/process")
async def process_resume(
    current_user: UserModel = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Process uploaded resume to extract profile fields using Groq LLM"""
    resume = db.query(UserResumeModel).filter(UserResumeModel.user_id == current_user.id).first()
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found"
        )
    if not os.path.exists(str(resume.file_path)):  # type: ignore[arg-type]
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume file not found on disk"
        )
    # Extract text from resume (use instance attribute)
    resume_text = extract_text_from_resume(str(resume.file_path))  # type: ignore[arg-type]
    if not resume_text or len(resume_text) < 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not extract enough text from resume. Please upload a clearer file."
        )
    # Prepare LLM prompt
    prompt = f"""
    Extract the following fields from this resume:
    - First Name
    - Last Name
    - Location (city, state, country)
    - Background: Write a single paragraph summary of the person's experience and background, suitable for a founder profile, based on the resume. Do NOT copy any summary, objective, or about section from the resume. Instead, generate your own summary in your own words, based on the full content of the resume. Highlight relevant experience and skills.
    - Skills (as a list)
    - Education (as a list of {{degree, institution}} or a simple string)

    Resume:
    {resume_text[:6000]}

    Respond in JSON with keys: first_name, last_name, location, background, skills, education.
    """
    try:
        # Use centralized LLM center
        llm_center = LLMCenter()
        context = ProcessingContext(user_id=str(current_user.id))
        
        response = await llm_center.call_llm(
            prompt_type=PromptType.RESUME_PROCESSING,
            content=prompt,
            context=context
        )
        
        llm_response = response.content
        if not isinstance(llm_response, str):
            raise ValueError("LLM response is not a string")
        # Use the robust utility to extract JSON
        json_str = extract_json_from_llm_response(llm_response)
        data = json.loads(json_str)
        # Only return the required fields
        result = {
            'first_name': data.get('first_name', ''),
            'last_name': data.get('last_name', ''),
            'location': data.get('location', ''),
            'background': data.get('background', ''),
            'skills': data.get('skills', []),
            'education': data.get('education', []),
        }
        return { 'extracted': result }
    except Exception as e:
        # Always update instance attributes, not class attributes
        resume.is_processed = False  # type: ignore[assignment]
        resume.processing_error = f"LLM extraction failed: {e}\nRaw response: {llm_response[:500] if llm_response else ''}"  # type: ignore[assignment]
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to extract fields from resume: {e}"
        ) 