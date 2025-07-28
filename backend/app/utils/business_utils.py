# backend/app/utils.py

from sqlalchemy.orm import Session
import logging
import httpx
from crud import get_or_create_repo
import os
from typing import Optional

# Set up logging
logger = logging.getLogger(__name__)

try:
    import docx
except ImportError:
    docx = None
try:
    import PyPDF2
except ImportError:
    PyPDF2 = None

# Centralized business options for API and internal use
BUSINESS_VERTICAL_GROUPS = [
    {
        "label": "Consumer-Facing Industries",
        "options": [
            "Retail", "Hospitality", "Fashion & Apparel", "Food & Beverage", "Media & Entertainment"
        ]
    },
    {
        "label": "Technology & Innovation",
        "options": [
            "Technology", "Telecommunications", "Pharmaceuticals"
        ]
    },
    {
        "label": "Infrastructure & Industrial",
        "options": [
            "Manufacturing", "Energy", "Construction", "Automotive", "Transportation & Logistics"
        ]
    },
    {
        "label": "Public & Social Good",
        "options": [
            "Healthcare", "Education", "Government & Public Sector", "Non-Profit & Social Impact"
        ]
    },
    {
        "label": "Financial & Property",
        "options": [
            "Finance", "Real Estate"
        ]
    },
    {
        "label": "Natural Resources",
        "options": [
            "Agriculture"
        ]
    }
]

BUSINESS_HORIZONTAL_GROUPS = [
    {
        "label": "Technology & Data",
        "options": [
            "Information Technology (IT)",
            "Data Analytics & Business Intelligence",
            "Cybersecurity",
            "Artificial Intelligence & Machine Learning",
            "Cloud Services",
            "Enterprise Resource Planning (ERP)",
            "Digital Transformation"
        ]
    },
    {
        "label": "Customer & Market",
        "options": [
            "Marketing & Advertising",
            "Sales",
            "Customer Relationship Management (CRM)",
            "Customer Experience (CX)"
        ]
    },
    {
        "label": "Operations & Supply",
        "options": [
            "Supply Chain Management",
            "Operations Management",
            "Facilities Management"
        ]
    },
    {
        "label": "People & Development",
        "options": [
            "Human Resources",
            "Training & Development"
        ]
    },
    {
        "label": "Finance & Legal",
        "options": [
            "Finance & Accounting",
            "Legal Services"
        ]
    },
    {
        "label": "Innovation & Sustainability",
        "options": [
            "Research & Development (R&D)",
            "Sustainability & ESG (Environmental, Social, Governance)"
        ]
    }
]

BUSINESS_MODEL_GROUPS = [
    {
        "label": "Traditional Commerce",
        "options": [
            "Product Sales", "Wholesale", "Retail", "Direct-to-Consumer (DTC)", "Dropshipping"
        ]
    },
    {
        "label": "Subscription-Based",
        "options": [
            "Subscription", "Subscription Services", "Freemium", "Hybrid Subscription + One-Time Sales", "Freemium + Advertising"
        ]
    },
    {
        "label": "Service-Oriented",
        "options": [
            "Service Provider", "On-Demand Services", "Managed Services", "SaaS + Consulting"
        ]
    },
    {
        "label": "Platform & Marketplace",
        "options": [
            "Marketplace", "Platform as a Service (PaaS)", "Software as a Service (SaaS)", "Marketplace + Advertising"
        ]
    },
    {
        "label": "Innovative & Emerging",
        "options": [
            "Sharing Economy", "Network Effect", "Crowdsourcing", "Circular Economy", "Data Monetization", "Outcome-Based"
        ]
    },
    {
        "label": "Advertising & Commission",
        "options": [
            "Advertising", "Commission-Based", "Affiliate Marketing"
        ]
    },
    {
        "label": "Licensing & Franchising",
        "options": [
            "Licensing", "Franchising", "Franchise Royalties", "Franchise + Licensing"
        ]
    },
    {
        "label": "Specialized Models",
        "options": [
            "Product as a Service (PaaS)", "Bundling", "Razor and Blades", "Usage-Based"
        ]
    }
]

async def translate_to_english(text: str) -> str:
    """Translate text to English using LibreTranslate API. Returns original text on failure."""
    if not text:
        return text
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:  # Reduced timeout
            response = await client.post(
                "https://libretranslate.de/translate",
                data={
                    "q": text,
                    "source": "auto",
                    "target": "en",
                    "format": "text"
                },
                headers={"accept": "application/json"}
            )
            response.raise_for_status()
            translated = response.json().get("translatedText", "")
            return translated if translated else text
    except Exception as e:
        logger.warning(f"Translation failed: {e}")
        return text

def translate_to_english_sync(text: str) -> str:
    """Synchronous version of translation that doesn't use asyncio.run()"""
    if not text:
        return text
    try:
        with httpx.Client(timeout=3.0) as client:  # Reduced timeout to prevent blocking
            response = client.post(
                "https://libretranslate.de/translate",
                data={
                    "q": text,
                    "source": "auto",
                    "target": "en",
                    "format": "text"
                },
                headers={"accept": "application/json"}
            )
            response.raise_for_status()
            translated = response.json().get("translatedText", "")
            return translated if translated else text
    except Exception as e:
        logger.warning(f"Translation failed: {e}")
        return text

def save_repos(repos: list, db: Session, period: str = "daily", skip_translation: bool = False) -> int:
    """Save repositories to database with error handling and description translation"""
    saved_count = 0
    if not repos:
        logger.warning("No repos provided to save")
        return 0
    
    for r_data in repos:
        try:
            if not r_data.get("name") or not r_data.get("url"):
                logger.warning(f"Repo data missing required fields: {r_data.get('name')}, {r_data.get('url')}")
                continue

            # Translate description using synchronous version with quick timeout
            description = r_data.get("description", "")
            if description and not skip_translation:
                try:
                    description = translate_to_english_sync(description)
                except Exception as e:
                    logger.warning(f"Translation failed for '{r_data.get('name')}': {e}")
                    # Keep original description if translation fails
                    description = r_data.get("description", "")
            
            repo_to_save = {
                "name": r_data["name"],
                "url": r_data["url"],
                "summary": description[:500] if description else None,
                "language": r_data.get("language", "Unknown"),
                "trending_period": period,
            }

            get_or_create_repo(db, repo_to_save)
            saved_count += 1
        
        except Exception as e:
            logger.error(f"Error processing repo {r_data.get('name', 'unknown')}: {e}")
            continue

    try:
        db.commit()
        logger.info(f"Successfully processed {len(repos)} repos, saved or updated {saved_count}.")
    except Exception as e:
        logger.error(f"Error committing repos to database: {e}")
        db.rollback()
        raise
    
    return saved_count

def extract_text_from_resume(file_path: str) -> Optional[str]:
    """Extract text from a resume file (DOCX, PDF, or TXT). Returns None on failure."""
    ext = os.path.splitext(file_path)[1].lower()
    try:
        if ext == ".txt":
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                return f.read()
        elif ext == ".docx" and docx:
            doc = docx.Document(file_path)
            return "\n".join([p.text for p in doc.paragraphs])
        elif ext == ".pdf" and PyPDF2:
            with open(file_path, "rb") as f:
                reader = PyPDF2.PdfReader(f)
                return "\n".join(page.extract_text() or "" for page in reader.pages)
        else:
            return None
    except Exception as e:
        logger.error(f"Failed to extract text from {file_path}: {e}")
        return None

def get_client_ip(request):
    """Extract client IP address from request"""
    if not request:
        return None
    
    # Try to get IP from various headers
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip
    
    # Fallback to client host
    return request.client.host if request.client else None

def get_user_agent(request):
    """Extract user agent from request"""
    if not request:
        return None
    
    return request.headers.get("User-Agent")
