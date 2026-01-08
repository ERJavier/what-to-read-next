"""
Database connection and pooling management.
"""
import asyncio
import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

import psycopg
from psycopg_pool import ConnectionPool

from api.config import settings

logger = logging.getLogger(__name__)

# Global connection pool (sync pool, used with asyncio.to_thread)
_pool: ConnectionPool | None = None


async def init_db_pool() -> None:
    """Initialize the database connection pool."""
    global _pool
    
    if _pool is not None:
        logger.warning("Database pool already initialized")
        return
    
    try:
        _pool = ConnectionPool(
            settings.database_url,
            min_size=settings.database_pool_min_size,
            max_size=settings.database_pool_max_size,
            open=True,
        )
        logger.info(
            f"Database connection pool initialized "
            f"(min={settings.database_pool_min_size}, max={settings.database_pool_max_size})"
        )
    except Exception as e:
        logger.error(f"Failed to initialize database pool: {e}")
        raise


async def close_db_pool() -> None:
    """Close the database connection pool."""
    global _pool
    
    if _pool is not None:
        _pool.close()
        _pool = None
        logger.info("Database connection pool closed")


@asynccontextmanager
async def get_db_connection() -> AsyncGenerator[psycopg.Connection, None]:
    """
    Get a database connection from the pool.
    Uses asyncio.to_thread to run sync database operations in async context.
    
    Usage:
        async with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT ...")
                results = cur.fetchall()
    """
    if _pool is None:
        raise RuntimeError("Database pool not initialized. Call init_db_pool() first.")
    
    # Get connection from pool (sync operation in thread)
    conn = await asyncio.to_thread(_pool.getconn)
    try:
        yield conn
    finally:
        # Return connection to pool
        await asyncio.to_thread(_pool.putconn, conn)

