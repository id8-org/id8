import sys
import os
import asyncio
import argparse

# Add project root to Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.db import SessionLocal
from app.services.github import fetch_trending
from app.utilities import save_repos
from app.models import Repo, Idea, User, Notification
from app.services.github_oauth import fetch_user_starred_repos, fetch_user_contributed_repos
from app.llm import generate_idea_pitches

LANGUAGES = ["Python", "TypeScript", "JavaScript"]

def fetch_repos_only():
    """Fetch trending repos without generating ideas"""
    session = SessionLocal()
    try:
        print("🔍 Fetching trending repositories from GitHub...")
        
        # Fetch and save repos for each language
        for lang in LANGUAGES:
            print(f"  → Fetching trending repos for {lang}...")
            repos_data = asyncio.run(fetch_trending(lang))
            saved_count = save_repos(repos_data, session, skip_translation=True)  # Skip translation during startup
            print(f"    ✅ Saved {saved_count} trending repos for {lang}.")

        # Verify repos were saved
        total_repos = session.query(Repo).count()
        print(f"🎉 Successfully fetched and saved {total_repos} total repositories!")
        
    except Exception as e:
        print(f"❌ Error fetching repos: {e}")
        session.rollback()
        raise
    finally:
        session.close()

def generate_ideas_for_repos():
    """Generate ideas for existing repos"""
    session = SessionLocal()
    try:
        # Query repos from DB (now they have IDs)
        repos = session.query(Repo).all()
        print(f"✨ Generating generic ideas for {len(repos)} repos...")
        
        for repo in repos:
            print(f"  → Generating ideas for: {repo.name}")
            # Use generic generation (no user context)
            result = asyncio.run(generate_idea_pitches(repo.summary))
            raw_blob = result.get('raw')
            ideas = result.get('ideas', [])
            
            for idea in ideas:
                mvp_effort = idea.get("mvp_effort")
                if not isinstance(mvp_effort, int):
                    mvp_effort = None
                score = idea.get("score")
                if not isinstance(score, int):
                    score = None
                    
                session.add(Idea(
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
            session.commit()
            print(f"    ✔️ Ideas saved for: {repo.name}")
            
        print("🎉 All generic ideas generated and saved!")
        
    except Exception as e:
        print(f"❌ Error generating ideas: {e}")
        session.rollback()
        raise
    finally:
        session.close()

async def orchestrate_personalized_idea_generation(user, session):
    """Orchestrate personalized idea generation for a single user using their GitHub and trending repos."""
    user_context = f"Skills: {getattr(user.profile, 'skills', [])}, Interests: {getattr(user.profile, 'interests', [])}"
    access_token = getattr(user, 'github_access_token', None)
    username = getattr(user.profile, 'github_url', '').split('/')[-1] if getattr(user, 'profile', None) and getattr(user.profile, 'github_url', None) else None
    all_repos = []
    if access_token:
        try:
            starred = await fetch_user_starred_repos(access_token)
            all_repos.extend(starred)
        except Exception as e:
            print(f"[WARN] Could not fetch starred repos for user {user.email}: {e}")
        if username:
            try:
                contributed = await fetch_user_contributed_repos(access_token, username)
                all_repos.extend(contributed)
            except Exception as e:
                print(f"[WARN] Could not fetch contributed repos for user {user.email}: {e}")
    # Always add trending repos
    trending = []
    for lang in LANGUAGES:
        try:
            trending += await fetch_trending(lang)
        except Exception as e:
            print(f"[WARN] Could not fetch trending repos for {lang}: {e}")
    all_repos.extend(trending)
    # Deduplicate by repo URL
    seen = set()
    deduped_repos = []
    for repo in all_repos:
        url = repo.get('url') or repo.get('html_url')
        if url and url not in seen:
            seen.add(url)
            deduped_repos.append(repo)
    # Generate and store ideas
    new_idea_count = 0
    for repo in deduped_repos:
        repo_desc = repo.get('description') or repo.get('summary') or ''
        repo_url = repo.get('url') or repo.get('html_url')
        repo_name = repo.get('name')
        context = {
            "repo_description": repo_desc,
            "user_context": user_context,
            "prompt_type": "system",
            "user_id": user.id,
            "user_tier": getattr(user, 'tier', 'unknown')
        }
        try:
            result = await generate_idea_pitches(context)
            ideas = result.get('ideas', [])
            raw_blob = result.get('raw')
            for idea in ideas:
                session.add(Idea(
                    repo_url=repo_url,
                    repo_name=repo_name,
                    repo_description=repo_desc,
                    user_id=user.id,
                    title=idea.get("title", ""),
                    hook=idea.get("hook", ""),
                    value=idea.get("value", ""),
                    evidence=idea.get("evidence", ""),
                    differentiator=idea.get("differentiator", ""),
                    call_to_action=idea.get("call_to_action", ""),
                    score=idea.get("score"),
                    mvp_effort=idea.get("mvp_effort"),
                    repo_usage=idea.get("repo_usage"),
                    mvp_steps=idea.get("mvp_steps"),
                    prerequisites=idea.get("prerequisites"),
                    llm_raw_response=raw_blob
                ))
                new_idea_count += 1
            session.commit()
            print(f"    ✔️ Personalized ideas saved for user {user.email} and repo {repo_name}")
        except Exception as e:
            print(f"[ERROR] Failed to generate/store idea for user {user.email} and repo {repo_name}: {e}")
    # Notify user if new ideas were created
    if new_idea_count > 0:
        notification = Notification(
            user_id=user.id,
            type="new_ideas",
            message=f"You have {new_idea_count} new personalized ideas!",
            read=False
        )
        session.add(notification)
        session.commit()

def generate_personalized_ideas_for_users():
    """Generate personalized ideas for all users with GitHub access tokens."""
    session = SessionLocal()
    try:
        users = session.query(User).all()
        print(f"✨ Generating personalized ideas for {len(users)} users...")
        loop = asyncio.get_event_loop()
        for user in users:
            loop.run_until_complete(orchestrate_personalized_idea_generation(user, session))
        print("🎉 All personalized ideas generated and saved!")
    except Exception as e:
        print(f"❌ Error generating personalized ideas: {e}")
        session.rollback()
        raise
    finally:
        session.close()

def main():
    parser = argparse.ArgumentParser(description='Fetch trending repos and generate ideas')
    parser.add_argument('--fetch-only', action='store_true', help='Only fetch repos, do not generate ideas')
    parser.add_argument('--generate-only', action='store_true', help='Only generate ideas for existing repos')
    parser.add_argument('--personalized', action='store_true', help='Generate personalized ideas for all users')
    
    args = parser.parse_args()
    
    if args.fetch_only:
        fetch_repos_only()
    elif args.generate_only:
        generate_ideas_for_repos()
    elif args.personalized:
        generate_personalized_ideas_for_users()
    else:
        # Default behavior: fetch repos and generate ideas
        fetch_repos_only()
        generate_ideas_for_repos()

if __name__ == "__main__":
    main() 