#!/usr/bin/env python3
"""
Quick script to generate ideas for existing repos
"""
import sys
import os
import asyncio

# Add project root to Python path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.db import SessionLocal
from app.models import Repo, Idea
from app.llm import generate_idea_pitches

async def generate_ideas_for_existing_repos():
    """Generate ideas for repos that don't have any ideas yet"""
    session = SessionLocal()
    try:
        # Get all repos
        repos = session.query(Repo).all()
        print(f"Found {len(repos)} repos in database")
        
        # Get repos that don't have ideas
        repos_without_ideas = []
        for repo in repos:
            idea_count = session.query(Idea).filter(Idea.repo_id == repo.id).count()
            if idea_count == 0:
                repos_without_ideas.append(repo)
        
        print(f"Found {len(repos_without_ideas)} repos without ideas")
        
        if not repos_without_ideas:
            print("All repos already have ideas!")
            return
        
        # Generate ideas for repos without ideas
        for i, repo in enumerate(repos_without_ideas[:10]):  # Limit to first 10 for testing
            print(f"[{i+1}/{min(10, len(repos_without_ideas))}] Generating ideas for: {repo.name}")
            
            try:
                # Use repo description for idea generation
                repo_description = repo.summary or "No description available"
                print(f"    Using description: {repo_description[:100]}...")
                
                # Generate ideas using the LLM
                result = await generate_idea_pitches(repo_description)
                raw_response = result.get('raw')
                ideas = result.get('ideas', [])
                
                if ideas and isinstance(ideas, list) and any(i.get('title') for i in ideas):
                    # Save successful ideas
                    for idea in ideas:
                        # Validate and clean idea data
                        mvp_effort = idea.get("mvp_effort")
                        if not isinstance(mvp_effort, int):
                            mvp_effort = 5  # Default value
                        
                        score = idea.get("score")
                        if not isinstance(score, int):
                            score = 5  # Default value
                        
                        # Create idea record
                        idea_record = Idea(
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
                            type=idea.get("type"),
                            status="suggested",
                            llm_raw_response=raw_response
                        )
                        session.add(idea_record)
                    
                    session.commit()
                    print(f"    ✅ Generated {len(ideas)} ideas for: {repo.name}")
                else:
                    print(f"    ⚠️ No valid ideas generated for: {repo.name}")
                    if raw_response:
                        print(f"    Raw response: {raw_response[:200]}...")
                    else:
                        print("    No raw response available")
                    
            except Exception as e:
                print(f"    ❌ Error generating ideas for {repo.name}: {e}")
                session.rollback()
                continue
            
            # Small delay between repos
            await asyncio.sleep(1)
        
        print("🎉 Idea generation completed!")
        
    except Exception as e:
        print(f"💥 Error: {e}")
        session.rollback()
        raise
    finally:
        session.close()

if __name__ == "__main__":
    asyncio.run(generate_ideas_for_existing_repos()) 