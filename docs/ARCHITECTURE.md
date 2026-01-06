# Architecture Documentation

## System Overview

WhatToRead is a semantic book recommendation engine built on a PostgreSQL + pgvector stack. The system eliminates the complexity of managing separate vector stores and metadata databases by using PostgreSQL as the single source of truth.

## High-Level Architecture

```
┌─────────────────┐
│  User Browser   │
└────────┬────────┘
         │
         │ HTTP/HTTPS
         │
┌────────▼────────────────────────┐
│   Nginx (Reverse Proxy)         │
│   - Static Files                │
│   - API Proxy                   │
└────────┬────────────────────────┘
         │
         │
┌────────▼────────────────────────┐
│      FastAPI Application         │
│   - REST API Endpoints          │
│   - Request Validation          │
│   - Response Formatting         │
└────────┬────────────────────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐  ┌──▼──────────────┐
│Embedding│  │  PostgreSQL     │
│  Model  │  │  + pgvector     │
│(Sentence│  │  - Metadata     │
│  BERT)  │  │  - Vectors      │
└────────┘  └─────────────────┘
```

## Components

### 1. Data Ingestion Layer (ETL)

**Purpose**: Transform raw Open Library data into searchable vectors

**Process Flow**:
1. Stream Open Library dump file (JSONL format, gzipped)
2. Filter records for quality (real publishers, sufficient metadata)
3. Extract and combine relevant fields (title, subjects, authors)
4. Generate embeddings using Sentence-BERT model
5. Batch insert into PostgreSQL with vectors

**Key Files**:
- `etl/ingest.py` - Main ETL script
- `etl/filters.py` - Quality filtering logic
- `etl/transformers.py` - Data transformation utilities

### 2. Database Layer

**Technology**: PostgreSQL 15+ with pgvector extension

**Schema**:
```sql
CREATE TABLE books (
    id BIGSERIAL PRIMARY KEY,
    ol_key TEXT NOT NULL UNIQUE,         -- Open Library Work Key
    title TEXT NOT NULL,
    authors TEXT[],                      -- Array of author names
    first_publish_year INT,
    subjects TEXT[],                     -- Raw subject list for UI display
    search_content TEXT,                 -- Concatenated string for context
    embedding vector(384)                -- Dimensions of 'all-MiniLM-L6-v2'
);
```

**Indexing Strategy**:
- IVFFlat index on embedding column for fast similarity search
- Index created after data load for optimal performance
- `lists` parameter tuned based on table size: `sqrt(total_rows) / 1000`

### 3. API Layer

**Technology**: FastAPI (Python async framework)

**Key Endpoints**:
- `GET /health` - Health check
- `POST /recommend` - Get book recommendations based on query
- `GET /books/{id}` - Get book details
- `GET /docs` - Interactive API documentation

**Request Flow**:
1. Receive user query (text string)
2. Encode query using Sentence-BERT model
3. Perform cosine similarity search in PostgreSQL
4. Filter results by similarity threshold
5. Return formatted JSON response

### 4. Frontend Layer (Planned)

**Technology**: React (Vite) or Vanilla JS

**Features**:
- Interactive book discovery interface
- "Tinder-for-Books" card stack UI
- Real-time vector interpolation based on user preferences
- Visual feedback on taste profile changes

## Data Flow

### Ingestion Flow (Offline)

```
Open Library Dump
    │
    ├─> Stream & Parse JSONL
    │
    ├─> Filter Quality Records
    │
    ├─> Extract Metadata
    │
    ├─> Generate Embeddings (Batch)
    │
    └─> Insert into PostgreSQL
```

### Query Flow (Online)

```
User Query
    │
    ├─> FastAPI Receives Request
    │
    ├─> Encode Query to Vector
    │
    ├─> SQL Similarity Search
    │   (ORDER BY embedding <=> query_vector)
    │
    ├─> Filter by Threshold
    │
    └─> Return Results (JSON)
```

## Vector Search Details

### Embedding Model
- **Model**: `all-MiniLM-L6-v2` from sentence-transformers
- **Dimensions**: 384
- **Use Case**: General-purpose semantic similarity

### Similarity Metric
- **Method**: Cosine Distance
- **Operator**: `<=>` (pgvector cosine distance operator)
- **Threshold**: 0.2 (configurable, filters out poor matches)

### Search Query Example
```sql
SELECT title, authors, first_publish_year, subjects, 
       1 - (embedding <=> %s) as similarity
FROM books
WHERE embedding <=> %s < 0.2
ORDER BY embedding <=> %s
LIMIT 10;
```

## Performance Considerations

### Index Tuning
- IVFFlat index requires careful tuning of `lists` parameter
- Higher `lists` = more RAM usage but faster recall
- Recommended: `lists = sqrt(total_rows) / 1000`

### Model Loading
- Sentence-BERT model loaded once at application startup
- Pre-warming on startup to avoid first-request latency
- Model size: ~80MB (all-MiniLM-L6-v2)

### Batch Processing
- ETL processes data in batches (default: 1000 records)
- Embeddings generated in batch for efficiency
- Database inserts use `executemany` for performance

## Scalability

### Horizontal Scaling
- FastAPI can run multiple workers (Gunicorn + Uvicorn)
- Stateless API design allows load balancing
- PostgreSQL can be scaled with read replicas

### Vertical Scaling
- PostgreSQL benefits from more RAM for index caching
- ETL process can utilize more CPU cores for parallel processing
- Consider GPU acceleration for embedding generation at scale

## Security Considerations

- API authentication (planned)
- Rate limiting for public endpoints
- Input validation on all user queries
- SQL injection prevention (parameterized queries)
- Environment variable management for secrets

## Future Enhancements

- User preference learning and personalization
- Real-time vector interpolation based on swipes
- Advanced filtering (genre, year, author)
- Recommendation caching
- Multi-model support for different use cases

## Related Documentation

- [Setup Guide](SETUP.md) - Installation and configuration
- [API Documentation](API.md) - Endpoint details
- [Product Requirements Document](../prd.md) - Complete technical specification

