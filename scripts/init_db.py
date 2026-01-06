#!/usr/bin/env python3
"""
Database initialization script for WhatToRead.
This script can be run manually or will be executed automatically by Docker.
"""

import os
import sys
import psycopg
from pathlib import Path

# Get database URL from environment (REQUIRED - no default for security)
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("❌ ERROR: DATABASE_URL environment variable is required")
    print("   Set it in your .env file or export it before running this script")
    sys.exit(1)


def init_database():
    """Initialize the database with schema and extensions."""
    try:
        print("Connecting to database...")
        with psycopg.connect(DATABASE_URL) as conn:
            with conn.cursor() as cur:
                # Enable pgvector extension
                print("Enabling pgvector extension...")
                cur.execute("CREATE EXTENSION IF NOT EXISTS vector;")
                
                # Read and execute init_db.sql if it exists
                sql_file = Path(__file__).parent / "init_db.sql"
                if sql_file.exists():
                    print(f"Executing {sql_file}...")
                    with open(sql_file, 'r') as f:
                        sql_content = f.read()
                        cur.execute(sql_content)
                else:
                    # Fallback: create table directly
                    print("Creating books table...")
                    cur.execute("""
                        CREATE TABLE IF NOT EXISTS books (
                            id BIGSERIAL PRIMARY KEY,
                            ol_key TEXT NOT NULL UNIQUE,
                            title TEXT NOT NULL,
                            authors TEXT[],
                            first_publish_year INT,
                            subjects TEXT[],
                            search_content TEXT,
                            embedding vector(384)
                        );
                    """)
                    
                    # Create basic indexes
                    cur.execute("CREATE INDEX IF NOT EXISTS idx_books_ol_key ON books(ol_key);")
                    cur.execute("CREATE INDEX IF NOT EXISTS idx_books_title ON books(title);")
                    cur.execute("CREATE INDEX IF NOT EXISTS idx_books_year ON books(first_publish_year);")
                
                conn.commit()
                print("✅ Database initialized successfully!")
                return True
                
    except psycopg.OperationalError as e:
        print(f"❌ Database connection error: {e}")
        print(f"   Make sure PostgreSQL is running and accessible at: {DATABASE_URL}")
        return False
    except Exception as e:
        print(f"❌ Error initializing database: {e}")
        return False


if __name__ == "__main__":
    success = init_database()
    sys.exit(0 if success else 1)

