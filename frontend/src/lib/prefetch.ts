/**
 * Prefetch Utilities
 * Prefetches resources for likely navigation targets to improve perceived performance
 */

import { browser } from '$app/environment';

/**
 * Prefetch a route by prefetching its data and assets
 */
export async function prefetchRoute(href: string): Promise<void> {
	if (!browser || typeof window === 'undefined') return;

	try {
		// Use the browser's built-in prefetch for better performance
		// This prefetches the HTML page and its resources
		const link = document.createElement('link');
		link.rel = 'prefetch';
		link.href = href;
		document.head.appendChild(link);

		// For SvelteKit, also prefetch data using the native API
		if ('requestIdleCallback' in window) {
			requestIdleCallback(() => {
				// Prefetch the data for the route
				// In SvelteKit, we can use the $app/navigation prefetch function
				// But we'll do it manually here for better control
				fetch(href, {
					method: 'GET',
					headers: {
						'X-SvelteKit-Prefetch': '1'
					}
				}).catch(() => {
					// Silently fail - prefetching is an optimization
				});
			});
		} else {
			// Fallback for browsers without requestIdleCallback
			setTimeout(() => {
				fetch(href, {
					method: 'GET',
					headers: {
						'X-SvelteKit-Prefetch': '1'
					}
				}).catch(() => {
					// Silently fail
				});
			}, 100);
		}
	} catch (error) {
		// Silently fail - prefetching is a performance optimization
		if (import.meta.env.DEV) {
			console.debug('Failed to prefetch route', href, error);
		}
	}
}

/**
 * Prefetch multiple routes
 */
export async function prefetchRoutes(hrefs: string[]): Promise<void> {
	if (!browser || typeof window === 'undefined') return;

	// Prefetch routes one by one to avoid overwhelming the browser
	for (const href of hrefs) {
		await prefetchRoute(href);
		// Small delay between prefetches to avoid overwhelming the connection
		await new Promise(resolve => setTimeout(resolve, 50));
	}
}

/**
 * Prefetch routes on hover (for links)
 */
export function prefetchOnHover(element: HTMLElement, href: string): () => void {
	if (!browser || typeof window === 'undefined') {
		return () => {};
	}

	let prefetched = false;

	const handleMouseEnter = () => {
		if (!prefetched) {
			prefetched = true;
			prefetchRoute(href).catch(() => {
				// Silently fail
			});
		}
	};

	const handleTouchStart = () => {
		if (!prefetched) {
			prefetched = true;
			prefetchRoute(href).catch(() => {
				// Silently fail
			});
		}
	};

	element.addEventListener('mouseenter', handleMouseEnter, { passive: true });
	element.addEventListener('touchstart', handleTouchStart, { passive: true });

	return () => {
		element.removeEventListener('mouseenter', handleMouseEnter);
		element.removeEventListener('touchstart', handleTouchStart);
	};
}

/**
 * Prefetch likely navigation targets based on user behavior
 */
export function setupIntelligentPrefetching(): () => void {
	if (!browser) {
		return () => {};
	}

	// Prefetch common routes after page load (using idle time)
	const commonRoutes = ['/saved', '/taste-profile'];

	let timeoutId: ReturnType<typeof setTimeout> | null = null;

	const prefetchCommonRoutes = () => {
		if (!browser || typeof window === 'undefined') return;
		
		const win = window as Window;
		
		if ('requestIdleCallback' in win) {
			win.requestIdleCallback(
				() => {
					prefetchRoutes(commonRoutes).catch(() => {
						// Silently fail
					});
				},
				{ timeout: 2000 }
			);
		} else {
			// Fallback: wait for page to be fully loaded
			if (document.readyState === 'complete') {
				setTimeout(() => {
					prefetchRoutes(commonRoutes).catch(() => {
						// Silently fail
					});
				}, 2000);
			} else {
				win.addEventListener('load', () => {
					setTimeout(() => {
						prefetchRoutes(commonRoutes).catch(() => {
							// Silently fail
						});
					}, 2000);
				});
			}
		}
	};

	// Start prefetching after a delay
	timeoutId = setTimeout(prefetchCommonRoutes, 3000);

	return () => {
		if (timeoutId) {
			clearTimeout(timeoutId);
		}
	};
}

/**
 * Prefetch book detail pages for visible books
 */
export function prefetchBookDetails(bookIds: number[]): void {
	if (!browser || typeof window === 'undefined') return;

	bookIds.forEach(bookId => {
		const href = `/books/${bookId}`;
		prefetchRoute(href).catch(() => {
			// Silently fail
		});
	});
}
