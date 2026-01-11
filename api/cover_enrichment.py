"""
Cover URL enrichment service.
Fetches edition information from Open Library API to get cover URLs.
Covers are associated with editions, not works.
"""
import asyncio
import logging
from typing import Dict, Optional

import httpx

logger = logging.getLogger(__name__)

# Open Library API base URL
OPEN_LIBRARY_API_BASE = "https://openlibrary.org"
# Open Library Covers API base URL
OPEN_LIBRARY_COVERS_BASE = "https://covers.openlibrary.org"

# Cache for work key -> cover URL mappings (in-memory cache)
_cover_cache: Dict[str, Optional[str]] = {}

# Import HTTP client from author_enrichment to share the same client
from api.author_enrichment import get_http_client


def extract_work_key(ol_key: str) -> Optional[str]:
    """
    Extract and normalize work key for API requests.
    
    Examples:
        "/works/OL123456W" -> "/works/OL123456W"
        "OL123456W" -> "/works/OL123456W"
    """
    if not ol_key:
        return None
    
    ol_key = ol_key.strip()
    
    # If it already starts with /works/, return as-is
    if ol_key.startswith("/works/"):
        return ol_key
    
    # If it's just the work ID, add /works/ prefix
    work_id = ol_key.lstrip("/")
    if work_id.startswith("OL") and work_id.endswith("W"):
        return f"/works/{work_id}"
    
    return None


def extract_edition_id(edition_key: str) -> Optional[str]:
    """
    Extract edition ID from edition key.
    
    Examples:
        "/books/OL1234567M" -> "OL1234567M"
        "OL1234567M" -> "OL1234567M"
    """
    if not edition_key:
        return None
    
    edition_key = edition_key.strip().lstrip("/")
    
    # Remove /books/ prefix if present
    if edition_key.startswith("books/"):
        edition_key = edition_key.replace("books/", "", 1)
    
    # Edition IDs typically start with OL and end with M (or other letters)
    if edition_key.startswith("OL"):
        return edition_key
    
    return None


def generate_cover_url_from_edition_id(edition_id: str, size: str = 'M') -> str:
    """
    Generate cover URL from edition ID.
    
    Args:
        edition_id: Edition OLID (e.g., "OL1234567M")
        size: Cover size - 'S' (small), 'M' (medium), 'L' (large)
    
    Returns:
        Cover image URL
    """
    if size not in ('S', 'M', 'L'):
        size = 'M'  # Default to medium
    
    # Open Library covers API format: https://covers.openlibrary.org/b/olid/{edition_id}-{size}.jpg
    return f"{OPEN_LIBRARY_COVERS_BASE}/b/olid/{edition_id}-{size}.jpg"


async def fetch_cover_url_from_work(work_key: str) -> Optional[str]:
    """
    Fetch cover URL for a work by getting its first edition.
    
    Args:
        work_key: Open Library work key (e.g., "/works/OL123456W")
    
    Returns:
        Cover URL if found, None otherwise
    """
    # Check cache first
    if work_key in _cover_cache:
        return _cover_cache[work_key]
    
    normalized_work_key = extract_work_key(work_key)
    if not normalized_work_key:
        logger.debug(f"Invalid work key format: {work_key}")
        _cover_cache[work_key] = None
        return None
    
    try:
        client = get_http_client()
        # Fetch work editions: /works/{work_key}/editions.json
        url = f"{OPEN_LIBRARY_API_BASE}{normalized_work_key}/editions.json?limit=1"
        
        # Add timeout to prevent hanging (client has global timeout, but explicit is clearer)
        response = await client.get(url, timeout=8.0)
        response.raise_for_status()
        
        data = response.json()
        entries = data.get("entries", [])
        
        if not entries:
            logger.debug(f"No editions found for work: {work_key}")
            _cover_cache[work_key] = None
            return None
        
        # Get the first edition
        first_edition = entries[0]
        edition_key = first_edition.get("key")
        
        if not edition_key:
            logger.debug(f"No edition key found for work: {work_key}")
            _cover_cache[work_key] = None
            return None
        
        # Extract edition ID from edition key
        edition_id = extract_edition_id(edition_key)
        if not edition_id:
            logger.debug(f"Could not extract edition ID from: {edition_key}")
            _cover_cache[work_key] = None
            return None
        
        # Check if edition has ISBN (preferred for cover URLs)
        # ISBN-based covers are more reliable than OLID-based
        isbn_13 = first_edition.get("isbn_13")
        isbn_10 = first_edition.get("isbn_10")
        
        cover_url = None
        if isbn_13 and len(isbn_13) > 0:
            # Use ISBN-13 if available
            isbn = isbn_13[0].replace("-", "").replace(" ", "")
            cover_url = f"{OPEN_LIBRARY_COVERS_BASE}/b/isbn/{isbn}-M.jpg"
        elif isbn_10 and len(isbn_10) > 0:
            # Fall back to ISBN-10
            isbn = isbn_10[0].replace("-", "").replace(" ", "")
            cover_url = f"{OPEN_LIBRARY_COVERS_BASE}/b/isbn/{isbn}-M.jpg"
        else:
            # Use edition OLID as fallback
            cover_url = generate_cover_url_from_edition_id(edition_id, 'M')
        
        if cover_url:
            _cover_cache[work_key] = cover_url
            logger.debug(f"Found cover URL for work {work_key}: {cover_url}")
            return cover_url
        
        _cover_cache[work_key] = None
        return None
        
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            logger.debug(f"Work not found: {work_key}")
        else:
            logger.warning(f"HTTP error fetching editions for work {work_key}: {e.response.status_code}")
        _cover_cache[work_key] = None
        return None
    except httpx.TimeoutException:
        logger.warning(f"Timeout fetching editions for work: {work_key}")
        return None
    except Exception as e:
        logger.error(f"Error fetching cover for work {work_key}: {e}", exc_info=True)
        # Don't cache errors, allow retry
        return None


async def get_cover_url(ol_key: Optional[str]) -> Optional[str]:
    """
    Get medium-sized cover URL for a work.
    
    This function fetches the work's editions and returns the cover URL
    from the first edition, preferring ISBN-based URLs when available.
    
    Args:
        ol_key: Open Library work key (e.g., "/works/OL123456W")
    
    Returns:
        Medium-sized cover URL or None if not found
    """
    if not ol_key:
        return None
    
    return await fetch_cover_url_from_work(ol_key)


def clear_cover_cache():
    """Clear the cover URL cache."""
    global _cover_cache
    _cover_cache.clear()


def get_cover_cache_size() -> int:
    """Get the size of the cover cache."""
    return len(_cover_cache)
