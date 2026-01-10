/**
 * API Response Cache
 * Implements a simple in-memory cache with TTL (Time To Live) for API responses
 */

interface CacheEntry<T> {
	data: T;
	timestamp: number;
	ttl: number; // Time to live in milliseconds
}

class APICache {
	private cache = new Map<string, CacheEntry<any>>();
	private maxSize: number;

	constructor(maxSize = 100) {
		this.maxSize = maxSize;
	}

	/**
	 * Generate a cache key from the request parameters
	 */
	private getKey(endpoint: string, params: Record<string, any>): string {
		const sortedParams = Object.keys(params)
			.sort()
			.reduce((acc, key) => {
				acc[key] = params[key];
				return acc;
			}, {} as Record<string, any>);
		
		return `${endpoint}:${JSON.stringify(sortedParams)}`;
	}

	/**
	 * Get cached data if it exists and hasn't expired
	 */
	get<T>(endpoint: string, params: Record<string, any>): T | null {
		const key = this.getKey(endpoint, params);
		const entry = this.cache.get(key);

		if (!entry) {
			return null;
		}

		const now = Date.now();
		const age = now - entry.timestamp;

		if (age > entry.ttl) {
			// Entry has expired, remove it
			this.cache.delete(key);
			return null;
		}

		return entry.data as T;
	}

	/**
	 * Store data in cache with TTL
	 */
	set<T>(endpoint: string, params: Record<string, any>, data: T, ttl: number = 5 * 60 * 1000): void {
		// If cache is at max size, remove oldest entry
		if (this.cache.size >= this.maxSize) {
			const firstKey = this.cache.keys().next().value;
			if (firstKey) {
				this.cache.delete(firstKey);
			}
		}

		const key = this.getKey(endpoint, params);
		this.cache.set(key, {
			data,
			timestamp: Date.now(),
			ttl
		});
	}

	/**
	 * Remove a specific entry from cache
	 */
	delete(endpoint: string, params: Record<string, any>): void {
		const key = this.getKey(endpoint, params);
		this.cache.delete(key);
	}

	/**
	 * Clear all cache entries
	 */
	clear(): void {
		this.cache.clear();
	}

	/**
	 * Remove expired entries (cleanup method)
	 */
	cleanup(): void {
		const now = Date.now();
		const keysToDelete: string[] = [];

		for (const [key, entry] of this.cache.entries()) {
			const age = now - entry.timestamp;
			if (age > entry.ttl) {
				keysToDelete.push(key);
			}
		}

		keysToDelete.forEach(key => this.cache.delete(key));
	}

	/**
	 * Get cache statistics
	 */
	getStats() {
		return {
			size: this.cache.size,
			maxSize: this.maxSize
		};
	}
}

// Export a singleton instance
export const apiCache = new APICache(100); // Max 100 entries

// Cleanup expired entries every 5 minutes
if (typeof window !== 'undefined') {
	setInterval(() => {
		apiCache.cleanup();
	}, 5 * 60 * 1000);
}
