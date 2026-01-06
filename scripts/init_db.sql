-- Initialize WhatToRead Database
-- This script runs automatically when the PostgreSQL container starts for the first time

-- Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create the books table
CREATE TABLE IF NOT EXISTS books (
    id BIGSERIAL PRIMARY KEY,
    ol_key TEXT NOT NULL UNIQUE,         -- Open Library Work Key
    title TEXT NOT NULL,
    authors TEXT[],                      -- Array of author names
    first_publish_year INT,
    subjects TEXT[],                     -- Raw subject list for UI display
    search_content TEXT,                 -- Concatenated string for context
    embedding vector(384)                -- Dimensions of 'all-MiniLM-L6-v2'
);

-- Create index for performance
-- Note: We'll create the IVFFlat index AFTER data load for speed
-- This is a placeholder - the actual index will be created after ETL completes
-- CREATE INDEX books_embedding_idx ON books USING ivfflat (embedding vector_cosine_ops) WITH (lists = 1000);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_books_ol_key ON books(ol_key);
CREATE INDEX IF NOT EXISTS idx_books_title ON books(title);
CREATE INDEX IF NOT EXISTS idx_books_year ON books(first_publish_year);

-- Grant permissions (if needed for additional users)
-- GRANT ALL PRIVILEGES ON TABLE books TO whattoread;
-- GRANT USAGE, SELECT ON SEQUENCE books_id_seq TO whattoread;

