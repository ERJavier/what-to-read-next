"""
WhatToRead API - FastAPI Application
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from api.config import settings, setup_logging
from api.database import close_db_pool, init_db_pool
from api.embedding import encode_query, load_model
from api.middleware import RequestLoggingMiddleware
from api.models import BookDetailResponse, BookResponse, RecommendationRequest
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

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
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
    """
    try:
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
            return []
        
        # Format response
        books = []
        for row in results:
            book_id, ol_key, title, authors, year, subjects, similarity = row
            books.append(BookResponse(
                id=book_id,
                ol_key=ol_key,
                title=title,
                authors=authors or [],
                first_publish_year=year,
                subjects=subjects or [],
                similarity=float(similarity)
            ))
        
        logger.info(f"Returning {len(books)} recommendations")
        return books
        
    except Exception as e:
        logger.error(f"Error processing recommendation request: {e}", exc_info=True)
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
    """
    try:
        logger.debug(f"Fetching book with ID: {book_id}")
        book = await get_book_by_id(book_id)
        
        if not book:
            raise HTTPException(
                status_code=404,
                detail=f"Book with ID {book_id} not found"
            )
        
        book_id, ol_key, title, authors, year, subjects, search_content = book
        
        return BookDetailResponse(
            id=book_id,
            ol_key=ol_key,
            title=title,
            authors=authors or [],
            first_publish_year=year,
            subjects=subjects or [],
            search_content=search_content
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching book {book_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch book: {str(e)}"
        )

