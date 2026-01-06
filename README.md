# WhatToRead

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

An open-source, high-performance recommendation engine designed to navigate the "long tail" of literature. Unlike traditional bestseller lists or collaborative filters that recommend only what is popular, WhatToRead uses Vector Semantics to match readers with books based on obscure themes, moods, and specific settings—derived from the massive Open Library dataset.

## Features

### The Engine (Semantic Search)
At its core, WhatToRead is a scalable data pipeline that ingests Open Library's raw data dumps (millions of works), filters for quality publications, and transforms book metadata into mathematical vectors using Sentence-BERT. It utilizes PostgreSQL with the pgvector extension to perform instant similarity searches, finding connections between books that share distinct "vibes" rather than just keywords.

### The Interface (Interactive Discovery)
Moving beyond static lists, the front-end features a "Tinder-for-Books" card stack. As users swipe on books they like or dislike, the algorithm performs real-time vector interpolation, dynamically adjusting future recommendations to match the evolving taste profile of the user.

## Why WhatToRead?

1. **To Solve the "Obscurity" Problem**
   Existing platforms like Goodreads and Amazon optimize for sales and popularity. They struggle to surface niche, older, or genre-bending titles. WhatToRead is designed to find the "perfect match" in the millions of books that get ignored by commercial algorithms.

2. **To Champion Open Standards**
   Book data is public domain, but the tools to discover it are locked behind proprietary "black boxes." By releasing WhatToRead as an Open Source project (Apache 2.0), we provide a transparent, community-owned alternative. This ensures that recommendation logic is verifiable and free from ad-driven manipulation.

3. **To Explore Vector UX**
   Most applications of Vector AI are hidden in backend chatbots. WhatToRead experiments with "Vector Morphing" in the UI—allowing users to physically steer the recommendation engine through swipes and sliders, visualizing how their taste shifts in real-time.

## Quick Start

For detailed setup instructions, see [docs/SETUP.md](docs/SETUP.md).

### Prerequisites
- Python 3.10+
- PostgreSQL 15+ with pgvector extension
- Docker (optional, for containerized deployment)

### Installation

```bash
# Clone the repository
git clone https://github.com/erjavier/what-to-read-next.git
cd what-to-read-next

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

## Documentation

- [Setup Guide](docs/SETUP.md) - Detailed setup instructions for development environment
- [Architecture](docs/ARCHITECTURE.md) - System architecture and data flow documentation
- [API Documentation](docs/API.md) - API endpoints and usage
- [Deployment Guide](docs/DEPLOYMENT.md) - Production deployment instructions
- [Contributing](docs/CONTRIBUTING.md) - Contribution guidelines
- [Product Requirements Document](prd.md) - Complete technical specification

## Development Roadmap

See [TODO.md](TODO.md) for the current development roadmap and task list.

## Technology Stack

- **Backend**: Python 3.10+, FastAPI
- **Database**: PostgreSQL 15+ with pgvector extension
- **ML/AI**: sentence-transformers (Sentence-BERT)
- **Frontend**: React (Vite) or Vanilla JS
- **Infrastructure**: Docker, Nginx

## License

Apache 2.0 - See LICENSE file for details.

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](docs/CONTRIBUTING.md) for guidelines.

