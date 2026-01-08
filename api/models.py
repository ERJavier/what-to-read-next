"""
Pydantic models for request/response validation.
"""
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator


class RecommendationRequest(BaseModel):
    """Request model for book recommendations."""
    
    query: str = Field(
        ...,
        min_length=1,
        max_length=500,
        description="Semantic description of desired books (e.g., 'dark psychological thrillers')"
    )
    limit: int = Field(
        default=10,
        ge=1,
        le=100,
        description="Maximum number of recommendations to return"
    )
    
    @field_validator("query")
    @classmethod
    def validate_query(cls, v: str) -> str:
        """Strip whitespace from query."""
        return v.strip()
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "query": "dark psychological thrillers with unreliable narrators",
                "limit": 10
            }
        }
    }


class BookResponse(BaseModel):
    """Response model for a single book."""
    
    id: int = Field(..., description="Internal book ID")
    ol_key: str = Field(..., description="Open Library work key")
    title: str = Field(..., description="Book title")
    authors: List[str] = Field(..., description="List of author names")
    first_publish_year: Optional[int] = Field(None, description="First publication year")
    subjects: List[str] = Field(..., description="Subject tags/categories")
    similarity: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Similarity score (0-1, higher is more similar)"
    )
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "id": 12345,
                "ol_key": "/works/OL123456W",
                "title": "Gone Girl",
                "authors": ["Gillian Flynn"],
                "first_publish_year": 2012,
                "subjects": ["Fiction", "Thrillers", "Psychological"],
                "similarity": 0.85
            }
        }
    }


class BookDetailResponse(BaseModel):
    """Response model for detailed book information."""
    
    id: int = Field(..., description="Internal book ID")
    ol_key: str = Field(..., description="Open Library work key")
    title: str = Field(..., description="Book title")
    authors: List[str] = Field(..., description="List of author names")
    first_publish_year: Optional[int] = Field(None, description="First publication year")
    subjects: List[str] = Field(..., description="Subject tags/categories")
    search_content: Optional[str] = Field(None, description="Search content used for embedding")
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "id": 12345,
                "ol_key": "/works/OL123456W",
                "title": "Gone Girl",
                "authors": ["Gillian Flynn"],
                "first_publish_year": 2012,
                "subjects": ["Fiction", "Thrillers", "Psychological"],
                "search_content": "Gone Girl. Fiction Thrillers Psychological"
            }
        }
    }

