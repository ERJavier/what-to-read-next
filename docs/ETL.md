# ETL Pipeline Documentation

This document provides detailed information about the ETL (Extract, Transform, Load) pipeline for ingesting Open Library data into WhatToRead.

## Overview

The ETL pipeline processes Open Library works dump files, filters for quality records, generates vector embeddings, and loads the data into PostgreSQL with pgvector support. The pipeline is designed to handle large datasets efficiently while being resource-conscious.

## Architecture

```
Open Library Dump (GZIP) → Parse & Filter → Generate Embeddings → Batch Insert → PostgreSQL + pgvector
```

### Key Components

1. **Data Extraction**: Reads compressed Open Library dump files line-by-line
2. **Quality Filtering**: Filters records based on metadata quality (subjects, title, work type)
3. **Embedding Generation**: Uses Sentence-BERT (`all-MiniLM-L6-v2`) to create 384-dimensional vectors
4. **Batch Processing**: Processes data in configurable batches for memory efficiency
5. **Database Insertion**: Uses batch inserts with conflict handling

## Prerequisites

- Python 3.10+
- PostgreSQL 15+ with pgvector extension
- Database schema initialized (run `scripts/init_db.py`)
- Open Library works dump file (see [Downloading Data](#downloading-data))

## Configuration

The ETL pipeline can be configured via environment variables:

### Required Variables

- `DATABASE_URL`: PostgreSQL connection string
  ```
  postgresql://user:password@host:port/database
  ```

### Optional Variables

- `DUMP_FILE`: Path to Open Library dump file (default: `data/ol_dump_works_2025-12-31.txt.gz`)
- `EMBEDDING_MODEL`: Sentence-BERT model name (default: `all-MiniLM-L6-v2`)
- `BATCH_SIZE`: Number of records per batch (default: `250`)
- `MIN_SUBJECTS`: Minimum subjects required for quality filtering (default: `3`)
- `MAX_RECORDS`: Limit total records processed (default: `0` = no limit)
- `BATCH_DELAY`: Delay between batches in seconds (default: `0.2`)
- `EMBEDDING_BATCH_SIZE`: Internal batch size for embedding model (default: `32`)

### Example Configuration

```bash
export DATABASE_URL="postgresql://whattoread:password@localhost:5432/whattoread"
export BATCH_SIZE=500
export BATCH_DELAY=0.1
export MAX_RECORDS=100000  # For testing with subset
```

## Downloading Data

### Full Dataset

Download the latest Open Library works dump:

```bash
# Create data directory
mkdir -p data

# Download latest dump (warning: ~3.6GB compressed, ~17GB uncompressed)
wget -O data/ol_dump_works_latest.txt.gz \
  https://openlibrary.org/data/ol_dump_works_latest.txt.gz
```

**Note**: The dump file is large. Ensure you have:
- At least 20GB free disk space
- Stable internet connection
- Time for download (can take 30+ minutes)

### Data Format

The dump file is a gzipped text file where each line contains:
- Tab-separated fields: `type`, `key`, `revision`, `last_modified`, `JSON`
- The JSON field contains the full work metadata

## Running the ETL

### Local Execution

```bash
# Activate virtual environment
source venv/bin/activate

# Run ETL pipeline
python etl/ingest.py
```

### Docker Execution

Using Docker Compose:

```bash
# Run ETL service
docker-compose --profile etl run --rm whattoread-etl python etl/ingest.py
```

Or directly with Docker:

```bash
docker run --rm \
  -v $(pwd)/data:/app/data:ro \
  -v $(pwd)/etl:/app/etl:ro \
  -e DATABASE_URL="postgresql://user:pass@host:5432/db" \
  what-to-read-next-whattoread-etl \
  python etl/ingest.py
```

## Quality Filtering

The pipeline filters records based on:

1. **Minimum Subjects**: Records must have at least `MIN_SUBJECTS` (default: 3) subjects
2. **Title Required**: Records must have a non-empty title
3. **Work Type**: Only processes records with `type: "work"`

### Filtering Logic

```python
def is_quality_record(work: Dict) -> bool:
    subjects = work.get("subjects", [])
    if not subjects or len(subjects) < MIN_SUBJECTS:
        return False
    
    if not work.get("title"):
        return False
    
    if work.get("type") != "work":
        return False
    
    return True
```

**Expected Pass Rate**: ~25-30% of total works pass the quality filter.

## Performance Metrics

Based on production runs:

### Processing Rates

- **Average Rate**: ~250,000 records/hour
- **Peak Rate**: ~300,000 records/hour (with optimized settings)
- **Conservative Rate**: ~80,000 records/hour (with CPU throttling)

### Resource Usage

- **Memory**: ~2-4GB RAM (with batch size 250)
- **CPU**: Moderate (can be throttled with `BATCH_DELAY`)
- **Disk I/O**: Moderate (streaming decompression)

### Full Dataset Estimates

For the complete Open Library works dump (~30M works):

- **Total Works**: ~30,000,000
- **Expected Quality Records**: ~7-8,000,000 (25-30% pass rate)
- **Processing Time**: ~30-40 hours (with conservative settings)
- **Database Size**: ~15-20GB (including embeddings)

### Actual Production Run Results

- **Records Inserted**: 8,197,000
- **Processing Time**: ~31 hours
- **Data Processed**: 18GB+ uncompressed
- **Final Database Size**: ~20GB

## Monitoring Progress

### Check Record Count

```bash
# Using psql
psql -U whattoread -d whattoread -c "SELECT COUNT(*) FROM books;"

# Using Docker
docker-compose exec whattoread-db psql -U whattoread -d whattoread -c "SELECT COUNT(*) FROM books;"
```

### View Live Logs

```bash
# Docker logs (follow mode)
docker logs -f <container-id>

# Or using docker-compose
docker-compose --profile etl logs -f whattoread-etl
```

### Progress Indicators

The pipeline logs progress every 10,000 records:
```
2026-01-07 14:10:01 - INFO - 📊 Progress: 4,680,000 records inserted, 18,315,022 processed, 13,635,022 skipped
```

## Optimization Tips

### For Faster Processing

1. **Increase Batch Size**:
   ```bash
   export BATCH_SIZE=1000
   export BATCH_DELAY=0.1
   ```

2. **Reduce CPU Throttling**:
   ```bash
   export BATCH_DELAY=0.05
   ```

3. **Increase Embedding Batch Size**:
   ```bash
   export EMBEDDING_BATCH_SIZE=64
   ```

**Warning**: Higher batch sizes require more memory. Monitor your system.

### For Lower Resource Usage

1. **Reduce Batch Size**:
   ```bash
   export BATCH_SIZE=100
   export BATCH_DELAY=0.5
   ```

2. **Use Smaller Embedding Batches**:
   ```bash
   export EMBEDDING_BATCH_SIZE=16
   ```

### Testing with Subset

Test the pipeline with a limited number of records:

```bash
export MAX_RECORDS=100000
python etl/ingest.py
```

This processes only the first 100,000 records, useful for:
- Validating the pipeline
- Testing configuration changes
- Development and debugging

## Database Indexing

After the ETL completes, create the IVFFlat index for fast similarity search:

```sql
CREATE INDEX IF NOT EXISTS books_embedding_idx 
ON books 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);
```

**Note**: The index should be created after data loading for optimal performance.

### Index Creation Time

- **Records**: 8M records
- **Index Creation Time**: ~10-15 minutes
- **Index Size**: ~2-3GB

## Troubleshooting

### Common Issues

#### 1. Out of Memory Errors

**Symptoms**: Process crashes or system becomes unresponsive

**Solutions**:
- Reduce `BATCH_SIZE` (e.g., `BATCH_SIZE=100`)
- Reduce `EMBEDDING_BATCH_SIZE` (e.g., `EMBEDDING_BATCH_SIZE=16`)
- Increase `BATCH_DELAY` to allow memory cleanup
- Use a machine with more RAM

#### 2. Database Connection Errors

**Symptoms**: `psycopg` connection errors, "connection lost"

**Solutions**:
- Verify `DATABASE_URL` is correct
- Check PostgreSQL is running: `pg_isready`
- Ensure password doesn't contain special characters (use simple alphanumeric)
- Check database connection limits: `SHOW max_connections;`

#### 3. Slow Processing

**Symptoms**: Very low records/hour rate

**Solutions**:
- Check system resources (CPU, memory, disk I/O)
- Verify database is not overloaded
- Check for other processes competing for resources
- Consider running on a dedicated machine

#### 4. Duplicate Key Errors

**Symptoms**: `duplicate key value violates unique constraint`

**Solutions**:
- The pipeline handles duplicates with `ON CONFLICT DO NOTHING`
- If errors persist, check database schema
- Verify `work_key` is unique in the database

#### 5. Model Download Issues

**Symptoms**: Errors downloading Sentence-BERT model

**Solutions**:
- Check internet connection
- Verify Hugging Face is accessible
- Manually download model if needed
- Check disk space for model cache

### Log Files

The ETL pipeline logs to:
- **Console**: Standard output
- **File**: `etl.log` (in project root)

Check logs for detailed error messages:

```bash
tail -f etl.log
```

## Data Quality

### What Gets Filtered Out

- Records with fewer than 3 subjects (~70% of works)
- Records without titles
- Non-work records (editions, authors, etc.)
- Invalid or malformed JSON

### What Gets Included

- Works with rich metadata (subjects, authors, publication info)
- Books with complete title information
- Records suitable for semantic search

### Sample Quality Metrics

From a production run:
- **Total Works Processed**: ~30,200,000
- **Records Inserted**: 8,197,000
- **Records Skipped**: ~22,000,000
- **Pass Rate**: ~27%

## Resuming Interrupted Runs

The ETL pipeline uses `ON CONFLICT DO NOTHING` for duplicate handling, which means:

- **Safe to Re-run**: If the pipeline stops, you can restart it
- **No Duplicates**: Existing records won't be duplicated
- **Incremental**: New records will be added

To resume:
```bash
# Simply run the pipeline again
python etl/ingest.py
```

The pipeline will skip records that already exist in the database.

## Best Practices

1. **Start Small**: Test with `MAX_RECORDS=100000` first
2. **Monitor Resources**: Watch CPU, memory, and disk usage
3. **Use Docker**: Ensures consistent environment
4. **Backup Database**: Before running full ETL, backup your database
5. **Run Overnight**: Full ETL takes 30+ hours, plan accordingly
6. **Check Logs**: Monitor `etl.log` for errors or warnings
7. **Create Index After**: Build IVFFlat index after data loading completes

## Example: Complete ETL Workflow

```bash
# 1. Download data
mkdir -p data
wget -O data/ol_dump_works_latest.txt.gz \
  https://openlibrary.org/data/ol_dump_works_latest.txt.gz

# 2. Initialize database
python scripts/init_db.py

# 3. Test with subset
export MAX_RECORDS=100000
python etl/ingest.py

# 4. Run full ETL (remove MAX_RECORDS)
unset MAX_RECORDS
python etl/ingest.py

# 5. Create index (after ETL completes)
psql -U whattoread -d whattoread -c "
  CREATE INDEX IF NOT EXISTS books_embedding_idx 
  ON books 
  USING ivfflat (embedding vector_cosine_ops) 
  WITH (lists = 100);
"

# 6. Verify results
psql -U whattoread -d whattoread -c "SELECT COUNT(*) FROM books;"
```

## Performance Tuning

### For Production

Recommended settings for production runs:

```bash
export BATCH_SIZE=500
export BATCH_DELAY=0.1
export EMBEDDING_BATCH_SIZE=64
```

### For Development/Testing

Recommended settings for testing:

```bash
export BATCH_SIZE=250
export BATCH_DELAY=0.2
export EMBEDDING_BATCH_SIZE=32
export MAX_RECORDS=100000
```

## Additional Resources

- [Open Library Data Dumps](https://openlibrary.org/developers/dumps)
- [Sentence-BERT Documentation](https://www.sbert.net/)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [Product Requirements Document](../prd.md) - Full technical specification

## Support

If you encounter issues:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review logs in `etl.log`
3. Open an issue on GitHub with:
   - Error messages
   - Configuration used
   - System specifications
   - Relevant log excerpts

