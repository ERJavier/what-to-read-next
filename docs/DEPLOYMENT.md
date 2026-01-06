# Deployment Guide

This guide covers deploying WhatToRead to production environments.

## Prerequisites

- Docker and Docker Compose installed
- PostgreSQL 15+ with pgvector (or managed service)
- Domain name and SSL certificate (for production)
- Server with sufficient resources (see Requirements section)

## System Requirements

### Minimum Requirements
- **CPU**: 2 cores
- **RAM**: 4GB
- **Storage**: 50GB (for database and models)
- **Network**: Stable internet connection

### Recommended for Production
- **CPU**: 4+ cores
- **RAM**: 8GB+
- **Storage**: 100GB+ SSD
- **Network**: High bandwidth, low latency

## Deployment Options

### Option 1: Docker Compose (Recommended for VPS)

This is the simplest deployment method for a single server.

#### Step 1: Clone Repository

```bash
git clone https://github.com/ERJavier/what-to-read-next.git
cd what-to-read-next
```

#### Step 2: Configure Environment

Create a `.env` file:

```bash
# Database
POSTGRES_USER=whattoread
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=whattoread
DATABASE_URL=postgresql://whattoread:your_secure_password@postgres:5432/whattoread

# API
API_HOST=0.0.0.0
API_PORT=8000

# Model
EMBEDDING_MODEL=all-MiniLM-L6-v2

# Security
SECRET_KEY=your_secret_key_here
```

#### Step 3: Start Services

```bash
docker-compose up -d
```

#### Step 4: Run Database Migrations

```bash
docker-compose exec api python scripts/init_db.py
```

#### Step 5: Load Data (if not already loaded)

```bash
# Copy data dump to container
docker cp ol_dump_works_latest.txt.gz what-to-read-next_api_1:/app/

# Run ETL
docker-compose exec api python etl/ingest.py
```

### Option 2: Managed PostgreSQL + Docker (Recommended for Cloud)

Use a managed PostgreSQL service (Supabase, Railway, AWS RDS) and deploy only the API with Docker.

#### Step 1: Set Up Managed PostgreSQL

1. Create a PostgreSQL instance with pgvector extension
2. Note the connection string
3. Create the database schema (run SQL from `prd.md`)

#### Step 2: Configure Environment

```bash
DATABASE_URL=postgresql://user:pass@host:5432/dbname
API_HOST=0.0.0.0
API_PORT=8000
```

#### Step 3: Deploy API Container

```bash
docker build -t whattoread-api .
docker run -d \
  --name whattoread-api \
  -p 8000:8000 \
  --env-file .env \
  whattoread-api
```

### Option 3: Kubernetes (For Scale)

For large-scale deployments, use Kubernetes. See `k8s/` directory for manifests (to be created).

## Reverse Proxy Setup (Nginx)

### Nginx Configuration

Create `/etc/nginx/sites-available/whattoread`:

```nginx
server {
    listen 80;
    server_name api.whattoread.example.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.whattoread.example.com;

    ssl_certificate /etc/letsencrypt/live/api.whattoread.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.whattoread.example.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # API proxy
    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static files (if serving frontend)
    location /static {
        alias /var/www/whattoread/static;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/whattoread /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## SSL Certificate (Let's Encrypt)

```bash
sudo certbot --nginx -d api.whattoread.example.com
```

## Database Optimization

### Index Tuning

After loading data, optimize the vector index:

```sql
-- Calculate optimal lists parameter
-- lists = sqrt(total_rows) / 1000
-- For 5 million books: lists ≈ 2236

-- Drop existing index
DROP INDEX IF EXISTS books_embedding_idx;

-- Create optimized index
CREATE INDEX books_embedding_idx 
ON books 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 2236);

-- Analyze table
ANALYZE books;
```

### Connection Pooling

Use PgBouncer or connection pooling in your application:

```python
# In FastAPI app
from psycopg_pool import ConnectionPool

pool = ConnectionPool(
    conninfo=os.getenv("DATABASE_URL"),
    min_size=5,
    max_size=20
)
```

## Monitoring and Logging

### Application Logs

```bash
# View logs
docker-compose logs -f api

# Or for direct deployment
journalctl -u whattoread-api -f
```

### Database Monitoring

Monitor PostgreSQL performance:

```sql
-- Check index usage
SELECT * FROM pg_stat_user_indexes WHERE schemaname = 'public';

-- Check table size
SELECT pg_size_pretty(pg_total_relation_size('books'));
```

### Health Checks

Set up monitoring for:

- API health endpoint: `GET /health`
- Database connectivity
- Disk space
- Memory usage
- Response times

## Backup Strategy

### Database Backups

```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d)
pg_dump -h localhost -U whattoread whattoread | gzip > backup_$DATE.sql.gz

# Restore
gunzip < backup_20240101.sql.gz | psql -h localhost -U whattoread whattoread
```

### Automated Backups

Set up cron job:

```bash
# Add to crontab
0 2 * * * /path/to/backup_script.sh
```

## Scaling

### Horizontal Scaling

1. Deploy multiple API instances behind a load balancer
2. Use read replicas for PostgreSQL
3. Implement caching layer (Redis) for frequent queries

### Vertical Scaling

1. Increase server resources
2. Optimize database indexes
3. Use faster storage (SSD)

## Security Checklist

- [ ] Change all default passwords
- [ ] Use strong database passwords
- [ ] Enable SSL/TLS
- [ ] Set up firewall rules
- [ ] Keep dependencies updated
- [ ] Implement rate limiting
- [ ] Set up monitoring and alerts
- [ ] Regular security audits
- [ ] Backup encryption

## Troubleshooting

### API Not Starting

- Check logs: `docker-compose logs api`
- Verify environment variables
- Check port availability
- Verify database connectivity

### Slow Queries

- Check index usage
- Optimize `lists` parameter
- Increase database resources
- Review query patterns

### Out of Memory

- Reduce batch sizes in ETL
- Increase server RAM
- Optimize model loading
- Use connection pooling

## Related Documentation

- [Setup Guide](SETUP.md) - Development setup
- [Architecture Documentation](ARCHITECTURE.md) - System design
- [Product Requirements Document](../prd.md) - Technical specifications

