#!/usr/bin/env python3
"""
ETL Pipeline for WhatToRead
Ingests Open Library works dump, filters for quality, generates embeddings, and inserts into PostgreSQL.
"""

import os
import sys
import gzip
import json
import logging
import time
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import psycopg
from sentence_transformers import SentenceTransformer
from tqdm import tqdm

# Configuration
DUMP_FILE = os.getenv(
    "DUMP_FILE", 
    str(Path(__file__).parent.parent / "data" / "ol_dump_works_2025-12-31.txt.gz")
)
DATABASE_URL = os.getenv("DATABASE_URL")
MODEL_NAME = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
BATCH_SIZE = int(os.getenv("BATCH_SIZE", "250"))  # Conservative default for low memory usage
MIN_SUBJECTS = int(os.getenv("MIN_SUBJECTS", "3"))
MAX_RECORDS = int(os.getenv("MAX_RECORDS", "0"))  # 0 = no limit, process all
BATCH_DELAY = float(os.getenv("BATCH_DELAY", "0.2"))  # Delay between batches (seconds) to reduce CPU load
EMBEDDING_BATCH_SIZE = int(os.getenv("EMBEDDING_BATCH_SIZE", "32"))  # Smaller embedding batches for lower memory

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("etl.log"),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)


def is_quality_record(work: Dict) -> bool:
    """
    Filter for quality records.
    Keep records with at least MIN_SUBJECTS subjects.
    """
    subjects = work.get("subjects", [])
    if not subjects or len(subjects) < MIN_SUBJECTS:
        return False
    
    # Must have a title
    if not work.get("title"):
        return False
    
    # Must be a work type
    work_type = work.get("type")
    if isinstance(work_type, dict):
        if work_type.get("key") != "/type/work":
            return False
    elif work_type != "/type/work":
        return False
    
    return True


def extract_authors(work: Dict) -> List[str]:
    """Extract author names from work record."""
    authors = []
    author_list = work.get("authors", [])
    
    for author_entry in author_list:
        if isinstance(author_entry, dict):
            # Handle author role structure: {"author": {"key": "/authors/OL123A"}}
            author = author_entry.get("author", {})
            if isinstance(author, dict):
                author_key = author.get("key", "")
                # Extract author name from key or use key itself
                if author_key.startswith("/authors/"):
                    authors.append(author_key)
            # Handle direct author key
            elif "key" in author_entry:
                authors.append(author_entry["key"])
    
    return authors


def extract_publish_year(work: Dict) -> Optional[int]:
    """Extract first publish year from work record."""
    first_publish_date = work.get("first_publish_date")
    
    if isinstance(first_publish_date, dict):
        value = first_publish_date.get("value")
        if value:
            # Extract year from date string (format: "YYYY-MM-DD" or "YYYY")
            try:
                year_str = str(value)[:4]
                return int(year_str) if year_str.isdigit() else None
            except (ValueError, TypeError):
                return None
    
    # Try alternative field
    first_publish_year = work.get("first_publish_year")
    if isinstance(first_publish_year, (int, str)):
        try:
            return int(str(first_publish_year)[:4])
        except (ValueError, TypeError):
            return None
    
    return None


def parse_dump_line(line: str) -> Optional[Dict]:
    """Parse a single line from the Open Library dump."""
    try:
        # Format: type\tkey\trevision\tlast_modified\t{json}
        parts = line.strip().split("\t", 4)
        if len(parts) < 5:
            return None
        
        # Parse the JSON part (last column)
        json_str = parts[4]
        work = json.loads(json_str)
        
        # Ensure type and key are set
        if "type" not in work:
            work["type"] = parts[0]
        if "key" not in work:
            work["key"] = parts[1]
        
        return work
    except (json.JSONDecodeError, IndexError, ValueError) as e:
        logger.debug(f"Failed to parse line: {e}")
        return None


def prepare_embedding_text(work: Dict) -> str:
    """Combine fields for embedding context."""
    title = work.get("title", "")
    subjects = work.get("subjects", [])
    subjects_str = " ".join(subjects[:20])  # Limit subjects to avoid too long text
    
    # Combine title and subjects
    full_text = f"{title}. {subjects_str}".strip()
    return full_text


def main():
    """Main ETL pipeline."""
    # Validate configuration
    if not DATABASE_URL:
        logger.error("❌ DATABASE_URL environment variable is required")
        logger.error("   Set it in your .env file or export it before running")
        sys.exit(1)
    
    if not Path(DUMP_FILE).exists():
        logger.error(f"❌ Dump file not found: {DUMP_FILE}")
        sys.exit(1)
    
    logger.info("🚀 Starting ETL Pipeline")
    logger.info(f"   Dump file: {DUMP_FILE}")
    logger.info(f"   Model: {MODEL_NAME}")
    logger.info(f"   Batch size: {BATCH_SIZE} (optimized for low resource usage)")
    logger.info(f"   Embedding batch size: {EMBEDDING_BATCH_SIZE} (memory-friendly)")
    logger.info(f"   Batch delay: {BATCH_DELAY}s (CPU throttling)")
    logger.info(f"   Min subjects: {MIN_SUBJECTS}")
    if MAX_RECORDS > 0:
        logger.info(f"   Max records (test mode): {MAX_RECORDS:,}")
    else:
        logger.info(f"   Max records: No limit (processing all)")
    
    # Load embedding model
    logger.info("📦 Loading embedding model...")
    try:
        model = SentenceTransformer(MODEL_NAME)
        logger.info("✅ Model loaded successfully")
    except Exception as e:
        logger.error(f"❌ Failed to load model: {e}")
        sys.exit(1)
    
    # Connect to database
    logger.info("🔌 Connecting to database...")
    try:
        conn = psycopg.connect(DATABASE_URL, autocommit=True)
        cur = conn.cursor()
        logger.info("✅ Database connected")
    except Exception as e:
        logger.error(f"❌ Database connection failed: {e}")
        sys.exit(1)
    
    # Process dump file
    logger.info("📖 Processing dump file...")
    records_processed = 0
    records_inserted = 0
    records_skipped = 0
    errors = 0
    
    try:
        with gzip.open(DUMP_FILE, "rt", encoding="utf-8") as f:
            # Use tqdm for progress tracking (estimate file size)
            file_size = Path(DUMP_FILE).stat().st_size
            pbar = tqdm(total=file_size, unit="B", unit_scale=True, desc="Processing")
            
            batch_records = []
            batch_texts = []
            
            for line in f:
                pbar.update(len(line.encode("utf-8")))
                
                # Parse line
                work = parse_dump_line(line)
                if not work:
                    continue
                
                records_processed += 1
                
                # Check if we've reached the max records limit (for testing)
                if MAX_RECORDS > 0 and records_inserted >= MAX_RECORDS:
                    logger.info(f"✅ Reached max records limit ({MAX_RECORDS:,}). Stopping processing.")
                    break
                
                # Filter for quality
                if not is_quality_record(work):
                    records_skipped += 1
                    continue
                
                # Extract data
                ol_key = work.get("key", "")
                title = work.get("title", "")
                authors = extract_authors(work)
                subjects = work.get("subjects", [])
                year = extract_publish_year(work)
                search_content = prepare_embedding_text(work)
                
                # Add to batch
                batch_records.append({
                    "ol_key": ol_key,
                    "title": title,
                    "authors": authors,
                    "subjects": subjects,
                    "year": year,
                    "search_content": search_content,
                })
                batch_texts.append(search_content)
                
                # Process batch when full
                if len(batch_records) >= BATCH_SIZE:
                    try:
                        # Generate embeddings with smaller batch size for memory efficiency
                        embeddings = model.encode(
                            batch_texts, 
                            show_progress_bar=False,
                            batch_size=EMBEDDING_BATCH_SIZE,
                            convert_to_numpy=True
                        )
                        
                        # Prepare data for insertion
                        data_tuples = [
                            (
                                r["ol_key"],
                                r["title"],
                                r["authors"],
                                r["year"],
                                r["subjects"],
                                r["search_content"],
                                embedding.tolist(),
                            )
                            for r, embedding in zip(batch_records, embeddings)
                        ]
                        
                        # Batch insert
                        cur.executemany(
                            """INSERT INTO books 
                               (ol_key, title, authors, first_publish_year, subjects, search_content, embedding)
                               VALUES (%s, %s, %s, %s, %s, %s, %s::vector)
                               ON CONFLICT (ol_key) DO NOTHING""",
                            data_tuples,
                        )
                        
                        records_inserted += len(batch_records)
                        pbar.set_postfix({
                            "processed": records_processed,
                            "inserted": records_inserted,
                            "skipped": records_skipped,
                        })
                        
                        # Log progress every 10k records
                        if records_inserted % 10000 == 0:
                            logger.info(f"📊 Progress: {records_inserted:,} records inserted, {records_processed:,} processed, {records_skipped:,} skipped")
                        
                        # Check limit after batch insert
                        if MAX_RECORDS > 0 and records_inserted >= MAX_RECORDS:
                            logger.info(f"✅ Reached max records limit ({MAX_RECORDS:,}). Stopping processing.")
                            break
                        
                    except Exception as e:
                        logger.error(f"❌ Error processing batch: {e}")
                        errors += len(batch_records)
                    
                    # Reset batch
                    batch_records = []
                    batch_texts = []
                    
                    # Gentle CPU throttling - small delay between batches
                    if BATCH_DELAY > 0:
                        time.sleep(BATCH_DELAY)
                    
                    # Check limit before continuing
                    if MAX_RECORDS > 0 and records_inserted >= MAX_RECORDS:
                        break
            
            # Process remaining records
            if batch_records:
                try:
                    embeddings = model.encode(
                        batch_texts, 
                        show_progress_bar=False,
                        batch_size=EMBEDDING_BATCH_SIZE,
                        convert_to_numpy=True
                    )
                    data_tuples = [
                        (
                            r["ol_key"],
                            r["title"],
                            r["authors"],
                            r["year"],
                            r["subjects"],
                            r["search_content"],
                            embedding.tolist(),
                        )
                        for r, embedding in zip(batch_records, embeddings)
                    ]
                    cur.executemany(
                        """INSERT INTO books 
                           (ol_key, title, authors, first_publish_year, subjects, search_content, embedding)
                           VALUES (%s, %s, %s, %s, %s, %s, %s::vector)
                           ON CONFLICT (ol_key) DO NOTHING""",
                        data_tuples,
                    )
                    records_inserted += len(batch_records)
                except Exception as e:
                    logger.error(f"❌ Error processing final batch: {e}")
                    errors += len(batch_records)
            
            pbar.close()
    
    except Exception as e:
        logger.error(f"❌ Fatal error processing dump: {e}")
        sys.exit(1)
    finally:
        conn.close()
    
    # Summary
    logger.info("✅ ETL Pipeline completed!")
    logger.info(f"   Records processed: {records_processed:,}")
    logger.info(f"   Records inserted: {records_inserted:,}")
    logger.info(f"   Records skipped: {records_skipped:,}")
    logger.info(f"   Errors: {errors:,}")
    
    # Note about index creation
    logger.info("")
    logger.info("📝 Note: Create the IVFFlat index after data load:")
    logger.info("   CREATE INDEX books_embedding_idx ON books USING ivfflat (embedding vector_cosine_ops) WITH (lists = 1000);")


if __name__ == "__main__":
    main()

