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
            timeout=5.0,  # Timeout for getting a connection from pool
            max_waiting=10,  # Max number of requests waiting for a connection
            max_idle=300,  # Close idle connections after 5 minutes
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
    # Use getconn with timeout handling via asyncio.wait_for
    try:
        conn = await asyncio.wait_for(
            asyncio.to_thread(_pool.getconn),
            timeout=10.0
        )
    except asyncio.TimeoutError:
        logger.error("Timeout waiting for database connection from pool")
        raise RuntimeError("Could not get database connection: timeout after 10 seconds")
    except Exception as e:
        logger.error(f"Failed to get database connection from pool: {e}")
        raise RuntimeError(f"Could not get database connection: {e}") from e
    
    try:
        yield conn
    finally:
        # Return connection to pool
        try:
            await asyncio.to_thread(_pool.putconn, conn)
        except Exception as e:
            logger.warning(f"Error returning connection to pool: {e}")

