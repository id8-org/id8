# backend/app/services/github.py

import httpx
import logging
import re
import asyncio
from typing import List, Dict, Any, Optional
from bs4 import BeautifulSoup, Tag
import random

# Set up logging
logger = logging.getLogger(__name__)

class GitHubTrendingService:
    """Enhanced GitHub trending repository service inspired by trendshift-backend"""
    
    def __init__(self):
        self.base_url = "https://github.com"
        self.session = None
        self.user_agents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15"
        ]
    
    async def _get_session(self) -> httpx.AsyncClient:
        """Get or create HTTP session with proper headers"""
        if not self.session:
            headers = {
                "User-Agent": random.choice(self.user_agents),
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.5",
                "Accept-Encoding": "gzip, deflate, br",
                "DNT": "1",
                "Connection": "keep-alive",
                "Upgrade-Insecure-Requests": "1",
                "Sec-Fetch-Dest": "document",
                "Sec-Fetch-Mode": "navigate",
                "Sec-Fetch-Site": "none",
                "Cache-Control": "max-age=0"
            }
            self.session = httpx.AsyncClient(
                timeout=30.0,
                headers=headers,
                follow_redirects=True
            )
        return self.session
    
    async def _make_request(self, url: str, retries: int = 3) -> Optional[str]:
        """Make HTTP request with retries and rate limiting"""
        session = await self._get_session()
        
        for attempt in range(retries):
            try:
                # Add random delay to avoid rate limiting
                if attempt > 0:
                    delay = random.uniform(1, 3)
                    await asyncio.sleep(delay)
                
                logger.info(f"Making request to {url} (attempt {attempt + 1})")
                response = await session.get(url)
                response.raise_for_status()
                
                logger.info(f"Successfully fetched {url}, content length: {len(response.text)}")
                return response.text
                
            except httpx.HTTPStatusError as e:
                logger.warning(f"HTTP error {e.response.status_code} for {url}: {e}")
                if e.response.status_code == 429:  # Rate limited
                    wait_time = int(e.response.headers.get('Retry-After', 60))
                    logger.info(f"Rate limited, waiting {wait_time} seconds")
                    await asyncio.sleep(wait_time)
                elif e.response.status_code == 404:
                    logger.error(f"Page not found: {url}")
                    return None
                else:
                    await asyncio.sleep(2 ** attempt)  # Exponential backoff
                    
            except Exception as e:
                logger.error(f"Request failed for {url}: {e}")
                if attempt < retries - 1:
                    await asyncio.sleep(2 ** attempt)
                else:
                    raise
        
        return None
    
    def _parse_count(self, text: str) -> int:
        """Parse count from text like '1.2k', '500', etc."""
        if not text:
            return 0
        
        text = text.strip().lower()
        
        # Handle k, m suffixes
        if 'k' in text:
            return int(float(text.replace('k', '')) * 1000)
        elif 'm' in text:
            return int(float(text.replace('m', '')) * 1000000)
        
        # Extract numbers
        numbers = re.findall(r'\d+(?:\.\d+)?', text)
        if numbers:
            return int(float(numbers[0]))
        
        return 0
    
    def _extract_repo_info(self, article: Tag, language: str) -> Optional[Dict[str, Any]]:
        """Extract repository information from an article element"""
        try:
            # Find repo name and owner
            repo_link = None
            repo_selectors = [
                'h2 a[href*="/"]',
                'h3 a[href*="/"]',
                'a[href*="/"][href*="/"][href*="/"]',  # Contains two slashes
                'h2 a',
                'h3 a'
            ]
            
            for selector in repo_selectors:
                repo_link = article.select_one(selector)
                if repo_link:
                    break
            
            if not repo_link:
                return None
            
            href = repo_link.get('href', '')
            repo_text = repo_link.get_text().strip()
            
            # Extract owner and name from href
            if isinstance(href, str) and href.startswith('/'):
                href = href[1:]
            
            if isinstance(href, str):
                parts = href.split('/')
                if len(parts) < 2:
                    return None
                
                owner, name = parts[0], parts[1]
            else:
                return None
            
            # Clean up name (remove any extra text)
            if '/' in repo_text:
                repo_text_parts = repo_text.split('/', 1)
                if len(repo_text_parts) == 2:
                    owner, name = repo_text_parts[0].strip(), repo_text_parts[1].strip()
            
            # Extract description
            description = ""
            desc_selectors = [
                'p[class*="description"]',
                'p[class*="text"]',
                'p',
                'div[class*="description"]',
                'div[class*="text"]'
            ]
            
            for selector in desc_selectors:
                desc_elem = article.select_one(selector)
                if desc_elem:
                    description = desc_elem.get_text().strip()
                    if description and len(description) > 10:
                        break
            
            # Extract language
            repo_language = language
            lang_selectors = [
                'span[itemprop="programmingLanguage"]',
                '[class*="language"]',
                'span[class*="lang"]',
                '[data-testid="language"]'
            ]
            
            for selector in lang_selectors:
                lang_elem = article.select_one(selector)
                if lang_elem:
                    repo_language = lang_elem.get_text().strip()
                    break
            
            # Extract stars and forks
            stars_count = 0
            forks_count = 0
            
            # Look for star/fork links with various patterns
            star_patterns = [
                r'/stargazers',
                r'star',
                r'stars'
            ]
            
            fork_patterns = [
                r'/forks',
                r'fork',
                r'forks'
            ]
            
            # Find all links and check for star/fork patterns
            all_links = article.find_all('a', href=True)
            
            for link in all_links:
                href = link.get('href', '').lower()
                text = link.get_text().strip().lower()
                
                # Check for stars
                if any(pattern in href for pattern in star_patterns) or 'star' in text:
                    stars_count = self._parse_count(link.get_text())
                
                # Check for forks
                if any(pattern in href for pattern in fork_patterns) or 'fork' in text:
                    forks_count = self._parse_count(link.get_text())
            
            # Fallback: look for numbers near star/fork icons
            if stars_count == 0 or forks_count == 0:
                spans = article.find_all('span')
                for span in spans:
                    text = span.get_text().strip()
                    if text and re.match(r'^\d+[km]?$', text):
                        # Check if this span is near a star/fork indicator
                        parent = span.parent
                        if parent:
                            parent_text = parent.get_text().lower()
                            if 'star' in parent_text and stars_count == 0:
                                stars_count = self._parse_count(text)
                            elif 'fork' in parent_text and forks_count == 0:
                                forks_count = self._parse_count(text)
            
            return {
                "name": f"{owner}/{name}",
                "url": f"{self.base_url}/{owner}/{name}",
                "description": description,
                "language": repo_language,
                "stargazers_count": stars_count,
                "forks_count": forks_count,
                "watchers_count": 0,  # GitHub doesn't show this on trending page
                "owner": owner,
                "repo_name": name
            }
            
        except Exception as e:
            logger.error(f"Error extracting repo info: {e}")
            return None
    
    async def fetch_trending(self, language: str = "", period: str = "daily") -> List[Dict[str, Any]]:
        """
        Fetch trending repositories from GitHub with robust, up-to-date selectors and fallback logic
        """
        try:
            # Build URL
            if language:
                url = f"{self.base_url}/trending/{language.lower()}?since={period}"
            else:
                url = f"{self.base_url}/trending?since={period}"

            logger.info(f"Fetching trending repos from {url}")

            # Make request
            html_content = await self._make_request(url)
            if not html_content:
                logger.error(f"Failed to fetch content from {url}")
                # Fallback to cache if available
                if hasattr(self, '_last_trending_cache'):
                    logger.warning("Serving cached trending repos due to fetch failure.")
                    return self._last_trending_cache
                return []

            soup = BeautifulSoup(html_content, 'html.parser')
            articles = soup.select('article.Box-row')
            if not articles:
                logger.error(f"No trending repo articles found with selector 'article.Box-row' for {language}.")
                snippet = html_content[:1000] if html_content else ''
                logger.error(f"HTML snippet: {snippet}")
                # Fallback to cache if available
                if hasattr(self, '_last_trending_cache'):
                    logger.warning("Serving cached trending repos due to selector failure.")
                    return self._last_trending_cache
                return []

            repos = []
            for article in articles[:25]:
                try:
                    repo_link = article.select_one('h2 > a')
                    if not repo_link:
                        continue
                    href = repo_link.get('href', '')
                    if not isinstance(href, str):
                        continue
                    owner_repo = href.lstrip('/')
                    # Improved description extraction
                    desc_elem = article.select_one('p.col-9.color-fg-muted.my-1.pr-4')
                    if not desc_elem:
                        # Fallback: any <p> tag
                        desc_elem = article.select_one('p')
                    description = desc_elem.text.strip() if desc_elem else ""
                    language_elem = article.select_one('span[itemprop="programmingLanguage"]')
                    stars_elem = article.select_one('a[href$="/stargazers"]')
                    forks_elem = article.select_one('a[href$="/network/members"]')
                    repos.append({
                        "name": owner_repo,
                        "url": f"https://github.com/{owner_repo}",
                        "description": description,
                        "language": language_elem.text.strip() if language_elem else "",
                        "stargazers_count": self._parse_count(stars_elem.text) if stars_elem else 0,
                        "forks_count": self._parse_count(forks_elem.text) if forks_elem else 0,
                        "watchers_count": 0,  # Not available on trending page
                        "owner": owner_repo.split('/')[0] if '/' in owner_repo else owner_repo,
                        "repo_name": owner_repo.split('/')[1] if '/' in owner_repo else owner_repo
                    })
                except Exception as e:
                    logger.error(f"Error extracting repo info from trending: {e}")
                    continue

            logger.info(f"Successfully extracted {len(repos)} trending repositories for {language}")
            # Cache the result for fallback
            self._last_trending_cache = repos
            return repos
        except Exception as e:
            logger.error(f"Error fetching trending repos for {language}: {e}")
            # Fallback to cache if available
            if hasattr(self, '_last_trending_cache'):
                logger.warning("Serving cached trending repos due to exception.")
                return self._last_trending_cache
            return []
    
    async def fetch_multiple_languages(self, languages: List[str], period: str = "daily") -> List[Dict[str, Any]]:
        """Fetch trending repos for multiple languages"""
        all_repos = []
        
        for language in languages:
            try:
                repos = await self.fetch_trending(language, period)
                all_repos.extend(repos)
                
                # Add delay between requests
                await asyncio.sleep(random.uniform(1, 2))
                
            except Exception as e:
                logger.error(f"Error fetching repos for {language}: {e}")
                continue
        
        # Remove duplicates based on URL
        seen_urls = set()
        unique_repos = []
        for repo in all_repos:
            if repo['url'] not in seen_urls:
                seen_urls.add(repo['url'])
                unique_repos.append(repo)
        
        logger.info(f"Total unique repos fetched: {len(unique_repos)}")
        return unique_repos

# Global instance
github_service = GitHubTrendingService()

# Backward compatibility functions
async def fetch_trending(language: str, period: str = "daily") -> List[Dict[str, Any]]:
    """
    Fetch trending repositories from the GitHub Trending API JSON feed and map to backend Repo model.
    """
    try:
        url = "https://raw.githubusercontent.com/isboyjc/github-trending-api/main/data/daily/all.json"
        logger.info(f"Fetching trending repos for {language} from {url}")
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            data = response.json()
            items = data.get("items", [])

            # Filter by language (case-insensitive)
            filtered = [
                {
                    "name": item["title"] if "title" in item else "",
                    "url": item["url"] if "url" in item else "",
                    "description": item["description"] if "description" in item else "",
                    "language": item["language"] if "language" in item else "Unknown",
                }
                for item in items
                if isinstance(item, dict) and "language" in item and isinstance(item["language"], str) and item["language"].lower() == language.lower()
            ]
            logger.info(f"Found {len(filtered)} trending repos for language: {language}")
            return filtered
    except Exception as e:
        logger.error(f"Error fetching trending repos for {language}: {e}")
        return []

async def refresh_trending_repos(db, languages: Optional[List[str]] = None, period: str = "daily") -> int:
    """Refresh trending repositories with enhanced service"""
    if not languages:
        languages = ["Python", "JavaScript", "TypeScript", "Rust", "Go", "Ruby"]
    
    try:
        repos = await github_service.fetch_multiple_languages(languages, period)
        
        if not repos:
            logger.warning("No repos fetched from GitHub")
            return 0
        
        # Save repos to database
        from app.utilities import save_repos
        saved_count = save_repos(repos, db, period)
        
        logger.info(f"Successfully refreshed {saved_count} trending repositories")
        return saved_count
        
    except Exception as e:
        logger.error(f"Error refreshing trending repos: {e}")
        return 0

async def clear_repo_cache():
    """Clear any cached data (placeholder for future implementation)"""
    logger.info("Clearing repo cache")
    # Future: implement Redis cache clearing if needed
