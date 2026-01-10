/**
 * Image Preloader
 * Preloads images for better perceived performance, especially useful for swipe stacks
 * where the next items are predictable
 */

interface PreloadOptions {
	maxConcurrent?: number; // Maximum number of concurrent preloads
	priority?: 'low' | 'high'; // Fetch priority hint
	timeout?: number; // Timeout in milliseconds
}

class ImagePreloader {
	private preloadedUrls = new Set<string>();
	private inFlight = new Set<string>();
	private queue: Array<{ url: string; resolve: () => void; reject: (error: Error) => void }> = [];
	private maxConcurrent: number;
	private activeCount = 0;

	constructor(maxConcurrent = 5) {
		this.maxConcurrent = maxConcurrent;
	}

	/**
	 * Preload a single image
	 */
	async preload(url: string, options: PreloadOptions = {}): Promise<void> {
		// Skip if already preloaded or currently in-flight
		if (this.preloadedUrls.has(url) || this.inFlight.has(url)) {
			return Promise.resolve();
		}

		return new Promise<void>((resolve, reject) => {
			// Check cache first (browser cache)
			const img = new Image();
			
			img.onload = () => {
				this.preloadedUrls.add(url);
				this.inFlight.delete(url);
				this.activeCount--;
				this.processQueue();
				resolve();
			};

			img.onerror = (error) => {
				this.inFlight.delete(url);
				this.activeCount--;
				this.processQueue();
				reject(new Error(`Failed to preload image: ${url}`));
			};

			// Set fetch priority if supported
			if (options.priority && 'fetchPriority' in img) {
				(img as any).fetchPriority = options.priority;
			}

			// Set timeout if specified
			if (options.timeout) {
				setTimeout(() => {
					if (this.inFlight.has(url)) {
						img.onload = null;
						img.onerror = null;
						this.inFlight.delete(url);
						this.activeCount--;
						this.processQueue();
						reject(new Error(`Preload timeout: ${url}`));
					}
				}, options.timeout);
			}

			// Add to in-flight set
			this.inFlight.add(url);

			// If we're at max concurrent, queue it
			if (this.activeCount >= this.maxConcurrent) {
				this.queue.push({ url, resolve, reject });
				return;
			}

			// Start preloading
			this.activeCount++;
			img.src = url;
		});
	}

	/**
	 * Preload multiple images
	 */
	async preloadBatch(urls: string[], options: PreloadOptions = {}): Promise<void[]> {
		return Promise.allSettled(
			urls.map(url => this.preload(url, options).catch(err => {
				console.warn(`Failed to preload image: ${url}`, err);
				// Don't throw - continue with other images
			}))
		).then(() => Promise.resolve([]));
	}

	/**
	 * Process the preload queue
	 */
	private processQueue(): void {
		while (this.queue.length > 0 && this.activeCount < this.maxConcurrent) {
			const item = this.queue.shift();
			if (item && !this.preloadedUrls.has(item.url) && !this.inFlight.has(item.url)) {
				this.preload(item.url)
					.then(item.resolve)
					.catch(item.reject);
			}
		}
	}

	/**
	 * Check if an image is already preloaded
	 */
	isPreloaded(url: string): boolean {
		return this.preloadedUrls.has(url);
	}

	/**
	 * Clear preloaded cache (useful for memory management)
	 */
	clear(): void {
		this.preloadedUrls.clear();
		this.inFlight.clear();
		this.queue = [];
		this.activeCount = 0;
	}

	/**
	 * Get statistics
	 */
	getStats() {
		return {
			preloaded: this.preloadedUrls.size,
			inFlight: this.inFlight.size,
			queued: this.queue.length,
			active: this.activeCount
		};
	}
}

// Export a singleton instance
export const imagePreloader = new ImagePreloader(5);

/**
 * Preload book cover images for next N books in swipe stack
 */
export async function preloadBookCovers(
	books: Array<{ ol_key?: string }>,
	startIndex: number,
	count: number = 3
): Promise<void> {
	if (typeof window === 'undefined') return;

	const urls: string[] = [];
	
	for (let i = 0; i < count && startIndex + i < books.length; i++) {
		const book = books[startIndex + i];
		if (book.ol_key) {
			// Preload medium size cover (most likely to be displayed next)
			const coverUrl = `https://covers.openlibrary.org/b/olid/${book.ol_key}-M.jpg`;
			if (!imagePreloader.isPreloaded(coverUrl)) {
				urls.push(coverUrl);
			}
		}
	}

	if (urls.length > 0) {
		await imagePreloader.preloadBatch(urls, { priority: 'low', timeout: 5000 });
	}
}
