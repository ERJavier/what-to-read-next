/**
 * Service Worker for WhatToRead PWA
 * Provides offline support and caching strategies
 */

const CACHE_NAME = 'whattoread-v1';
const RUNTIME_CACHE = 'whattoread-runtime-v1';
const STATIC_CACHE = 'whattoread-static-v1';

// Assets to cache immediately on install
const STATIC_ASSETS = [
	'/',
	'/app.css',
	'/favicon.png'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(STATIC_CACHE).then((cache) => {
			return cache.addAll(STATIC_ASSETS).catch((err) => {
				console.warn('Failed to cache some static assets:', err);
			});
		})
	);
	// Activate immediately
	self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys().then((cacheNames) => {
			return Promise.all(
				cacheNames
					.filter((name) => {
						return name !== STATIC_CACHE && name !== RUNTIME_CACHE && name !== CACHE_NAME;
					})
					.map((name) => caches.delete(name))
			);
		})
	);
	// Take control of all clients immediately
	return self.clients.claim();
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
	const { request } = event;
	const url = new URL(request.url);

	// Skip WebSocket upgrade requests (they shouldn't go through fetch, but just in case)
	if (request.headers.get('upgrade') === 'websocket') {
		return;
	}

	// Skip non-GET requests
	if (request.method !== 'GET') {
		return;
	}

	// Skip cross-origin requests (only cache same-origin)
	if (url.origin !== self.location.origin && !url.href.includes('covers.openlibrary.org')) {
		return;
	}

	// Handle API requests with network-first strategy
	if (url.pathname.startsWith('/api') || url.pathname.includes('/recommend') || url.pathname.includes('/books/')) {
		event.respondWith(networkFirstStrategy(request));
		return;
	}

	// Handle book cover images with cache-first strategy
	if (url.href.includes('covers.openlibrary.org')) {
		event.respondWith(cacheFirstStrategy(request, RUNTIME_CACHE));
		return;
	}

	// Handle static assets with cache-first strategy
	if (url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|gif|woff|woff2|ttf|eot)$/)) {
		event.respondWith(cacheFirstStrategy(request, STATIC_CACHE));
		return;
	}

	// Handle HTML pages with network-first strategy
	if (request.headers.get('accept')?.includes('text/html')) {
		event.respondWith(networkFirstStrategy(request));
		return;
	}

	// Default: try network, fallback to cache
	event.respondWith(networkFirstStrategy(request));
});

/**
 * Network-first strategy: Try network, fallback to cache
 */
async function networkFirstStrategy(request) {
	try {
		const networkResponse = await fetch(request);
		
		// Cache successful responses (except for API endpoints we don't want to cache)
		if (networkResponse.ok && !request.url.includes('/api/recommend')) {
			const cache = await caches.open(RUNTIME_CACHE);
			cache.put(request, networkResponse.clone()).catch(() => {
				// Silently fail if cache write fails
			});
		}
		
		return networkResponse;
	} catch (error) {
		// Network failed, try cache
		const cachedResponse = await caches.match(request);
		if (cachedResponse) {
			return cachedResponse;
		}
		
		// If it's an HTML request and we're offline, return offline page
		if (request.headers.get('accept')?.includes('text/html')) {
			const offlinePage = await caches.match('/');
			if (offlinePage) {
				return offlinePage;
			}
		}
		
		// Return a generic error response
		return new Response('Offline - content not available', {
			status: 503,
			headers: { 'Content-Type': 'text/plain' }
		});
	}
}

/**
 * Cache-first strategy: Try cache, fallback to network
 */
async function cacheFirstStrategy(request, cacheName) {
	const cachedResponse = await caches.match(request);
	if (cachedResponse) {
		return cachedResponse;
	}
	
	try {
		const networkResponse = await fetch(request);
		
		// Cache successful responses
		if (networkResponse.ok) {
			const cache = await caches.open(cacheName);
			cache.put(request, networkResponse.clone()).catch(() => {
				// Silently fail if cache write fails
			});
		}
		
		return networkResponse;
	} catch (error) {
		// Return a placeholder for images if offline
		if (request.url.includes('covers.openlibrary.org')) {
			return new Response(
				'<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300"><rect width="200" height="300" fill="#f5f5f5"/><text x="50%" y="50%" text-anchor="middle" fill="#999">No Image</text></svg>',
				{
					status: 200,
					headers: { 'Content-Type': 'image/svg+xml' }
				}
			);
		}
		
		// Return error response
		return new Response('Offline - content not available', {
			status: 503,
			headers: { 'Content-Type': 'text/plain' }
		});
	}
}

// Handle background sync (for offline actions)
self.addEventListener('sync', (event) => {
	if (event.tag === 'sync-saved-books') {
		event.waitUntil(syncSavedBooks());
	}
});

async function syncSavedBooks() {
	// This would sync saved books when coming back online
	// For now, just a placeholder
	console.log('Syncing saved books...');
}

// Handle push notifications (optional - for future use)
self.addEventListener('push', (event) => {
	if (event.data) {
		const data = event.data.json();
		event.waitUntil(
			self.registration.showNotification(data.title, {
				body: data.body,
				icon: '/favicon.png',
				badge: '/favicon.png'
			})
		);
	}
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
	event.notification.close();
	event.waitUntil(
		clients.openWindow(event.notification.data?.url || '/')
	);
});
