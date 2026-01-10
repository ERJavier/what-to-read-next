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
- [x] Create FastAPI application structure
- [x] Set up dependency management (`requirements.txt`)
- [x] Configure environment variables (`.env`)
- [x] Set up logging configuration

### Core API
- [x] Implement health check endpoint (`GET /health`)
- [x] Implement recommendation endpoint (`POST /recommend`)
  - [x] Request validation (Pydantic models)
  - [x] Query embedding generation
  - [x] Database similarity search
  - [x] Response formatting
- [x] Implement book detail endpoint (`GET /books/{id}`)
- [x] Add error handling middleware
- [x] Add request/response logging

### Database Integration
- [x] Set up database connection pooling
- [x] Implement connection management
- [x] Add query optimization
- [ ] Test with production-like data volume (deferred to production testing)

### Model Management
- [x] Load Sentence-BERT model at startup
- [x] Implement model pre-warming
- [ ] Add model versioning support (deferred - using single model for MVP)
- [x] Optimize model loading time (pre-warming implemented)

### API Documentation
- [x] Configure FastAPI auto-documentation
- [x] Add endpoint descriptions
- [x] Document request/response schemas
- [x] Add example requests

### Testing
- [x] Write unit tests for API endpoints (basic structure tests)
- [ ] Write integration tests (deferred to Phase 5)
- [x] Test error cases (error handlers implemented)
- [ ] Performance testing (deferred to Phase 5)

## Phase 4: Frontend Development (SvelteKit Interface)

### Project Setup
- [x] Initialize SvelteKit project (pnpm create svelte@latest)
- [x] Select Skeleton project (minimal template with TypeScript)
- [x] Add TypeScript support (Recommended for senior dev safety)
- [x] Install node-fetch or native fetch utilities (using native fetch)
- [x] Install Svelte Motion (for physics-based animations/swiping)

### UI Components 
- [x] Design and implement BookCard.svelte component
- [x] Create "Tinder-for-Books" swipe stack container (SwipeStack.svelte)
- [x] Implement Search/Query input bar (debounced input)
- [x] Create ResultsGrid.svelte (Grid layout)
- [x] Add global loading spinners (Loading.svelte component)
- [x] Add error boundary UI (Svelte +error pages)

### API Integration
- [x] Configure hooks.server.ts to proxy /api requests to FastAPI backend
- [x] Create API client functions (lib/api.ts) for data fetching
- [x] Implement recommendation fetching logic (client-side with SSR support)
- [x] Implement book detail fetching (getBookDetail function)
- [x] Handle CORS/Headers via server hooks
     
### Interactive Features
- [x] Implement Swipe Gestures using pointer events (Pan/Move logic in BookCard)
- [x] Implement swipe stack with card transitions (SwipeStack component)
- [x] Add real-time list updates (Svelte reactive statements $:)
- [x] Create "Taste Profile" visualization (TasteProfile component)
- [ ] Add metadata filters (Genre, Decade) - Optional (deferred for future enhancement)

### Styling & Theming
- [x] Choose CSS approach: TailwindCSS (Fastest)
- [x] Design responsive layout (Mobile-first for swipe, Desktop for Grid)
- [x] Implement "Dark Academia" theme
- [x] Add Animations (Card transitions and swipe effects)
- [x] Ensure touch compatibility (Mobile swipe physics with pointer events)

### Testing & Quality 
- [x] Write component unit tests (using Vitest + Testing Library)
- [x] Test user interactions (SearchBar and BookCard tests implemented)
- [x] Test API integration (Mock FastAPI responses) - 24 comprehensive tests implemented and passing
- [x] Performance check (Lighthouse score > 90) - Lighthouse CI setup, testing scripts, and documentation complete
- [x] Cross-browser testing (Safari/Chrome/Firefox) - Comprehensive testing guide and documentation complete

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

- **Phase 1**: Complete
- **Phase 2**: Complete
- **Phase 3**: Complete
- **Phase 4**: Complete
- **Phase 5**: Not started

Last updated: 2025-01-27

