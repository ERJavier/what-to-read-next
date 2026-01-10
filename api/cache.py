"""
Server-side caching utilities for API responses.
"""
import hashlib
import json
import logging
from functools import wraps
from typing import Any, Callable, Optional, TypeVar

from cachetools import TTLCache

logger = logging.getLogger(__name__)

# Global cache instance
# TTL cache: max 1000 entries, 10 minute TTL
_recommendation_cache: TTLCache[str, Any] = TTLCache(maxsize=1000, ttl=600)  # 10 minutes
_book_cache: TTLCache[str, Any] = TTLCache(maxsize=5000, ttl=3600)  # 1 hour for book details

F = TypeVar('F', bound=Callable[..., Any])


def cache_key_for_recommendation(query: str, limit: int) -> str:
    """Generate a cache key for recommendation requests."""
    key_data = json.dumps({"query": query, "limit": limit}, sort_keys=True)
    return hashlib.md5(key_data.encode()).hexdigest()


def cache_key_for_book(book_id: int) -> str:
    """Generate a cache key for book detail requests."""
    return f"book:{book_id}"


def get_cached_recommendation(query: str, limit: int) -> Optional[Any]:
    """Get cached recommendation if available."""
    key = cache_key_for_recommendation(query, limit)
    return _recommendation_cache.get(key)


def set_cached_recommendation(query: str, limit: int, data: Any) -> None:
    """Cache a recommendation response."""
    key = cache_key_for_recommendation(query, limit)
    _recommendation_cache[key] = data
    logger.debug(f"Cached recommendation for query: {query[:50]}...")


def get_cached_book(book_id: int) -> Optional[Any]:
    """Get cached book detail if available."""
    key = cache_key_for_book(book_id)
    return _book_cache.get(key)


def set_cached_book(book_id: int, data: Any) -> None:
    """Cache a book detail response."""
    key = cache_key_for_book(book_id)
    _book_cache[key] = data
    logger.debug(f"Cached book detail for ID: {book_id}")


def clear_recommendation_cache() -> None:
    """Clear all recommendation cache entries."""
    _recommendation_cache.clear()
    logger.info("Recommendation cache cleared")


def clear_book_cache() -> None:
    """Clear all book detail cache entries."""
    _book_cache.clear()
    logger.info("Book detail cache cleared")


def get_cache_stats() -> dict:
    """Get cache statistics."""
    return {
        "recommendations": {
            "size": len(_recommendation_cache),
            "max_size": _recommendation_cache.maxsize,
            "ttl": _recommendation_cache.ttl
        },
        "books": {
            "size": len(_book_cache),
            "max_size": _book_cache.maxsize,
            "ttl": _book_cache.ttl
        }
    }
