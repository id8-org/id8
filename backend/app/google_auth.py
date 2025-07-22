import os
import httpx
from google.auth.transport import requests
from google.oauth2 import id_token
from google.auth.exceptions import GoogleAuthError
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models import User
from app.schemas import GoogleUserInfo
import logging

logger = logging.getLogger(__name__)

# Google OAuth configuration
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")

async def exchange_code_for_tokens(authorization_code: str) -> dict:
    """Exchange authorization code for access token and ID token"""
    try:
        # Get redirect URI from environment or use default
        redirect_uri = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8081")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                'https://oauth2.googleapis.com/token',
                data={
                    'code': authorization_code,
                    'client_id': GOOGLE_CLIENT_ID,
                    'client_secret': GOOGLE_CLIENT_SECRET,
                    'redirect_uri': redirect_uri,  # Use configurable redirect URI
                    'grant_type': 'authorization_code',
                }
            )
            
            if response.status_code != 200:
                logger.error(f"Token exchange failed: {response.text}")
                raise ValueError("Failed to exchange authorization code for tokens")
            
            token_data = response.json()
            return token_data
            
    except Exception as e:
        logger.error(f"Error exchanging code for tokens: {e}")
        raise ValueError("Token exchange failed")

async def verify_google_token(id_token_str: str) -> GoogleUserInfo:
    """Verify Google ID token and return user information"""
    try:
        # Verify the token
        idinfo = id_token.verify_oauth2_token(
            id_token_str, 
            requests.Request(), 
            GOOGLE_CLIENT_ID
        )
        
        # Check if the token is valid
        if idinfo['aud'] != GOOGLE_CLIENT_ID:
            raise ValueError('Wrong audience.')
        
        if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
            raise ValueError('Wrong issuer.')
        
        # Return user info
        return GoogleUserInfo(
            sub=idinfo['sub'],
            email=idinfo['email'],
            email_verified=idinfo['email_verified'],
            name=idinfo.get('name', ''),
            given_name=idinfo.get('given_name', ''),
            family_name=idinfo.get('family_name', ''),
            picture=idinfo.get('picture', ''),
            locale=idinfo.get('locale', 'en')
        )
        
    except GoogleAuthError as e:
        logger.error(f"Google token verification failed: {e}")
        raise ValueError("Invalid Google token")
    except Exception as e:
        logger.error(f"Unexpected error during Google token verification: {e}")
        raise ValueError("Token verification failed")

def get_or_create_google_user(db: Session, google_user: GoogleUserInfo) -> User:
    """Get existing user or create new one from Google OAuth data"""
    # Check if user exists by Google ID
    existing_user = db.query(User).filter(
        User.oauth_provider == 'google',
        User.oauth_id == google_user.sub
    ).first()
    
    if existing_user:
        # Update user info from Google
        existing_user.email = google_user.email
        existing_user.first_name = google_user.given_name
        existing_user.last_name = google_user.family_name
        existing_user.oauth_picture = google_user.picture
        existing_user.is_verified = google_user.email_verified
        existing_user.updated_at = func.now()
        db.commit()
        db.refresh(existing_user)
        return existing_user
    
    # Check if user exists by email (for users who signed up with email first)
    existing_user_by_email = db.query(User).filter(User.email == google_user.email).first()
    if existing_user_by_email:
        # Link Google account to existing email user
        existing_user_by_email.oauth_provider = 'google'
        existing_user_by_email.oauth_id = google_user.sub
        existing_user_by_email.oauth_picture = google_user.picture
        existing_user_by_email.is_verified = google_user.email_verified
        existing_user_by_email.updated_at = func.now()
        db.commit()
        db.refresh(existing_user_by_email)
        return existing_user_by_email
    
    # Create new user
    new_user = User(
        email=google_user.email,
        first_name=google_user.given_name,
        last_name=google_user.family_name,
        oauth_provider='google',
        oauth_id=google_user.sub,
        oauth_picture=google_user.picture,
        is_verified=google_user.email_verified,
        is_active=True
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

async def authenticate_google_user(db: Session, id_token_str: str) -> User:
    """Authenticate user with Google ID token"""
    # Verify the Google token
    google_user = await verify_google_token(id_token_str)
    
    # Get or create user
    user = get_or_create_google_user(db, google_user)
    
    if not user.is_active:
        raise ValueError("User account is deactivated")
    
    return user

async def authenticate_google_user_with_code(db: Session, authorization_code: str) -> User:
    """Authenticate user with Google authorization code"""
    # Exchange code for tokens
    token_data = await exchange_code_for_tokens(authorization_code)
    
    # Get ID token from response
    id_token_str = token_data.get('id_token')
    if not id_token_str:
        raise ValueError("No ID token received from Google")
    
    # Verify the Google token
    google_user = await verify_google_token(id_token_str)
    
    # Get or create user
    user = get_or_create_google_user(db, google_user)
    
    if not user.is_active:
        raise ValueError("User account is deactivated")
    
    return user 