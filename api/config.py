"""
Configuration management for WhatToRead API.
Uses pydantic-settings for environment variable management.
"""
import logging
import os
from pathlib import Path
from typing import Optional

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Application
    app_name: str = "WhatToRead API"
    app_version: str = "0.1.0"
    debug: bool = False
    
    # Database - can be set directly or constructed from components
    database_url: Optional[str] = None
    postgres_user: Optional[str] = None
    postgres_password: Optional[str] = None
    postgres_db: Optional[str] = None
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    database_pool_min_size: int = 2
    database_pool_max_size: int = 10
    
    # Model
    embedding_model: str = "all-MiniLM-L6-v2"
    
    # API
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    # CORS origins: Use ["*"] for development, or specify exact origins for production
    # Note: ["*"] cannot be used with allow_credentials=True
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:4173", "http://localhost:3000"]
    
    # Logging
    log_level: str = "INFO"
    log_file: Optional[str] = None
    
    # Similarity search
    similarity_threshold: float = 0.4  # Cosine distance threshold (lower = more strict, 0.4 = ~0.6 similarity)
    max_recommendations: int = 100
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )
    
    @model_validator(mode="after")
    def construct_database_url(self) -> "Settings":
        """
        Construct DATABASE_URL from components if not provided directly.
        Handles shell variable substitution in .env files.
        """
        # If DATABASE_URL is already set and doesn't contain ${}, use it
        if self.database_url and "${" not in self.database_url:
            return self
        
        # Try to get from environment (in case shell expanded it)
        env_url = os.getenv("DATABASE_URL")
        if env_url and "${" not in env_url:
            self.database_url = env_url
            return self
        
        # Construct from individual components
        user = self.postgres_user or os.getenv("POSTGRES_USER")
        password = self.postgres_password or os.getenv("POSTGRES_PASSWORD")
        db = self.postgres_db or os.getenv("POSTGRES_DB")
        host = self.postgres_host or os.getenv("POSTGRES_HOST", "localhost")
        port = self.postgres_port or int(os.getenv("POSTGRES_PORT", "5432"))
        
        if user and password and db:
            self.database_url = f"postgresql://{user}:{password}@{host}:{port}/{db}"
            return self
        
        # If we still have a DATABASE_URL with ${}, try to expand it
        if self.database_url and "${" in self.database_url:
            expanded = self.database_url
            expanded = expanded.replace("${POSTGRES_USER}", user or "")
            expanded = expanded.replace("${POSTGRES_PASSWORD}", password or "")
            expanded = expanded.replace("${POSTGRES_DB}", db or "")
            if "${" not in expanded:
                self.database_url = expanded
                return self
        
        raise ValueError(
            "DATABASE_URL must be provided or POSTGRES_USER, POSTGRES_PASSWORD, "
            "and POSTGRES_DB must be set"
        )


# Global settings instance
settings = Settings()


def setup_logging(log_level: str = None, log_file: Optional[str] = None) -> None:
    """
    Configure application logging.
    
    Args:
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_file: Optional path to log file
    """
    level = getattr(logging, (log_level or settings.log_level).upper(), logging.INFO)
    
    handlers = [logging.StreamHandler()]
    
    if log_file:
        # Ensure log directory exists
        log_path = Path(log_file)
        log_path.parent.mkdir(parents=True, exist_ok=True)
        handlers.append(logging.FileHandler(log_file))
    
    logging.basicConfig(
        level=level,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        handlers=handlers
    )
    
    # Set specific loggers
    logging.getLogger("uvicorn").setLevel(logging.INFO)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)

