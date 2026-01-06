# Setup Guide

This guide will help you set up WhatToRead for local development.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Python 3.10+** - [Download Python](https://www.python.org/downloads/)
- **PostgreSQL 15+** - [Download PostgreSQL](https://www.postgresql.org/download/)
- **Git** - [Download Git](https://git-scm.com/downloads)
- **Docker** (optional) - [Download Docker](https://www.docker.com/get-started/)

## Step 1: Clone the Repository

```bash
git clone https://github.com/ERJavier/what-to-read-next.git
cd what-to-read-next
```

## Step 2: Set Up Python Environment

### Create Virtual Environment

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate

# On Windows:
venv\Scripts\activate
```

### Install Dependencies

```bash
# Install required packages
pip install -r requirements.txt
```

## Step 3: Set Up PostgreSQL with pgvector

### Install pgvector Extension

The pgvector extension allows PostgreSQL to perform vector similarity searches.

**On macOS (using Homebrew):**
```bash
brew install pgvector
```

**On Ubuntu/Debian:**
```bash
# Add pgvector repository and install
# See: https://github.com/pgvector/pgvector#installation
```

**Using Docker:**
```bash
docker run -d \
  --name postgres-pgvector \
  -e POSTGRES_PASSWORD=yourpassword \
  -e POSTGRES_DB=whattoread \
  -p 5432:5432 \
  pgvector/pgvector:pg15
```

### Create Database and Enable Extension

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE whattoread;

# Connect to the database
\c whattoread

# Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;
```

## Step 4: Configure Environment Variables

Create a `.env` file in the project root:

```bash
# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/whattoread

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000

# Model Configuration
EMBEDDING_MODEL=all-MiniLM-L6-v2
```

## Step 5: Set Up Database Schema

Run the database initialization script:

```bash
# This will create the necessary tables and indexes
python scripts/init_db.py
```

Or manually run the SQL from `prd.md` Phase 1 section.

## Step 6: Download Open Library Data (Optional)

For local development, you may want to start with a subset of the Open Library data:

```bash
# Download the latest works dump
wget https://openlibrary.org/data/ol_dump_works_latest.txt.gz

# Or use a smaller sample for testing
```

## Step 7: Run the ETL Pipeline

Ingest and process book data:

```bash
# Run the ETL pipeline
python etl/ingest.py
```

This will:
- Load the Open Library dump
- Filter for quality publications
- Generate embeddings using Sentence-BERT
- Insert data into PostgreSQL

**Note:** This process can take several hours for the full dataset. Start with a subset for testing.

## Step 8: Start the API Server

```bash
# Start FastAPI server
uvicorn api.main:app --reload

# Or using the run script
python -m api.main
```

The API will be available at `http://localhost:8000`

- API Documentation: `http://localhost:8000/docs`
- Alternative docs: `http://localhost:8000/redoc`

## Step 9: Verify Installation

Test the API health endpoint:

```bash
curl http://localhost:8000/health
```

You should receive:
```json
{"status": "ok"}
```

## Troubleshooting

### pgvector Extension Not Found

If you encounter errors about the vector extension:
- Ensure PostgreSQL 15+ is installed
- Verify pgvector is properly installed
- Check that the extension is enabled: `SELECT * FROM pg_extension WHERE extname = 'vector';`

### Connection Errors

- Verify PostgreSQL is running: `pg_isready`
- Check database credentials in `.env`
- Ensure the database exists and is accessible

### Memory Issues During ETL

- Process data in smaller batches
- Use a machine with more RAM
- Consider using a cloud instance for the full dataset

## Next Steps

- Read the [Architecture Documentation](ARCHITECTURE.md) to understand the system design
- Check the [API Documentation](API.md) for endpoint details
- Review the [TODO.md](../TODO.md) for development tasks

## Getting Help

- Open an issue on GitHub
- Check the [Contributing Guide](CONTRIBUTING.md)
- Review the [Product Requirements Document](../prd.md) for detailed specifications

