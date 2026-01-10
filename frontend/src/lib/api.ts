import type { Book, BookDetail, RecommendationRequest, HealthResponse } from './types';
import { apiCache } from './cache';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Cache TTL constants (in milliseconds)
const RECOMMENDATIONS_CACHE_TTL = 10 * 60 * 1000; // 10 minutes - search results change less frequently
const BOOK_DETAIL_CACHE_TTL = 30 * 60 * 1000; // 30 minutes - book details are static
const HEALTH_CACHE_TTL = 1 * 60 * 1000; // 1 minute - health checks should be relatively fresh

export async function getHealth(): Promise<HealthResponse> {
	const cached = apiCache.get<HealthResponse>('/health', {});
	if (cached) {
		return cached;
	}

	const response = await fetch(`${API_BASE_URL}/health`);
	if (!response.ok) {
		throw new Error('Health check failed');
	}
	const data = await response.json();
	
	apiCache.set('/health', {}, data, HEALTH_CACHE_TTL);
	return data;
}

export async function getRecommendations(request: RecommendationRequest): Promise<Book[]> {
	const params = {
		query: request.query,
		limit: request.limit || 10
	};

	// Check cache first
	const cached = apiCache.get<Book[]>('/recommend', params);
	if (cached) {
		return cached;
	}

	// Fetch from API
	const response = await fetch(`${API_BASE_URL}/recommend`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(params)
	});

	if (!response.ok) {
		const error = await response.json().catch(() => ({ detail: 'Failed to get recommendations' }));
		throw new Error(error.detail || 'Failed to get recommendations');
	}

	const data = await response.json();
	
	// Cache the response
	apiCache.set('/recommend', params, data, RECOMMENDATIONS_CACHE_TTL);
	
	return data;
}

export async function getBookDetail(bookId: number): Promise<BookDetail> {
	const params = { id: bookId };

	// Check cache first
	const cached = apiCache.get<BookDetail>('/books/:id', params);
	if (cached) {
		return cached;
	}

	// Fetch from API
	const response = await fetch(`${API_BASE_URL}/books/${bookId}`);
	
	if (!response.ok) {
		if (response.status === 404) {
			throw new Error('Book not found');
		}
		throw new Error('Failed to fetch book details');
	}

	const data = await response.json();
	
	// Cache the response (book details are static, so longer TTL)
	apiCache.set('/books/:id', params, data, BOOK_DETAIL_CACHE_TTL);
	
	return data;
}

/**
 * Clear cache for specific endpoint or all cache
 */
export function clearCache(endpoint?: string, params?: Record<string, any>): void {
	if (endpoint && params) {
		apiCache.delete(endpoint, params);
	} else {
		apiCache.clear();
	}
}
