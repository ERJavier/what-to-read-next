# Development Roadmap

This document tracks the development progress of WhatToRead. Tasks are organized by phase as outlined in the Product Requirements Document.

## Phase 1: Database Setup (PostgreSQL + pgvector)

### Infrastructure
- [ ] Install PostgreSQL 15+ locally
- [ ] Install pgvector extension
- [ ] Create database `whattoread`
- [ ] Enable pgvector extension in database

### Schema Creation
- [ ] Create `books` table with required columns
  - [ ] `id` (BIGSERIAL PRIMARY KEY)
  - [ ] `ol_key` (TEXT, UNIQUE)
  - [ ] `title` (TEXT)
  - [ ] `authors` (TEXT[])
  - [ ] `first_publish_year` (INT)
  - [ ] `subjects` (TEXT[])
  - [ ] `search_content` (TEXT)
  - [ ] `embedding` (vector(384))
- [ ] Create database initialization script (`scripts/init_db.py`)
- [ ] Test schema with sample data

### Indexing
- [ ] Create IVFFlat index on embedding column
- [ ] Tune `lists` parameter based on expected data size
- [ ] Test index performance with sample queries

## Phase 2: ETL Pipeline (Data Ingestion and Embedding)

### Data Acquisition
- [ ] Download Open Library works dump
- [ ] Set up data streaming for large files
- [ ] Create data validation utilities

### Data Processing
- [ ] Implement quality filtering logic (`is_real_publisher`)
  - [ ] Filter by subject count (minimum 3 subjects)
  - [ ] Filter by publisher quality (if applicable)
- [ ] Implement data transformation
  - [ ] Extract Open Library work keys
  - [ ] Parse author information
  - [ ] Extract publication year
  - [ ] Combine fields for embedding context
- [ ] Create `etl/ingest.py` script
- [ ] Implement batch processing (1000 records per batch)

### Embedding Generation
- [ ] Install sentence-transformers library
- [ ] Load `all-MiniLM-L6-v2` model
- [ ] Implement batch embedding generation
- [ ] Test embedding quality with sample queries

### Database Insertion
- [ ] Implement batch insert using `executemany`
- [ ] Add error handling and retry logic
- [ ] Add progress tracking (tqdm)
- [ ] Test with subset of data (100k records)

### Optimization
- [ ] Optimize batch size for memory/performance
- [ ] Add logging and monitoring
- [ ] Create index after full data load
- [ ] Run full ETL on complete dataset

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

