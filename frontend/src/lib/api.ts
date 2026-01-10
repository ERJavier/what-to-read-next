import type { Book, BookDetail, RecommendationRequest, HealthResponse } from './types';
import { apiCache } from './cache';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const REQUEST_TIMEOUT = 30000; // 30 seconds timeout for general API requests
const RECOMMENDATION_TIMEOUT = 60000; // 60 seconds timeout for recommendation requests (can take longer due to embedding + similarity search)

// Cache TTL constants (in milliseconds)
const RECOMMENDATIONS_CACHE_TTL = 10 * 60 * 1000; // 10 minutes - search results change less frequently
const BOOK_DETAIL_CACHE_TTL = 30 * 60 * 1000; // 30 minutes - book details are static
const HEALTH_CACHE_TTL = 1 * 60 * 1000; // 1 minute - health checks should be relatively fresh

// Request deduplication: track in-flight requests to prevent duplicate API calls
const inFlightRequests = new Map<string, Promise<any>>();

/**
 * Fetch with timeout wrapper
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs: number = REQUEST_TIMEOUT): Promise<Response> {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

	try {
		const response = await fetch(url, {
			...options,
			signal: controller.signal
		});
		clearTimeout(timeoutId);
		return response;
	} catch (error) {
		clearTimeout(timeoutId);
		if (error instanceof Error && error.name === 'AbortError') {
			if (timeoutMs >= RECOMMENDATION_TIMEOUT) {
				throw new Error(`Request timeout: The recommendation search is taking longer than expected (over ${timeoutMs / 1000} seconds). This can happen with complex queries or large datasets. Please try a different search query or check back later.`);
			}
			throw new Error(`Request timeout: The server did not respond within ${timeoutMs / 1000} seconds. Please check if the API server is running.`);
		}
		if (error instanceof TypeError && error.message.includes('fetch')) {
			throw new Error(`Network error: Unable to connect to the API server at ${API_BASE_URL}. Please ensure the server is running.`);
		}
		throw error;
	}
}

export async function getHealth(): Promise<HealthResponse> {
	const cached = apiCache.get<HealthResponse>('/health', {});
	if (cached) {
		return cached;
	}

	try {
		const response = await fetchWithTimeout(`${API_BASE_URL}/health`, {}, 5000); // Shorter timeout for health checks
		if (!response.ok) {
			throw new Error('Health check failed');
		}
		const data = await response.json();
		
		apiCache.set('/health', {}, data, HEALTH_CACHE_TTL);
		return data;
	} catch (error) {
		if (error instanceof Error) {
			throw error;
		}
		throw new Error('Health check failed');
	}
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

	// Generate request key for deduplication
	const requestKey = `/recommend:${JSON.stringify(params)}`;

	// Check if there's an in-flight request with the same parameters
	if (inFlightRequests.has(requestKey)) {
		// Return the existing promise to avoid duplicate requests
		return inFlightRequests.get(requestKey)!;
	}

	// Create a new request promise
	const requestPromise = (async () => {
		try {
			// Fetch from API with longer timeout for recommendations (embedding + similarity search can take time)
			const response = await fetchWithTimeout(`${API_BASE_URL}/recommend`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(params)
			}, RECOMMENDATION_TIMEOUT);

			if (!response.ok) {
				const error = await response.json().catch(() => ({ detail: 'Failed to get recommendations' }));
				throw new Error(error.detail || `Failed to get recommendations (${response.status} ${response.statusText})`);
			}

			const data = await response.json();
			
			// Cache the response
			apiCache.set('/recommend', params, data, RECOMMENDATIONS_CACHE_TTL);
			
			return data;
		} catch (error) {
			// Re-throw with more context if it's not already an Error
			if (error instanceof Error) {
				throw error;
			}
			throw new Error('Failed to get recommendations');
		} finally {
			// Remove from in-flight requests after completion
			inFlightRequests.delete(requestKey);
		}
	})();

	// Store the promise for deduplication
	inFlightRequests.set(requestKey, requestPromise);

	return requestPromise;
}

export async function getBookDetail(bookId: number): Promise<BookDetail> {
	const params = { id: bookId };

	// Check cache first
	const cached = apiCache.get<BookDetail>('/books/:id', params);
	if (cached) {
		return cached;
	}

	// Generate request key for deduplication
	const requestKey = `/books/${bookId}`;

	// Check if there's an in-flight request with the same bookId
	if (inFlightRequests.has(requestKey)) {
		// Return the existing promise to avoid duplicate requests
		return inFlightRequests.get(requestKey)!;
	}

	// Create a new request promise
	const requestPromise = (async () => {
		try {
			// Fetch from API with timeout
			const response = await fetchWithTimeout(`${API_BASE_URL}/books/${bookId}`);
			
			if (!response.ok) {
				if (response.status === 404) {
					throw new Error('Book not found');
				}
				throw new Error(`Failed to fetch book details (${response.status} ${response.statusText})`);
			}

			const data = await response.json();
			
			// Cache the response (book details are static, so longer TTL)
			apiCache.set('/books/:id', params, data, BOOK_DETAIL_CACHE_TTL);
			
			return data;
		} catch (error) {
			// Re-throw with more context if it's not already an Error
			if (error instanceof Error) {
				throw error;
			}
			throw new Error('Failed to fetch book details');
		} finally {
			// Remove from in-flight requests after completion
			inFlightRequests.delete(requestKey);
		}
	})();

	// Store the promise for deduplication
	inFlightRequests.set(requestKey, requestPromise);

	return requestPromise;
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
