from app.models import Idea, Repo, User
import logging
import os
from app.db import SessionLocal
try:
    import redis
except ImportError:
    redis = None
import threading
from app.llm_center.legacy_wrappers import generate_deep_dive, generate_idea_pitches, sanitize_idea_fields
from app.services.github import fetch_trending
from app.context_utils import build_user_context
import asyncio
import crud

redis_client = None
if redis:
    try:
        redis_client = redis.Redis.from_url(os.environ.get('REDIS_URL', 'redis://localhost:6379/0'))
    except Exception:
        redis_client = None

logger = logging.getLogger(__name__)

class IdeaService:
    def __init__(self, event_bus):
        self.event_bus = event_bus
        self.logger = logging.getLogger(__name__)
        self.event_bus.subscribe('idea.status.updated', self._on_status_updated)

    def update_status(self, db, idea_id: str, new_status: str):
        idea = db.query(Idea).filter(Idea.id == idea_id).first()
        if not idea:
            raise ValueError(f"Idea with ID {idea_id} not found")
        idea.status = new_status
        db.commit()
        db.refresh(idea)
        self.logger.info(f"Updated status for idea {idea_id} to {new_status}")
        # Emit event with repo_id for cache invalidation
        self.event_bus.emit('idea.status.updated', idea_id=idea_id, new_status=new_status, repo_id=idea.repo_id)
        return idea

    def _generate_and_save_deep_dive(self, idea_id: str):
        """Worker function to run in a separate thread."""
        self.logger.info(f"Background thread started for deep dive on idea {idea_id}")
        db = SessionLocal()
        llm_called = False
        raw_blob = ''
        try:
            idea = db.query(Idea).filter(Idea.id == idea_id).first()
            if not idea:
                self.logger.error(f"Deep dive worker: Idea {idea_id} not found.")
                return

            idea_data = {
                "title": idea.title,
                "hook": idea.hook,
                "value": idea.value,
                "evidence": idea.evidence,
                "differentiator": idea.differentiator,
                "score": idea.score,
                "mvp_effort": idea.mvp_effort
            }

            # Run the async LLM call in a new event loop for this thread
            self.logger.info(f"[DeepDive] About to call LLM for idea {idea_id}")
            
            # Run the async LLM call in a new event loop for this thread
            self.logger.info(f"[DeepDive] About to call LLM for idea {idea_id}")
            deep_dive_result = asyncio.run(generate_deep_dive(idea_data))
            llm_called = True
            deep_dive_data = deep_dive_result.get('deep_dive')
            raw_blob = deep_dive_result.get('raw') or ''
            self.logger.info(f"[DeepDive] LLM call made: {llm_called}, raw response length: {len(raw_blob)}")

            # Always store the raw LLM response, even if parsing fails or deep_dive_data is None
            if deep_dive_data:
                crud.save_deep_dive(db, idea_id, deep_dive_data, raw_blob)
                db.commit()
                self.logger.info(f"Background thread successfully saved deep dive for {idea_id}")
            else:
                self.logger.error(f"Deep dive generation failed for {idea_id} in background thread. Saving raw response anyway.")
                # Save error section and raw_blob
                error_section = {"sections": [{"title": "Error Generating Deep Dive", "content": "An error occurred or no valid deep dive: see raw LLM response."}]}
                crud.save_deep_dive(db, idea_id, error_section, raw_blob)
                db.commit()
                setattr(idea, "deep_dive_requested", False)  # type: ignore

        except Exception as e:
            self.logger.error(f"Error in deep dive background thread for {idea_id}: {e}")
            # Ensure the flag is reset on failure
            idea = db.query(Idea).filter(Idea.id == idea_id).first()
            if idea:
                setattr(idea, "deep_dive_requested", False)  # type: ignore
                # Save error section and raw_blob even on exception
                error_section = {"sections": [{"title": "Error Generating Deep Dive", "content": f"Exception: {str(e)}. See raw LLM response."}]}
                crud.save_deep_dive(db, idea_id, error_section, raw_blob)
                db.commit()
            db.rollback()
        finally:
            db.close()
            self.logger.info(f"Background thread finished for idea {idea_id}. LLM called: {llm_called}. Raw response length: {len(raw_blob)}")

    def _on_status_updated(self, idea_id, new_status, **kwargs):
        self.logger.info(f"Event received: idea.status.updated for {idea_id} -> {new_status}")
        # Invalidate cache for this repo's ideas
        if redis_client and kwargs.get('repo_id'):
            cache_key = f"ideas:repo:{kwargs['repo_id']}"
            redis_client.delete(cache_key)
            self.logger.info(f"Invalidated cache for {cache_key}")
        if new_status == 'deep_dive':
            self.logger.info(f"Triggering deep dive for idea {idea_id} due to status change.")
            db = SessionLocal()
            try:
                # Mark as requested first
                idea = db.query(Idea).filter(Idea.id == idea_id).first()
                if idea and getattr(idea, 'deep_dive_requested', None) is not True:
                    setattr(idea, "deep_dive_requested", True)  # type: ignore
                    db.commit()
                    self.logger.info(f"Marked idea {idea_id} for deep dive.")

                    # Run generation in a background thread
                    thread = threading.Thread(target=self._generate_and_save_deep_dive, args=(idea_id,))
                    thread.start()
                elif not idea:
                    self.logger.warning(f"Idea {idea_id} not found for deep dive trigger.")
                else:
                    self.logger.info(f"Deep dive for idea {idea_id} was already requested.")

            except Exception as e:
                self.logger.error(f"Error in deep dive request: {e}")
                db.rollback()
            finally:
                db.close()

LANGUAGES = ["Python", "TypeScript", "JavaScript"]

async def seed_system_ideas_if_needed():
    db = SessionLocal()
    try:
        count = db.query(Idea).filter(Idea.user_id == None).count()
        if count == 0:
            logger.info("🌱 Seeding system ideas...")
            # Fetch and save repos for each language
            for lang in LANGUAGES:
                logger.info(f"  → Fetching trending repos for {lang}...")
                repos_data = await fetch_trending(lang)
                for repo_data in repos_data:
                    # Check if repo already exists
                    repo = db.query(Repo).filter(Repo.url == repo_data["url"]).first()
                    if not repo:
                        repo = Repo(
                            name=repo_data["name"],
                            url=repo_data["url"],
                            summary=repo_data.get("description", ""),
                            language=repo_data.get("language", lang)
                        )
                        db.add(repo)
                        db.commit()
                        db.refresh(repo)
                    # Generate ideas for this repo (system prompt)
                    result = await generate_idea_pitches({'repo_description': str(repo.summary), 'user_context': '', 'prompt_type': 'system'})
                    raw_blob = result.get('raw')
                    ideas = result.get('ideas', [])
                    seeded_count = 0
                    for idea in ideas:
                        # Defensive: skip if not a dict
                        if not isinstance(idea, dict):
                            logger.warning(f"[System Seeding] Skipping non-dict idea: {idea}. Raw LLM: {raw_blob}")
                            continue
                        # Always sanitize fields to ensure all required fields are present
                        idea = sanitize_idea_fields(idea)
                        # Defensive: skip if title is missing, empty, or not a string
                        if not idea.get("title") or not isinstance(idea["title"], str) or not idea["title"].strip():
                            logger.warning(f"[System Seeding] Skipping idea with missing/invalid title: {idea}. Raw LLM: {raw_blob}")
                            continue
                        required_fields = ["title", "hook", "value", "evidence", "differentiator", "call_to_action"]
                        missing = [f for f in required_fields if not idea.get(f)]
                        if missing:
                            logger.warning(f"[System Seeding] Skipping idea due to missing fields: {missing}. Idea: {idea}. Raw LLM: {raw_blob}")
                            continue
                        mvp_effort = idea.get("mvp_effort")
                        if not isinstance(mvp_effort, int):
                            mvp_effort = None
                        score = idea.get("score")
                        if not isinstance(score, int):
                            score = None
                        db.add(Idea(
                            repo_id=repo.id,
                            user_id=None,  # System-generated ideas
                            title=idea.get("title", ""),
                            hook=idea.get("hook", ""),
                            value=idea.get("value", ""),
                            evidence=idea.get("evidence", ""),
                            differentiator=idea.get("differentiator", ""),
                            call_to_action=idea.get("call_to_action", ""),
                            score=score,
                            mvp_effort=mvp_effort,
                            llm_raw_response=raw_blob
                        ))
                        seeded_count += 1
                    if seeded_count == 0:
                        logger.warning(f"[System Seeding] All ideas skipped for repo {repo.url} due to missing required fields. Raw LLM: {raw_blob}")
                    db.commit()
            logger.info("✅ System ideas seeded!")
        else:
            logger.info(f"✅ {count} system ideas already present. Skipping seeding.")
    except Exception as e:
        logger.error(f"Error seeding system ideas: {e}")
        db.rollback()
    finally:
        db.close()

async def seed_user_idea_if_needed(user: User):
    db = SessionLocal()
    try:
        # Always fetch the latest user and profile from DB
        user_db = db.query(User).filter(User.id == user.id).first()
        if not user_db:
            logger.error(f"User {user.id} not found in DB.")
            return
        profile = getattr(user_db, 'profile', None)
        count = db.query(Idea).filter(Idea.user_id == user_db.id).count()
        if count == 0:
            logger.info(f"🌱 Seeding first idea for user {user_db.id}...")
            # Fetch resume if available
            resume = None
            try:
                from app.models import UserResume
                resume = db.query(UserResume).filter(UserResume.user_id == user_db.id).first()
            except Exception:
                resume = None
            context = build_user_context(user_db, profile, resume)
            logger.info(f"[LLM CONTEXT] Full user context for initial idea generation:\n{context}")
            result = await generate_idea_pitches({'repo_description': '', 'user_context': context, 'prompt_type': 'ai'})
            raw_blob = result.get('raw')
            ideas = result.get('ideas', [])
            if ideas:
                idea = ideas[0]
                mvp_effort = idea.get("mvp_effort")
                if not isinstance(mvp_effort, int):
                    mvp_effort = None
                score = idea.get("score")
                if not isinstance(score, int):
                    score = None
                db_idea = Idea(
                    user_id=user_db.id,
                    title=idea.get("title", ""),
                    hook=idea.get("hook", ""),
                    value=idea.get("value", ""),
                    evidence=idea.get("evidence", ""),
                    differentiator=idea.get("differentiator", ""),
                    call_to_action=idea.get("call_to_action", ""),
                    score=score,
                    mvp_effort=mvp_effort,
                    llm_raw_response=raw_blob,
                    status='suggested'
                )
                # If user is in a team, set team_id
                if getattr(user_db, 'team_id', None):
                    db_idea.team_id = user_db.team_id
                db.add(db_idea)
                db.commit()
                logger.info(f"✅ Seeded first idea for user {user_db.id}")
            else:
                logger.warning(f"No ideas generated for user {user_db.id} profile.")
        else:
            logger.info(f"User {user_db.id} already has {count} ideas. Skipping seeding.")
    except Exception as e:
        logger.error(f"Error seeding user idea: {e}")
        db.rollback()
    finally:
        db.close()

async def ask_llm_with_context(question: str, context: str):
    """Call the LLM with a user question and context, return (answer, raw_response)."""
    prompt = f"Context:\n{context}\n\nQuestion: {question}\nAnswer:"
    # Use your LLM call here (e.g., OpenAI, Groq, etc.)
    # For now, use generate_idea_pitches as a placeholder
    result = await generate_idea_pitches({'repo_description': '', 'user_context': prompt})
    answer = result.get('ideas', [{}])[0].get('value', '') if result.get('ideas') else ''
    raw = result.get('raw', '')
    return answer, raw 