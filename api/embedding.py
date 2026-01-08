"""
Embedding model management and query encoding.
"""
import logging
from typing import Optional

from sentence_transformers import SentenceTransformer

from api.config import settings

logger = logging.getLogger(__name__)

# Global model instance
_model: Optional[SentenceTransformer] = None


def load_model() -> SentenceTransformer:
    """
    Load the embedding model.
    
    Returns:
        Loaded SentenceTransformer model
    """
    global _model
    
    if _model is not None:
        return _model
    
    logger.info(f"Loading embedding model: {settings.embedding_model}")
    try:
        _model = SentenceTransformer(settings.embedding_model)
        logger.info("✅ Embedding model loaded successfully")
        
        # Pre-warm the model by encoding a dummy query
        logger.info("Pre-warming model...")
        _model.encode("warmup", show_progress_bar=False)
        logger.info("✅ Model pre-warmed")
        
        return _model
    except Exception as e:
        logger.error(f"❌ Failed to load embedding model: {e}")
        raise


def get_model() -> SentenceTransformer:
    """
    Get the embedding model instance.
    
    Returns:
        SentenceTransformer model instance
        
    Raises:
        RuntimeError: If model is not loaded
    """
    if _model is None:
        raise RuntimeError("Model not loaded. Call load_model() first.")
    return _model


def encode_query(query: str) -> list[float]:
    """
    Encode a text query into an embedding vector.
    
    Args:
        query: Text query to encode
        
    Returns:
        Embedding vector as a list of floats
    """
    model = get_model()
    embedding = model.encode(query, show_progress_bar=False, convert_to_numpy=True)
    return embedding.tolist()

