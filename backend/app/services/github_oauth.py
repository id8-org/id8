import httpx
import os
from typing import List, Dict, Any

GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET")
GITHUB_OAUTH_REDIRECT_URI = os.getenv("GITHUB_OAUTH_REDIRECT_URI", "http://localhost:8000/auth/github/callback")

async def get_github_access_token(code: str) -> str:
    """Exchange code for GitHub access token"""
    url = "https://github.com/login/oauth/access_token"
    headers = {"Accept": "application/json"}
    data = {
        "client_id": GITHUB_CLIENT_ID,
        "client_secret": GITHUB_CLIENT_SECRET,
        "code": code,
        "redirect_uri": GITHUB_OAUTH_REDIRECT_URI
    }
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, headers=headers, data=data)
        resp.raise_for_status()
        token_data = resp.json()
        if "access_token" not in token_data:
            raise Exception(f"GitHub token exchange failed: {token_data}")
        return token_data["access_token"]

async def get_github_user_info(access_token: str) -> dict:
    """Fetch user info from GitHub using access token"""
    url = "https://api.github.com/user"
    headers = {"Authorization": f"Bearer {access_token}", "Accept": "application/json"}
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers=headers)
        resp.raise_for_status()
        user_data = resp.json()
        # Fetch email if not public
        if not user_data.get("email"):
            email_resp = await client.get("https://api.github.com/user/emails", headers=headers)
            email_resp.raise_for_status()
            emails = email_resp.json()
            primary_email = next((e["email"] for e in emails if e.get("primary")), None)
            user_data["email"] = primary_email
        return user_data

async def fetch_user_starred_repos(access_token: str) -> List[Dict[str, Any]]:
    """Fetch user's starred repos from GitHub"""
    url = "https://api.github.com/user/starred"
    headers = {"Authorization": f"Bearer {access_token}", "Accept": "application/vnd.github.v3+json"}
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers=headers)
        resp.raise_for_status()
        return resp.json()

async def fetch_user_contributed_repos(access_token: str, username: str) -> List[Dict[str, Any]]:
    """Fetch repos the user has contributed to (via events API)"""
    url = f"https://api.github.com/users/{username}/events/public"
    headers = {"Authorization": f"Bearer {access_token}", "Accept": "application/vnd.github.v3+json"}
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers=headers)
        resp.raise_for_status()
        events = resp.json()
        repo_set = set()
        repos = []
        for event in events:
            repo_info = event.get("repo")
            if repo_info and repo_info["name"] not in repo_set:
                repo_set.add(repo_info["name"])
                repos.append({"name": repo_info["name"], "url": f"https://github.com/{repo_info['name']}"})
        return repos

# For trending repos, reuse or import from app.services.github if possible
from app.services.github import fetch_trending as fetch_trending_repos 