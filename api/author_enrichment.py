"""
Author name enrichment service.
Fetches author names from Open Library API using author keys.
"""
import asyncio
import logging
from typing import Dict, List, Optional
from urllib.parse import quote

import httpx

logger = logging.getLogger(__name__)

# Open Library API base URL
OPEN_LIBRARY_API_BASE = "https://openlibrary.org"

# Cache for author key -> name mappings (in-memory cache)
_author_cache: Dict[str, Optional[str]] = {}

# HTTP client with timeout
_http_client: Optional[httpx.AsyncClient] = None


def get_http_client() -> httpx.AsyncClient:
    """Get or create HTTP client for API requests."""
    global _http_client
    if _http_client is None:
        _http_client = httpx.AsyncClient(
            timeout=httpx.Timeout(10.0, connect=5.0),
            limits=httpx.Limits(max_keepalive_connections=10, max_connections=20),
            follow_redirects=True
        )
    return _http_client


async def close_http_client():
    """Close the HTTP client."""
    global _http_client
    if _http_client is not None:
        await _http_client.aclose()
        _http_client = None


def extract_author_key(author_entry: str) -> Optional[str]:
    """
    Extract author key from various formats.
    
    Examples:
        "/authors/OL123A" -> "OL123A"
        "OL123A" -> "OL123A"
        "/authors/OL123A/" -> "OL123A"
    """
    if not author_entry:
        return None
    
    # Remove leading/trailing slashes and "/authors/" prefix
    key = author_entry.strip().rstrip("/")
    if key.startswith("/authors/"):
        key = key.replace("/authors/", "", 1)
    if key.startswith("/"):
        key = key[1:]
    
    return key if key else None


async def fetch_author_name(author_key: str) -> Optional[str]:
    """
    Fetch author name from Open Library API.
    
    Args:
        author_key: Open Library author key (e.g., "OL123A")
    
    Returns:
        Author name if found, None otherwise
    """
    # Check cache first
    if author_key in _author_cache:
        return _author_cache[author_key]
    
    # Check if it's already a name (doesn't look like a key)
    if not author_key.startswith("OL") and "/authors/" not in author_key:
        # Might already be a name, cache it
        _author_cache[author_key] = author_key
        return author_key
    
    try:
        client = get_http_client()
        # Open Library API endpoint: /authors/{key}.json
        url = f"{OPEN_LIBRARY_API_BASE}/authors/{quote(author_key)}.json"
        
        response = await client.get(url)
        response.raise_for_status()
        
        data = response.json()
        # Extract name from response
        # Open Library author records have "name" field in the JSON response
        # The response structure: {"name": "Author Name", "key": "/authors/OL123A", ...}
        author_name = data.get("name")
        
        if author_name:
            # Cache the result
            _author_cache[author_key] = author_name
            logger.debug(f"Fetched author name for {author_key}: {author_name}")
            return author_name
        else:
            # Try alternative fields if "name" is not present (some records might use "personal_name" or other fields)
            # Fallback to personal_name if available
            personal_name = data.get("personal_name")
            if personal_name:
                _author_cache[author_key] = personal_name
                logger.debug(f"Fetched author name (personal_name) for {author_key}: {personal_name}")
                return personal_name
            
            # No name found, cache None to avoid repeated requests
            _author_cache[author_key] = None
            logger.warning(f"No name found for author key: {author_key} in response: {list(data.keys())}")
            return None
            
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            logger.debug(f"Author not found: {author_key}")
            _author_cache[author_key] = None
            return None
        else:
            logger.warning(f"HTTP error fetching author {author_key}: {e.response.status_code}")
            # Don't cache errors, allow retry
            return None
    except httpx.TimeoutException:
        logger.warning(f"Timeout fetching author: {author_key}")
        return None
    except Exception as e:
        logger.error(f"Error fetching author {author_key}: {e}", exc_info=True)
        return None


def is_author_key(entry: str) -> bool:
    """
    Determine if an entry is an author key that needs enrichment.
    
    Author keys typically:
    - Start with "/authors/"
    - Are just "OL..." identifiers (e.g., "OL123A")
    
    Author names typically:
    - Contain spaces (real names)
    - Don't start with "/authors/"
    - Don't match "OL[digits][letter]" pattern
    """
    if not entry:
        return False
    
    entry = entry.strip()
    
    # Keys start with "/authors/"
    if entry.startswith("/authors/"):
        return True
    
    # Keys are "OL" followed by digits and optional letter (e.g., "OL123A", "OL12345678M")
    if entry.startswith("OL") and len(entry) > 2:
        rest = entry[2:]  # Everything after "OL"
        # Check if rest is mostly digits with optional trailing letter
        if rest.replace("-", "").replace("A", "").isdigit() or (rest[-1].isalpha() and rest[:-1].isdigit()):
            return True
    
    return False


async def enrich_author_names(author_entries: List[str]) -> List[str]:
    """
    Enrich a list of author keys/names with actual names from Open Library API.
    
    Args:
        author_entries: List of author keys (e.g., ["/authors/OL123A"]) or names
    
    Returns:
        List of author names, falling back to cleaned keys if names can't be fetched
        Preserves original order
    """
    if not author_entries:
        return []
    
    # Track entries with their original positions to preserve order
    # Each entry is: (original_index, entry, is_key, extracted_key)
    entries_info = []
    
    for i, entry in enumerate(author_entries):
        if not entry:
            continue
        
        entry_stripped = entry.strip()
        
        if is_author_key(entry_stripped):
            # This looks like a key
            author_key = extract_author_key(entry_stripped)
            if author_key:
                entries_info.append((i, entry_stripped, True, author_key))
            else:
                # If extraction failed, treat as name
                entries_info.append((i, entry_stripped, False, None))
        else:
            # This looks like a name already
            entries_info.append((i, entry_stripped, False, None))
    
    # Separate keys that need enrichment
    keys_to_enrich = [info for info in entries_info if info[2]]  # is_key == True
    
    # If nothing needs enrichment, return names as-is
    if not keys_to_enrich:
        return [info[1] for info in entries_info]
    
    # Fetch author names in parallel (but limit concurrency)
    semaphore = asyncio.Semaphore(10)  # Max 10 concurrent requests
    
    async def fetch_with_limit(key: str) -> tuple[str, Optional[str]]:
        async with semaphore:
            name = await fetch_author_name(key)
            return (key, name)
    
    # Create mapping of key -> name
    keys = [info[3] for info in keys_to_enrich]  # extracted_key
    results = await asyncio.gather(*[fetch_with_limit(key) for key in keys], return_exceptions=True)
    
    # Build key -> name mapping
    key_to_name = {}
    for result in results:
        if isinstance(result, Exception):
            logger.warning(f"Error enriching author: {result}")
            continue
        
        key, name = result
        key_to_name[key] = name if name else None  # Store None if name not found
    
    # Reconstruct list preserving original order
    enriched = []
    for orig_idx, entry, is_key, extracted_key in entries_info:
        if is_key and extracted_key:
            # This was a key, try to get the name
            name = key_to_name.get(extracted_key)
            if name:
                enriched.append(name)
            else:
                # Fallback: use the original entry (at least it's consistent)
                enriched.append(entry)
        else:
            # This was already a name
            enriched.append(entry)
    
    return enriched


def clear_author_cache():
    """Clear the author name cache."""
    global _author_cache
    _author_cache.clear()


def get_author_cache_size() -> int:
    """Get the size of the author cache."""
    return len(_author_cache)
