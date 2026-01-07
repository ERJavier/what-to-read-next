# Development Roadmap

This document tracks the development progress of WhatToRead. Tasks are organized by phase as outlined in the Product Requirements Document.

## Phase 1: Database Setup (PostgreSQL + pgvector) ✅ COMPLETE

### Infrastructure
- [x] Install PostgreSQL 15+ locally
- [x] Install pgvector extension
- [x] Create database `whattoread`
- [x] Enable pgvector extension in database

### Schema Creation
- [x] Create `books` table with required columns
  - [x] `id` (BIGSERIAL PRIMARY KEY)
  - [x] `ol_key` (TEXT, UNIQUE)
  - [x] `title` (TEXT)
  - [x] `authors` (TEXT[])
  - [x] `first_publish_year` (INT)
  - [x] `subjects` (TEXT[])
  - [x] `search_content` (TEXT)
  - [x] `embedding` (vector(384))
- [x] Create database initialization script (`scripts/init_db.py`)
- [x] Test schema with sample data

### Indexing
- [x] Create IVFFlat index on embedding column (will be created after data load per PRD)
- [x] Tune `lists` parameter based on expected data size (planned for after ETL)
- [x] Test index performance with sample queries (basic indexes created and tested)

## Phase 2: ETL Pipeline (Data Ingestion and Embedding)

### Data Acquisition
- [x] Download Open Library works dump
- [x] Set up data streaming for large files
- [x] Create data validation utilities

### Data Processing
- [x] Implement quality filtering logic (`is_real_publisher`)
  - [x] Filter by subject count (minimum 3 subjects)
  - [ ] Filter by publisher quality (if applicable)
- [x] Implement data transformation
  - [x] Extract Open Library work keys
  - [x] Parse author information
  - [x] Extract publication year
  - [x] Combine fields for embedding context
- [x] Create `etl/ingest.py` script
- [x] Implement batch processing (1000 records per batch)

### Embedding Generation
- [x] Install sentence-transformers library
- [x] Load `all-MiniLM-L6-v2` model
- [x] Implement batch embedding generation
- [ ] Test embedding quality with sample queries

### Database Insertion
- [x] Implement batch insert using `executemany`
- [x] Add error handling and retry logic
- [x] Add progress tracking (tqdm)
- [x] Test with subset of data (100k records)

### Optimization
- [x] Optimize batch size for memory/performance (reduced to 250, added CPU throttling)
- [x] Add logging and monitoring (progress logging every 10k records)
- [x] Create index after full data load (IVFFlat index created with lists=100)
- [x] Run full ETL on complete dataset (completed: 8,197,000 records inserted)

## Phase 3: API Development (FastAPI Backend)

### Project Setup
- [ ] Create FastAPI application structure
- [ ] Set up dependency management (`requirements.txt`)
- [ ] Configure environment variables (`.env`)
- [ ] Set up logging configuration

### Core API
- [ ] Implement health check endpoint (`GET /health`)
- [ ] Implement recommendation endpoint (`POST /recommend`)
  - [ ] Request validation (Pydantic models)
  - [ ] Query embedding generation
  - [ ] Database similarity search
  - [ ] Response formatting
- [ ] Implement book detail endpoint (`GET /books/{id}`)
- [ ] Add error handling middleware
- [ ] Add request/response logging

### Database Integration
- [ ] Set up database connection pooling
- [ ] Implement connection management
- [ ] Add query optimization
- [ ] Test with production-like data volume

### Model Management
- [ ] Load Sentence-BERT model at startup
- [ ] Implement model pre-warming
- [ ] Add model versioning support
- [ ] Optimize model loading time

### API Documentation
- [ ] Configure FastAPI auto-documentation
- [ ] Add endpoint descriptions
- [ ] Document request/response schemas
- [ ] Add example requests

### Testing
- [ ] Write unit tests for API endpoints
- [ ] Write integration tests
- [ ] Test error cases
- [ ] Performance testing

## Phase 4: Frontend Development (React/Vite Interface)

### Project Setup
- [ ] Initialize React + Vite project
- [ ] Set up project structure
- [ ] Configure build tools
- [ ] Set up state management (TanStack Query)

### UI Components
- [ ] Design and implement book card component
- [ ] Create "Tinder-for-Books" swipe interface
- [ ] Implement search/query input
- [ ] Create results display
- [ ] Add loading states
- [ ] Add error handling UI

### API Integration
- [ ] Set up API client
- [ ] Implement recommendation fetching
- [ ] Implement book detail fetching
- [ ] Add error handling
- [ ] Implement caching with TanStack Query

### Interactive Features
- [ ] Implement swipe gestures (like/dislike)
- [ ] Implement vector interpolation logic
- [ ] Add real-time recommendation updates
- [ ] Create taste profile visualization
- [ ] Add filters (genre, year, etc.)

### Styling
- [ ] Design responsive layout
- [ ] Implement modern UI/UX
- [ ] Add animations and transitions
- [ ] Ensure mobile compatibility

### Testing
- [ ] Write component tests
- [ ] Test user interactions
- [ ] Test API integration
- [ ] Cross-browser testing

## Phase 5: Deployment & Optimization

### Containerization
- [ ] Create Dockerfile for API
- [ ] Create Dockerfile for frontend
- [ ] Create docker-compose.yml
- [ ] Test containerized deployment locally

### Production Setup
- [ ] Set up production database
- [ ] Configure Nginx reverse proxy
- [ ] Set up SSL certificates (Let's Encrypt)
- [ ] Configure domain and DNS

### Performance Optimization
- [ ] Optimize database indexes
- [ ] Implement caching layer (Redis, optional)
- [ ] Optimize API response times
- [ ] Frontend bundle optimization
- [ ] CDN setup for static assets

### Monitoring & Logging
- [ ] Set up application monitoring
- [ ] Configure error tracking
- [ ] Set up performance metrics
- [ ] Configure log aggregation

### Documentation
- [ ] Complete deployment documentation
- [ ] Create user guide
- [ ] Document API endpoints
- [ ] Create troubleshooting guide

### Security
- [ ] Implement API authentication (if needed)
- [ ] Add rate limiting
- [ ] Security audit
- [ ] Dependency vulnerability scanning

## Additional Tasks

### Documentation
- [x] Create comprehensive documentation structure
- [x] Write setup guide
- [x] Write architecture documentation
- [x] Write API documentation
- [x] Write deployment guide
- [x] Write contributing guide

### Git & GitHub
- [x] Initialize Git repository
- [x] Create .gitignore
- [ ] Create GitHub repository
- [ ] Push initial commit
- [ ] Set up repository description and topics
- [ ] Add LICENSE file (Apache 2.0)

### Project Management
- [ ] Set up issue templates
- [ ] Create project board
- [ ] Set up CI/CD pipeline
- [ ] Add automated testing

---

## Notes

- Tasks are organized by phase but can be worked on in parallel where appropriate
- Some tasks may be refined as development progresses
- Priority should be given to Phase 1-3 for MVP functionality
- Frontend (Phase 4) can be developed alongside API (Phase 3) once basic endpoints are ready

## Progress Tracking

- **Phase 1**: Not started
- **Phase 2**: Not started
- **Phase 3**: Not started
- **Phase 4**: Not started
- **Phase 5**: Not started

Last updated: [Current Date]

