"""
WhatToRead API - FastAPI Application
"""
import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse

from api.author_enrichment import close_http_client, enrich_author_names
from api.cover_enrichment import get_cover_url
from api.cache import (
    clear_book_cache,
    clear_recommendation_cache,
    get_cached_book,
    get_cached_recommendation,
    get_cache_stats,
    set_cached_book,
    set_cached_recommendation,
)
from api.config import settings, setup_logging
from api.database import close_db_pool, init_db_pool
from api.embedding import encode_query, load_model
from api.middleware import RequestLoggingMiddleware
from api.models import BookDetailResponse, BookResponse, RecommendationRequest
from api.performance import get_performance_monitor, track_performance
from api.queries import get_book_by_id, search_similar_books

# Setup logging
setup_logging(settings.log_level, settings.log_file)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for startup and shutdown events.
    """
    # Startup
    logger.info("🚀 Starting WhatToRead API...")
    
    # Initialize database pool
    try:
        await init_db_pool()
    except Exception as e:
        logger.error(f"❌ Failed to initialize database pool: {e}")
        raise
    
    # Load embedding model
    try:
        load_model()
    except Exception as e:
        logger.error(f"❌ Failed to load embedding model: {e}")
        raise
    
    logger.info("✅ API startup complete")
    
    yield
    
    # Shutdown
    logger.info("🛑 Shutting down WhatToRead API...")
    await close_db_pool()
    await close_http_client()
    logger.info("✅ API shutdown complete")


# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    description="Semantic book recommendation engine API using vector search",
    version=settings.app_version,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Compression middleware (compress responses > 1KB)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# CORS middleware
# Note: If allow_origins=["*"], allow_credentials must be False
# Check if "*" is in the origins list to determine if we should use credentials
use_credentials = "*" not in settings.cors_origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=use_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request logging middleware (add after CORS so it logs all requests)
app.add_middleware(RequestLoggingMiddleware)


# Global exception handlers
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle request validation errors."""
    logger.warning(f"Validation error on {request.url.path}: {exc.errors()}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": "Validation error",
            "errors": exc.errors()
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle unexpected exceptions."""
    logger.error(
        f"Unhandled exception on {request.url.path}: {exc}",
        exc_info=True
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "Internal server error",
            "message": str(exc) if settings.debug else "An unexpected error occurred"
        }
    )


@app.get("/health", tags=["Health"])
async def health_check():
    """
    Health check endpoint.
    
    Returns the status of the API service.
    """
    return {
        "status": "ok",
        "service": "whattoread-api",
        "version": settings.app_version
    }


@app.get("/cache/stats", tags=["Cache"])
async def get_cache_statistics():
    """
    Get cache statistics.
    
    Returns information about cache usage, size, and TTL settings.
    """
    return get_cache_stats()


@app.post("/cache/clear", tags=["Cache"])
async def clear_cache(cache_type: str = "all"):
    """
    Clear cache entries.
    
    **Parameters:**
    - `cache_type`: Type of cache to clear ("recommendations", "books", or "all")
    
    **Response:**
    - Returns confirmation message
    """
    if cache_type == "recommendations":
        clear_recommendation_cache()
        return {"message": "Recommendation cache cleared"}
    elif cache_type == "books":
        clear_book_cache()
        return {"message": "Book detail cache cleared"}
    elif cache_type == "all":
        clear_recommendation_cache()
        clear_book_cache()
        return {"message": "All caches cleared"}
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid cache_type. Must be 'recommendations', 'books', or 'all'"
        )


@app.get("/performance/stats", tags=["Performance"])
async def get_performance_stats(endpoint: str = None, method: str = "GET"):
    """
    Get performance statistics for endpoints.
    
    **Parameters:**
    - `endpoint`: Optional specific endpoint to get stats for
    - `method`: HTTP method (default: GET)
    
    **Response:**
    - Returns performance statistics including count, avg, min, max, p95, p99 response times
    """
    monitor = get_performance_monitor()
    
    if endpoint:
        return monitor.get_endpoint_stats(endpoint, method)
    else:
        return monitor.get_all_stats()


@app.get("/", tags=["Root"])
async def root():
    """
    Root endpoint.
    
    Returns basic API information.
    """
    return {
        "message": settings.app_name,
        "version": settings.app_version,
        "docs": "/docs",
        "health": "/health"
    }


@app.post("/recommend", response_model=list[BookResponse], tags=["Recommendations"])
async def get_recommendations(request: RecommendationRequest):
    """
    Get book recommendations based on a semantic query.
    
    This endpoint uses vector similarity search to find books that match
    the semantic meaning of your query, not just keyword matches.
    
    **Example queries:**
    - "dark psychological thrillers with unreliable narrators"
    - "philosophical science fiction about consciousness"
    - "melancholic coming-of-age stories"
    - "mystery novels in Victorian London"
    
    **Response:**
    - Returns a list of books ordered by similarity (highest first)
    - Similarity scores range from 0.0 to 1.0 (higher is more similar)
    - Only books above the similarity threshold are returned
    
    **Caching:**
    - Responses are cached for 10 minutes to improve performance
    """
    async with track_performance("/recommend", "POST") as metric:
        try:
            # Check cache first
            cached_result = get_cached_recommendation(request.query, request.limit)
            if cached_result is not None:
                logger.debug(f"Cache hit for recommendation query: {request.query[:50]}...")
                metric.status_code = 200
                return cached_result
            
            # Encode the query into an embedding vector
            logger.info(f"Processing recommendation request: query='{request.query[:50]}...', limit={request.limit}")
            query_embedding = encode_query(request.query)
            
            # Search for similar books
            results = await search_similar_books(
                query_embedding=query_embedding,
                limit=request.limit
            )
            
            if not results:
                logger.info("No books found matching the query")
                empty_result = []
                set_cached_recommendation(request.query, request.limit, empty_result)
                metric.status_code = 200
                return empty_result
            
            # Format response and enrich author names and cover URLs
            books = []
            # Fetch covers in parallel for better performance
            cover_urls = await asyncio.gather(*[get_cover_url(row[1]) for row in results])
            
            for idx, row in enumerate(results):
                book_id, ol_key, title, authors, year, subjects, similarity = row
                # Enrich author names from Open Library API if needed
                enriched_authors = await enrich_author_names(authors or [])
                # Use pre-fetched cover URL
                cover_url = cover_urls[idx]
                books.append(BookResponse(
                    id=book_id,
                    ol_key=ol_key,
                    title=title,
                    authors=enriched_authors,
                    first_publish_year=year,
                    subjects=subjects or [],
                    cover_url=cover_url,
                    similarity=float(similarity)
                ))
            
            # Cache the result
            set_cached_recommendation(request.query, request.limit, books)
            
            logger.info(f"Returning {len(books)} recommendations")
            metric.status_code = 200
            return books
            
        except HTTPException:
            metric.status_code = 500
            raise
        except Exception as e:
            logger.error(f"Error processing recommendation request: {e}", exc_info=True)
            metric.status_code = 500
            raise HTTPException(
                status_code=500,
                detail=f"Failed to get recommendations: {str(e)}"
            )


@app.get("/books/{book_id}", response_model=BookDetailResponse, tags=["Books"])
async def get_book(book_id: int):
    """
    Get detailed information about a specific book by ID.
    
    **Parameters:**
    - `book_id`: Internal book ID (integer)
    
    **Response:**
    - Returns complete book information including search content used for embeddings
    
    **Error Responses:**
    - `404 Not Found`: Book with the given ID does not exist
    
    **Caching:**
    - Responses are cached for 1 hour to improve performance
    """
    async with track_performance(f"/books/{book_id}", "GET") as metric:
        try:
            # Check cache first
            cached_result = get_cached_book(book_id)
            if cached_result is not None:
                logger.debug(f"Cache hit for book ID: {book_id}")
                metric.status_code = 200
                return cached_result
            
            logger.debug(f"Fetching book with ID: {book_id}")
            book = await get_book_by_id(book_id)
            
            if not book:
                metric.status_code = 404
                raise HTTPException(
                    status_code=404,
                    detail=f"Book with ID {book_id} not found"
                )
            
            book_id, ol_key, title, authors, year, subjects, search_content = book
            
            # Enrich author names from Open Library API if needed
            enriched_authors = await enrich_author_names(authors or [])
            # Fetch cover URL from work's first edition
            cover_url = await get_cover_url(ol_key)
            
            book_detail = BookDetailResponse(
                id=book_id,
                ol_key=ol_key,
                title=title,
                authors=enriched_authors,
                first_publish_year=year,
                subjects=subjects or [],
                cover_url=cover_url,
                search_content=search_content
            )
            
            # Cache the result
            set_cached_book(book_id, book_detail)
            
            metric.status_code = 200
            return book_detail
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error fetching book {book_id}: {e}", exc_info=True)
            metric.status_code = 500
            raise HTTPException(
                status_code=500,
                detail=f"Failed to fetch book: {str(e)}"
            )

