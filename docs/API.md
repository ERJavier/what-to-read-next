# API Documentation

WhatToRead provides a RESTful API built with FastAPI for semantic book recommendations.

## Base URL

- **Development**: `http://localhost:8000`
- **Production**: `https://api.whattoread.example.com` (TBD)

## Interactive Documentation

FastAPI automatically generates interactive API documentation:

- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

## Authentication

Currently, the API is open (no authentication required). Authentication will be added in a future release.

## Endpoints

### Health Check

Check if the API is running and healthy.

**Endpoint**: `GET /health`

**Response**:
```json
{
  "status": "ok"
}
```

**Example**:
```bash
curl http://localhost:8000/health
```

---

### Get Recommendations

Get book recommendations based on a semantic query.

**Endpoint**: `POST /recommend`

**Request Body**:
```json
{
  "query": "dark psychological thrillers with unreliable narrators",
  "limit": 10
}
```

**Parameters**:
- `query` (string, required): Semantic description of desired books
- `limit` (integer, optional): Maximum number of results (default: 10, max: 100)

**Response**:
```json
[
  {
    "title": "Gone Girl",
    "authors": ["Gillian Flynn"],
    "year": 2012,
    "subjects": ["Fiction", "Thrillers", "Psychological"],
    "similarity": 0.85
  },
  {
    "title": "The Girl on the Train",
    "authors": ["Paula Hawkins"],
    "year": 2015,
    "subjects": ["Fiction", "Mystery", "Thrillers"],
    "similarity": 0.82
  }
]
```

**Response Fields**:
- `title` (string): Book title
- `authors` (array of strings): List of author names
- `year` (integer, nullable): First publication year
- `subjects` (array of strings): Subject tags/categories
- `similarity` (float): Similarity score (0-1, higher is more similar)

**Example**:
```bash
curl -X POST http://localhost:8000/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "query": "philosophical science fiction about consciousness",
    "limit": 5
  }'
```

**Error Responses**:
- `400 Bad Request`: Invalid request parameters
- `500 Internal Server Error`: Server error

---

### Get Book by ID

Retrieve detailed information about a specific book.

**Endpoint**: `GET /books/{id}`

**Parameters**:
- `id` (integer, path parameter): Book ID

**Response**:
```json
{
  "id": 12345,
  "ol_key": "/works/OL123456W",
  "title": "Example Book",
  "authors": ["Author Name"],
  "first_publish_year": 2020,
  "subjects": ["Fiction", "Science Fiction"],
  "search_content": "Example Book. Fiction Science Fiction"
}
```

**Example**:
```bash
curl http://localhost:8000/books/12345
```

**Error Responses**:
- `404 Not Found`: Book not found
- `500 Internal Server Error`: Server error

---

## Query Examples

### Example 1: Genre-Based Search
```json
{
  "query": "cyberpunk novels set in dystopian futures",
  "limit": 10
}
```

### Example 2: Mood-Based Search
```json
{
  "query": "melancholic coming-of-age stories",
  "limit": 15
}
```

### Example 3: Setting-Based Search
```json
{
  "query": "mystery novels in Victorian London",
  "limit": 20
}
```

### Example 4: Theme-Based Search
```json
{
  "query": "books about artificial intelligence and ethics",
  "limit": 10
}
```

## Rate Limiting

Rate limiting will be implemented in a future release. Current limits:
- **Development**: No limits
- **Production**: TBD

## Error Handling

All errors follow a consistent format:

```json
{
  "detail": "Error message describing what went wrong"
}
```

### Common Error Codes

- `400 Bad Request`: Invalid request parameters or malformed JSON
- `404 Not Found`: Resource not found
- `422 Unprocessable Entity`: Validation error
- `500 Internal Server Error`: Server-side error

## Response Format

All successful responses return JSON with the following structure:
- Arrays for list endpoints
- Objects for single resource endpoints
- Consistent field naming (snake_case)

## Versioning

API versioning will be implemented in a future release. Current version: `v1` (implicit).

## SDKs and Client Libraries

Official client libraries will be available in the future. For now, use standard HTTP clients:

- **Python**: `requests`, `httpx`
- **JavaScript**: `fetch`, `axios`
- **cURL**: Command-line tool

### Python Example
```python
import requests

response = requests.post(
    "http://localhost:8000/recommend",
    json={
        "query": "space opera with complex characters",
        "limit": 10
    }
)

books = response.json()
for book in books:
    print(f"{book['title']} by {', '.join(book['authors'])}")
```

### JavaScript Example
```javascript
const response = await fetch('http://localhost:8000/recommend', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: 'magical realism in Latin America',
    limit: 10
  })
});

const books = await response.json();
books.forEach(book => {
  console.log(`${book.title} by ${book.authors.join(', ')}`);
});
```

## Related Documentation

- [Setup Guide](SETUP.md) - API server setup
- [Architecture Documentation](ARCHITECTURE.md) - System design
- [Product Requirements Document](../prd.md) - Technical specifications

