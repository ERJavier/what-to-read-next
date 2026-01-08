"""
Database query functions for book recommendations.
"""
import asyncio
import logging
from typing import List, Optional, Tuple

import psycopg

from api.config import settings
from api.database import get_db_connection

logger = logging.getLogger(__name__)


async def search_similar_books(
    query_embedding: List[float],
    limit: int = 10,
    similarity_threshold: Optional[float] = None
) -> List[Tuple]:
    """
    Search for books similar to the query embedding using vector cosine similarity.
    
    Args:
        query_embedding: Embedding vector for the query
        limit: Maximum number of results to return
        similarity_threshold: Cosine distance threshold (None uses default from settings)
    
    Returns:
        List of tuples: (id, ol_key, title, authors, first_publish_year, subjects, similarity)
    """
    threshold = similarity_threshold or settings.similarity_threshold
    
    # Ensure limit doesn't exceed maximum
    limit = min(limit, settings.max_recommendations)
    
    # SQL query using pgvector cosine distance operator (<=>)
    # 1 - (embedding <=> query) gives us similarity (higher is more similar)
    sql = """
        SELECT 
            id,
            ol_key,
            title,
            authors,
            first_publish_year,
            subjects,
            1 - (embedding <=> %s::vector) as similarity
        FROM books
        WHERE embedding <=> %s::vector < %s
        ORDER BY embedding <=> %s::vector
        LIMIT %s;
    """
    
    async with get_db_connection() as conn:
        def execute_query():
            with conn.cursor() as cur:
                cur.execute(
                    sql,
                    (query_embedding, query_embedding, threshold, query_embedding, limit)
                )
                return cur.fetchall()
        
        results = await asyncio.to_thread(execute_query)
    
    logger.debug(f"Found {len(results)} similar books for query")
    return results


async def get_book_by_id(book_id: int) -> Optional[Tuple]:
    """
    Get a book by its internal ID.
    
    Args:
        book_id: Internal book ID
    
    Returns:
        Tuple: (id, ol_key, title, authors, first_publish_year, subjects, search_content)
        or None if not found
    """
    sql = """
        SELECT 
            id,
            ol_key,
            title,
            authors,
            first_publish_year,
            subjects,
            search_content
        FROM books
        WHERE id = %s;
    """
    
    async with get_db_connection() as conn:
        def execute_query():
            with conn.cursor() as cur:
                cur.execute(sql, (book_id,))
                return cur.fetchone()
        
        result = await asyncio.to_thread(execute_query)
    
    return result


async def get_book_by_ol_key(ol_key: str) -> Optional[Tuple]:
    """
    Get a book by its Open Library key.
    
    Args:
        ol_key: Open Library work key (e.g., "/works/OL123456W")
    
    Returns:
        Tuple: (id, ol_key, title, authors, first_publish_year, subjects, search_content)
        or None if not found
    """
    sql = """
        SELECT 
            id,
            ol_key,
            title,
            authors,
            first_publish_year,
            subjects,
            search_content
        FROM books
        WHERE ol_key = %s;
    """
    
    async with get_db_connection() as conn:
        def execute_query():
            with conn.cursor() as cur:
                cur.execute(sql, (ol_key,))
                return cur.fetchone()
        
        result = await asyncio.to_thread(execute_query)
    
    return result


async def get_books_count() -> int:
    """
    Get the total number of books in the database.
    
    Returns:
        Total count of books
    """
    sql = "SELECT COUNT(*) FROM books;"
    
    async with get_db_connection() as conn:
        def execute_query():
            with conn.cursor() as cur:
                cur.execute(sql)
                return cur.fetchone()
        
        result = await asyncio.to_thread(execute_query)
    
    return result[0] if result else 0

