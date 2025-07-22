import asyncio
from app.db import SessionLocal
from app.models import Repo, Idea, User, Team
from app.llm import generate_idea_pitches
from app.services.github import github_service

LANGUAGES = ["Python", "TypeScript", "JavaScript", "Rust", "Go", "Ruby"]


async def run_nightly_pipeline():
    session = SessionLocal()
    try:
        print("🚀 Starting nightly idea generation pipeline...")
        # Fetch all active users and their teams
        users = session.query(User).filter(User.is_active == True).all()
        print(f"👥 Generating system ideas for {len(users)} users...")
        # Use the enhanced GitHub service to fetch trending repos
        print("📡 Fetching trending repositories from GitHub...")
        all_repos = await github_service.fetch_multiple_languages(LANGUAGES, "daily")
        if not all_repos:
            print("❌ No repositories fetched from GitHub")
            return
        print(f"✨ Total repos to process: {len(all_repos)}")
        # For each user, generate ideas tailored to them
        for user in users:
            print(f"🔹 Generating ideas for user: {user.email} (team: {user.team_id})")
            # Build user context (profile, etc.)
            user_context = str(user.profile.background) if user.profile and user.profile.background else ""
            for idx, repo_data in enumerate(all_repos):
                print(f"  [{idx+1}/{len(all_repos)}] Processing repo: {repo_data['name']}")
                existing_repo = session.query(Repo).filter_by(name=repo_data["name"]).first()
                if existing_repo:
                    repo = existing_repo
                else:
                    repo = Repo(
                        name=repo_data["name"],
                        url=repo_data["url"],
                        summary=repo_data.get("description", "")[:500] or "No description provided.",
                        language=repo_data.get("language", "Unknown"),
                        trending_period="daily"
                    )
                    session.add(repo)
                    session.commit()
                max_attempts = 3
                for attempt in range(1, max_attempts + 1):
                    try:
                        print(f"    🧠 Attempt {attempt} to generate ideas...")
                        result = await generate_idea_pitches({
                            'repo_description': str(repo.summary) if repo.summary is not None else '',
                            'user_context': user_context,
                            'prompt_type': 'system'
                        })
                        raw_response = result.get('raw')
                        ideas = result.get('ideas', [])
                        if ideas and isinstance(ideas, list) and any(i.get('title') for i in ideas):
                            for idea in ideas:
                                mvp_effort = idea.get("mvp_effort")
                                if not isinstance(mvp_effort, int):
                                    mvp_effort = 5
                                score = idea.get("score")
                                if not isinstance(score, int):
                                    score = 5
                                idea_record = Idea(
                                    repo_id=repo.id,
                                    user_id=user.id,
                                    # Set team_id if user is part of a team
                                    team_id=user.team_id if user.team_id else None,
                                    title=idea.get("title", ""),
                                    hook=idea.get("hook", ""),
                                    value=idea.get("value", ""),
                                    evidence=idea.get("evidence", ""),
                                    differentiator=idea.get("differentiator", ""),
                                    call_to_action=idea.get("call_to_action", ""),
                                    score=score,
                                    mvp_effort=mvp_effort,
                                    type=idea.get("type"),
                                    status="suggested",
                                    llm_raw_response=raw_response,
                                    source_type="system"
                                )
                                session.add(idea_record)
                            session.commit()
                            print(f"    ✅ Generated {len(ideas)} ideas for: {repo.name} (user: {user.email})")
                            break
                        else:
                            error_idea = Idea(
                                repo_id=repo.id,
                                user_id=user.id,
                                team_id=user.team_id if user.team_id else None,
                                title=f"[ERROR] Failed to parse ideas for {repo.name}",
                                hook="See llm_raw_response for details",
                                value=None,
                                evidence=None,
                                differentiator=None,
                                call_to_action=None,
                                score=None,
                                mvp_effort=None,
                                type=None,
                                status="suggested",
                                llm_raw_response=raw_response,
                                source_type="system"
                            )
                            session.add(error_idea)
                            session.commit()
                            print("    ⚠️ Failed to parse ideas. Saved error record for debugging.")
                    except Exception as idea_err:
                        print(f"    ❌ Failed to generate ideas for {repo.name} (attempt {attempt}): {idea_err}")
                        if attempt == max_attempts:
                            error_idea = Idea(
                                repo_id=repo.id,
                                user_id=user.id,
                                team_id=user.team_id if user.team_id else None,
                                title=f"[ERROR] Idea generation failed for {repo.name}",
                                hook=f"Error: {str(idea_err)}",
                                value=None,
                                evidence=None,
                                differentiator=None,
                                call_to_action=None,
                                score=None,
                                mvp_effort=None,
                                type=None,
                                status="suggested",
                                llm_raw_response=None,
                                source_type="system"
                            )
                            session.add(error_idea)
                            session.commit()
                    if attempt < max_attempts:
                        await asyncio.sleep(2)
                print("    ⏳ Waiting 1 second before next repo...")
                await asyncio.sleep(1)
        print("🎉 Nightly idea generation pipeline completed successfully!")
    except Exception as err:
        print(f"💥 [CRITICAL] Pipeline failed: {err}")
        import traceback
        traceback.print_exc()
    finally:
        session.close()

if __name__ == "__main__":
    asyncio.run(run_nightly_pipeline())