from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta, datetime
from fastapi.responses import RedirectResponse, JSONResponse
import os

from app.db import get_db
from app.auth import (
    get_password_hash, 
    authenticate_user, 
    create_access_token, 
    get_current_active_user,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
from app.types import (
    UserRegister, 
    Token, 
    User, 
    UserProfile,
    UserProfileCreate,
    UserProfileUpdate,
    OnboardingStep1,
    OnboardingStep2,
    OnboardingStep3,
    OnboardingStep4,
    OnboardingStep5,
    GoogleAuthRequest,
    GoogleCodeRequest,
    UserProfileResponse,
    ProfileQnACreate,
    ProfileQnAOut
)
from app.models import User as UserModel, UserProfile as UserProfileModel, Idea, Team, Invite, ProfileQnA, UserResume
from app.google_auth import authenticate_google_user, authenticate_google_user_with_code
import logging
from app.tiers import get_tier_config, get_account_type_config
from app.services.idea_service import seed_user_idea_if_needed, ask_llm_with_context
from app.utils.context_utils import context_profile
# Removed import of generate_profile_qna from app.llm (no longer exists)
from app.services.github_oauth import get_github_access_token, get_github_user_info

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["authentication"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET")
GITHUB_OAUTH_REDIRECT_URI = os.getenv("GITHUB_OAUTH_REDIRECT_URI", "http://localhost:8000/auth/github/callback")
GITHUB_OAUTH_SCOPE = "read:user user:email repo"

@router.post("/register", response_model=Token)
async def register(user_data: UserRegister, db: Session = Depends(get_db)):
    """Register a new user with email and password"""
    # Check if user already exists
    existing_user = db.query(UserModel).filter(UserModel.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    new_user = UserModel(
        email=user_data.email,
        password_hash=hashed_password,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        oauth_provider='email',
        is_verified=False,
        is_active=True
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # --- Idea seeding removed: No ideas are created for new users at registration ---
    # (If you want to seed after onboarding, move logic to onboarding_complete)
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": new_user.id}, expires_delta=access_token_expires
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user_id=new_user.id
    )

@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Login with email and password"""
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.id}, expires_delta=access_token_expires
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user_id=user.id
    )

@router.post("/google", response_model=Token)
async def google_auth(auth_request: GoogleAuthRequest, db: Session = Depends(get_db)):
    """Authenticate with Google OAuth using ID token"""
    try:
        user = await authenticate_google_user(db, auth_request.id_token)
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.id}, expires_delta=access_token_expires
        )
        return Token(
            access_token=access_token,
            token_type="bearer",
            user_id=user.id
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        logger.error(f"Google authentication error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication failed"
        )

@router.post("/google/code", response_model=Token)
async def google_auth_with_code(auth_request: GoogleCodeRequest, db: Session = Depends(get_db)):
    """Authenticate with Google OAuth using authorization code"""
    try:
        user = await authenticate_google_user_with_code(db, auth_request.code)
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.id}, expires_delta=access_token_expires
        )
        return Token(
            access_token=access_token,
            token_type="bearer",
            user_id=user.id
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        logger.error(f"Google authentication error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication failed"
        )

@router.get("/me", response_model=User)
async def get_current_user_info(
    current_user: UserModel = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    tier_config = get_tier_config(str(current_user.tier))
    account_type_config = get_account_type_config(str(current_user.account_type))
    config = {**tier_config, **account_type_config}
    user_dict = current_user.__dict__.copy()
    user_dict["tier"] = current_user.tier
    user_dict["account_type"] = current_user.account_type
    user_dict["config"] = config

    # Attach profile if present
    profile = db.query(UserProfileModel).filter(UserProfileModel.user_id == current_user.id).first()
    user_dict["profile"] = profile

    # Add onboarding_required field
    user_dict["onboarding_required"] = not profile or not is_profile_complete(profile)

    return user_dict

@router.get("/profile", response_model=UserProfileResponse)
async def get_user_profile(
    current_user: UserModel = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get current user's profile, including resume info and always returning arrays for business models/verticals."""
    profile = db.query(UserProfileModel).filter(UserProfileModel.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )
    # Always return arrays for these fields
    if profile.preferred_business_models is None:
        setattr(profile, 'preferred_business_models', [])
    if profile.verticals is None:
        setattr(profile, 'verticals', [])
    # Attach resume info if present
    resume = db.query(UserResume).filter(UserResume.user_id == str(current_user.id)).first()
    resume_info = None
    if resume:
        resume_info = {
            "file_url": f"/uploads/resumes/{resume.file_path.split('/')[-1]}",
            "original_filename": resume.original_filename,
            "file_size": resume.file_size,
            "content_type": resume.content_type,
            "uploaded_at": resume.created_at.isoformat() if hasattr(resume, 'created_at') else None
        }
    # Build config from tier and account type
    tier_config = get_tier_config(str(current_user.tier))
    account_type_config = get_account_type_config(str(current_user.account_type))
    config = {**tier_config, **account_type_config}
    profile_dict = profile.__dict__.copy()
    profile_dict['resume'] = resume_info
    return {
        "profile": profile_dict,
        "tier": current_user.tier,
        "account_type": current_user.account_type,
        "config": config
    }

@router.post("/profile", response_model=UserProfile)
async def create_user_profile(
    profile_data: UserProfileCreate,
    current_user: UserModel = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create or update user profile"""
    # Check if profile already exists
    existing_profile = db.query(UserProfileModel).filter(UserProfileModel.user_id == current_user.id).first()
    
    if existing_profile:
        # Update existing profile
        for field, value in profile_data.dict(exclude_unset=True).items():
            setattr(existing_profile, field, value)
        db.commit()
        db.refresh(existing_profile)
        return existing_profile
    else:
        # Create new profile
        db_profile = UserProfileModel(
            user_id=str(current_user.id),
            **profile_data.dict()
        )
        db.add(db_profile)
        db.commit()
        db.refresh(db_profile)
        return db_profile

@router.put("/profile", response_model=UserProfile)
async def update_user_profile(
    profile_data: UserProfileUpdate,
    current_user: UserModel = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update user profile"""
    profile = db.query(UserProfileModel).filter(UserProfileModel.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )
    # Preserve onboarding_completed unless explicitly set
    original_onboarding_completed = profile.onboarding_completed
    for field, value in profile_data.dict(exclude_unset=True).items():
        if field == "onboarding_completed":
            setattr(profile, field, value)
        else:
            setattr(profile, field, value)
    # If onboarding_completed was not in the update, restore it
    if "onboarding_completed" not in profile_data.dict(exclude_unset=True):
        profile.onboarding_completed = original_onboarding_completed
    db.commit()
    db.refresh(profile)
    return profile

@router.post("/onboarding/step1")
async def onboarding_step1(
    data: OnboardingStep1, 
    current_user: UserModel = Depends(get_current_active_user), 
    db: Session = Depends(get_db)
):
    """Complete onboarding step 1: Basic info"""
    # Update user's first_name and last_name
    setattr(current_user, 'first_name', data.first_name)
    setattr(current_user, 'last_name', data.last_name)
    
    profile = db.query(UserProfileModel).filter(UserProfileModel.user_id == str(current_user.id)).first()
    
    if profile:
        # Update existing profile
        setattr(profile, 'location', data.location)
        setattr(profile, 'onboarding_step', 1)
    else:
        # Create new profile
        profile = UserProfileModel(
            user_id=str(current_user.id),
            location=data.location,
            onboarding_step=1
        )
        db.add(profile)
    db.commit()
    return {"message": "Step 1 completed", "next_step": 2}

@router.post("/onboarding/step2")
async def onboarding_step2(
    data: OnboardingStep2, 
    current_user: UserModel = Depends(get_current_active_user), 
    db: Session = Depends(get_db)
):
    """Complete onboarding step 2: Skills"""
    profile = db.query(UserProfileModel).filter(UserProfileModel.user_id == str(current_user.id)).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    setattr(profile, 'skills', data.skills)
    setattr(profile, 'onboarding_step', 2)
    db.commit()
    return {"message": "Step 2 completed", "next_step": 3}

@router.post("/onboarding/step3")
async def onboarding_step3(
    data: OnboardingStep3, 
    current_user: UserModel = Depends(get_current_active_user), 
    db: Session = Depends(get_db)
):
    """Complete onboarding step 3: Interests"""
    profile = db.query(UserProfileModel).filter(UserProfileModel.user_id == str(current_user.id)).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    setattr(profile, 'interests', data.interests)
    setattr(profile, 'onboarding_step', 3)
    db.commit()
    return {"message": "Step 3 completed", "next_step": 4}

@router.post("/onboarding/step4")
async def onboarding_step4(
    data: OnboardingStep4, 
    current_user: UserModel = Depends(get_current_active_user), 
    db: Session = Depends(get_db)
):
    """Complete onboarding step 4: Goals"""
    profile = db.query(UserProfileModel).filter(UserProfileModel.user_id == str(current_user.id)).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    setattr(profile, 'onboarding_step', 4)
    db.commit()
    return {"message": "Step 4 completed", "next_step": 5}

@router.post("/onboarding/step5")
async def onboarding_step5(
    data: OnboardingStep5, 
    current_user: UserModel = Depends(get_current_active_user), 
    db: Session = Depends(get_db)
):
    """Complete onboarding step 5: Preferences"""
    profile = db.query(UserProfileModel).filter(UserProfileModel.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    setattr(profile, 'preferred_business_models', data.preferred_business_models)
    setattr(profile, 'risk_tolerance', data.risk_tolerance)
    setattr(profile, 'time_availability', data.time_availability)
    setattr(profile, 'onboarding_step', 5)
    db.commit()
    return {"message": "Step 5 completed", "next_step": 6}

@router.post("/onboarding/step6")
async def onboarding_step6(
    data: dict, 
    current_user: UserModel = Depends(get_current_active_user), 
    db: Session = Depends(get_db)
):
    """Complete onboarding step 6: Business Models"""
    profile = db.query(UserProfileModel).filter(UserProfileModel.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    setattr(profile, 'preferred_business_models', data.get('business_models', []))
    setattr(profile, 'onboarding_step', 6)
    db.commit()
    return {"message": "Step 6 completed", "next_step": 7}

@router.post("/onboarding/step7")
async def onboarding_step7(
    data: dict, 
    current_user: UserModel = Depends(get_current_active_user), 
    db: Session = Depends(get_db)
):
    """Complete onboarding step 7: Work Preferences"""
    profile = db.query(UserProfileModel).filter(UserProfileModel.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    setattr(profile, 'work_style', data.get('work_style'))
    setattr(profile, 'funding_preference', data.get('funding_preference'))
    setattr(profile, 'location_preference', data.get('location_preference'))
    setattr(profile, 'onboarding_step', 7)
    db.commit()
    return {"message": "Step 7 completed", "next_step": 8}

@router.post("/onboarding/complete")
async def onboarding_complete(
    data: dict,
    current_user: UserModel = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Complete onboarding: set account type, create team/invites if needed, mark onboarding complete, and save all profile fields."""
    account_type = data.get("accountType", "solo")
    team_invites = data.get("teamInvites", [])
    # Set account type
    setattr(current_user, 'account_type', account_type)
    # If team, create team and invites
    if account_type == "team":
        # Create team
        team = Team(owner_id=current_user.id, name=f"{current_user.first_name}'s Team")
        db.add(team)
        db.commit()
        db.refresh(team)
        # Set user's team_id
        setattr(current_user, 'team_id', team.id)
        # Create invites
        expires_at = datetime.utcnow() + timedelta(days=7)
        for email in team_invites:
            invite = Invite(
                email=email,
                team_id=str(team.id),
                inviter_id=str(current_user.id),
                expires_at=expires_at,
                accepted=False,
                revoked=False
            )
            db.add(invite)
        db.commit()
    # Mark onboarding as complete and update all profile fields
    profile = db.query(UserProfileModel).filter(UserProfileModel.user_id == current_user.id).first()
    if profile:
        # Map frontend keys to backend fields
        field_map = {
            "background": ["background"],
            "location": ["location"],
            "skills": ["skills"],
            "interests": ["interests"],
            "horizontals": ["horizontals"],
            "verticals": ["verticals"],
            "businessModels": ["preferred_business_models", "business_models"],
            "preferredBusinessModels": ["preferred_business_models"],
            "riskTolerance": ["risk_tolerance"],
            "timeAvailability": ["time_availability"],
            "education": ["education"],
            "goals": ["goals"],
            "industries": ["industries"],
            "preferredIndustries": ["preferred_industries"],
        }
        for frontend_key, backend_keys in field_map.items():
            # Try all possible keys for this field
            value = None
            for key in [frontend_key] + backend_keys:
                if key in data:
                    value = data[key]
                    break
            if value is not None and value != "":
                # For businessModels, always map to preferred_business_models
                if frontend_key in ["businessModels", "preferredBusinessModels"]:
                    setattr(profile, "preferred_business_models", value)
                else:
                    setattr(profile, backend_keys[0], value)
        setattr(profile, 'onboarding_completed', True)
        db.commit()
    db.commit()
    db.refresh(current_user)
    return {"status": "success", "user": current_user}


def is_profile_complete(profile) -> bool:
    """Check if user profile is complete with all required fields"""
    if not profile:
        return False
    
    # Basic personal information
    basic_fields = ['first_name', 'last_name', 'location', 'background']
    for field in basic_fields:
        value = getattr(profile, field, None)
        if value is None or (isinstance(value, str) and not value.strip()):
            return False
    
    # Skills and interests (must have at least some)
    skills = getattr(profile, 'skills', [])
    interests = getattr(profile, 'interests', [])
    if not skills or not isinstance(skills, list) or len(skills) == 0:
        return False
    if not interests or not isinstance(interests, list) or len(interests) == 0:
        return False
    
    # Goals and timeline
    goals = getattr(profile, 'goals', [])
    timeline = getattr(profile, 'timeline', None)
    if not goals or not isinstance(goals, list) or len(goals) == 0:
        return False
    if not timeline:
        return False
    
    # Experience and education
    experience_years = getattr(profile, 'experience_years', None)
    education_level = getattr(profile, 'education_level', None)
    if not experience_years or not education_level:
        return False
    
    # Work preferences
    work_style = getattr(profile, 'work_style', None)
    funding_preference = getattr(profile, 'funding_preference', None)
    location_preference = getattr(profile, 'location_preference', None)
    if not work_style or not funding_preference or not location_preference:
        return False
    
    # Business preferences
    business_models = getattr(profile, 'preferred_business_models', [])
    if not business_models or not isinstance(business_models, list) or len(business_models) == 0:
        return False
    
    # Risk tolerance and time availability
    risk_tolerance = getattr(profile, 'risk_tolerance', None)
    time_availability = getattr(profile, 'time_availability', None)
    if not risk_tolerance or not time_availability:
        return False
    
    # Check if onboarding is explicitly marked as completed
    onboarding_completed = getattr(profile, 'onboarding_completed', False)
    if not onboarding_completed:
        return False
    
    return True


@router.post("/invite/accept")
async def accept_invite(
    invite_id: str = Query(...),
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
):
    """Accept a team invite (by invite id)."""
    profile = db.query(UserProfileModel).filter(UserProfileModel.user_id == current_user.id).first()
    if not profile or not is_profile_complete(profile):
        raise HTTPException(
            status_code=403,
            detail="Please complete your onboarding profile before accessing this feature"
        )
    invite = db.query(Invite).filter(Invite.id == invite_id, Invite.revoked.is_(False), Invite.accepted.is_(False)).first()
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found or already used/revoked.")
    if invite.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Invite has expired.")
    # Add user to team
    setattr(current_user, 'team_id', invite.team_id)
    setattr(current_user, 'account_type', 'team')
    setattr(invite, 'accepted', True)
    setattr(invite, 'accepted_at', datetime.utcnow())
    db.commit()
    db.refresh(current_user)
    return {"status": "accepted", "team_id": invite.team_id}

@router.get("/team/members")
async def list_team_members(
    current_user: UserModel = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """List all members and pending invites for the current user's team."""
    if not current_user.team_id:
        return {"members": [], "invites": []}
    members = db.query(UserModel).filter(UserModel.team_id == current_user.team_id).all()
    invites = db.query(Invite).filter(Invite.team_id == current_user.team_id, Invite.revoked.is_(False), Invite.accepted.is_(False)).all()
    return {"members": members, "invites": invites}

@router.post("/invite/revoke")
async def revoke_invite(
    invite_id: str = Query(...),
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
):
    """Revoke a pending invite (owner only)."""
    invite = db.query(Invite).filter(Invite.id == invite_id, Invite.revoked.is_(False), Invite.accepted.is_(False)).first()
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found or already used/revoked.")
    team = db.query(Team).filter(Team.id == invite.team_id).first()
    if not team or team.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the team owner can revoke invites.")
    setattr(invite, 'revoked', True)
    db.commit()
    return {"status": "revoked"}

@router.post("/team/transfer_ownership")
async def transfer_team_ownership(
    new_owner_id: str = Query(...),
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
):
    """Transfer team ownership to another member (owner only)."""
    if not current_user.team_id:
        raise HTTPException(status_code=400, detail="You are not part of a team.")
    team = db.query(Team).filter(Team.id == current_user.team_id).first()
    if not team or team.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the team owner can transfer ownership.")
    new_owner = db.query(UserModel).filter(UserModel.id == new_owner_id, UserModel.team_id == team.id).first()
    if not new_owner:
        raise HTTPException(status_code=404, detail="New owner must be a member of the team.")
    setattr(team, 'owner_id', new_owner_id)
    db.commit()
    return {"status": "ownership_transferred", "new_owner_id": new_owner_id}

@router.post("/api/profile/qna", response_model=ProfileQnAOut, status_code=201)
async def create_profile_qna(
    data: ProfileQnACreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
):
    try:
        # Assemble context (profile, resume, etc.)
        user_profile = getattr(current_user, 'profile', None)
        user_resume = getattr(current_user, 'resume', None)
        context = {}
        if data.context_fields:
            if 'profile' in data.context_fields and user_profile:
                context.update(context_profile(user_profile))
            if 'resume' in data.context_fields and user_resume:
                context['resume'] = user_resume.parsed_content
        else:
            if user_profile:
                context.update(context_profile(user_profile))
            if user_resume:
                context['resume'] = user_resume.parsed_content
        logger.info(f"[ProfileQnA] Assembled context: {context}")
        if not context:
            raise HTTPException(status_code=400, detail="No context available for QnA. Please complete your profile or upload a resume.")
        # Use modular orchestration
        context_str = "\n".join(f"{k}: {v}" for k, v in context.items())
        llm_context = {"context": context_str, "question": data.question}
        # Removed generate_profile_qna from app.llm (no longer exists)
        # result = await generate_profile_qna(llm_context)
        # answer = result.get("answer", "")
        # llm_raw = result.get("raw", "")
        # qna = ProfileQnA(
        #     user_id=str(getattr(current_user, 'id', None)),
        #     question=data.question,
        #     answer=answer,
        #     llm_raw_response=llm_raw
        # )
        # db.add(qna)
        # db.commit()
        # db.refresh(qna)
        # return qna
        # Placeholder for now, as generate_profile_qna is removed
        answer = "This feature is currently unavailable."
        llm_raw = ""
        qna = ProfileQnA(
            user_id=str(getattr(current_user, 'id', None)),
            question=data.question,
            answer=answer,
            llm_raw_response=llm_raw
        )
        db.add(qna)
        db.commit()
        db.refresh(qna)
        return qna
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"[ProfileQnA] Exception: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create profile QnA: {str(e)}")

@router.get("/api/profile/qna", response_model=list[ProfileQnAOut])
async def get_profile_qna(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
):
    qnas = db.query(ProfileQnA).filter(ProfileQnA.user_id == current_user.id).order_by(ProfileQnA.created_at.desc()).all()
    valid_qnas = []
    for qna in qnas:
        try:
            # Try to serialize to ProfileQnAOut (Pydantic will validate fields)
            valid_qnas.append(ProfileQnAOut.model_validate(qna))
        except Exception as e:
            logger.warning(f"[ProfileQnA] Skipping corrupt QnA record (id={getattr(qna, 'id', None)}): {e}")
    return valid_qnas

@router.get("/github/login")
async def github_login():
    """Redirect user to GitHub OAuth consent screen"""
    github_auth_url = (
        f"https://github.com/login/oauth/authorize?client_id={GITHUB_CLIENT_ID}"
        f"&redirect_uri={GITHUB_OAUTH_REDIRECT_URI}"
        f"&scope={GITHUB_OAUTH_SCOPE}"
    )
    return RedirectResponse(github_auth_url)

@router.get("/github/callback")
async def github_callback(request: Request, db: Session = Depends(get_db)):
    """Handle GitHub OAuth callback, exchange code for token, fetch user info, login/register user"""
    code = request.query_params.get("code")
    if not code:
        return JSONResponse(status_code=400, content={"error": "Missing code in callback"})
    try:
        access_token = await get_github_access_token(code)
        github_user = await get_github_user_info(access_token)
        # Find or create user
        user = db.query(UserModel).filter_by(oauth_provider='github', oauth_id=github_user["id"]).first()
        if not user:
            # Try to find by email (merge accounts)
            user = db.query(UserModel).filter_by(email=github_user["email"]).first()
            if user is not None:
                setattr(user, 'oauth_provider', 'github')
                setattr(user, 'oauth_id', github_user["id"])
                setattr(user, 'oauth_picture', github_user.get("avatar_url"))
                setattr(user, 'github_access_token', access_token)
            else:
                user = UserModel(
                    email=github_user["email"],
                    first_name=github_user.get("name") or github_user.get("login"),
                    last_name="",
                    oauth_provider='github',
                    oauth_id=github_user["id"],
                    oauth_picture=github_user.get("avatar_url"),
                    github_access_token=access_token,
                    is_verified=True,
                    is_active=True
                )
                db.add(user)
        db.commit()
        db.refresh(user)
        # Optionally update UserProfile with github_url
        if getattr(user, 'profile', None) is not None:
            user.profile.github_url = github_user.get("html_url")
        else:
            # user.id is guaranteed to be a string after db.refresh(user)
            profile = UserProfileModel(
                user_id=str(user.id),
                github_url=github_user.get("html_url")
            )
            db.add(profile)
        db.commit()
        # Create access token
        access_token_jwt = create_access_token({"sub": user.id})
        return JSONResponse({
            "access_token": access_token_jwt,
            "token_type": "bearer",
            "user_id": user.id
        })
    except Exception as e:
        logger.error(f"GitHub OAuth error: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})

@router.delete("/github")
async def remove_github_account(current_user: UserModel = Depends(get_current_active_user), db: Session = Depends(get_db)):
    """Remove GitHub OAuth linkage from the current user account"""
    try:
        # Only remove if currently linked to GitHub
        if getattr(current_user, 'oauth_provider', None) == 'github':
            current_user.oauth_provider = None
            current_user.oauth_id = None
            current_user.oauth_picture = None
            current_user.github_access_token = None
            # Remove github_url from profile if present
            if getattr(current_user, 'profile', None) is not None:
                current_user.profile.github_url = None
            db.commit()
            return {"success": True, "message": "GitHub account unlinked."}
        else:
            return {"success": False, "message": "No GitHub account linked."}
    except Exception as e:
        logger.error(f"Error removing GitHub account: {e}")
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})