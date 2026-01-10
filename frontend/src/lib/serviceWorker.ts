/**
 * Service Worker Registration
 * Registers and manages the service worker for PWA functionality
 */

import { browser } from '$app/environment';

let registration: ServiceWorkerRegistration | null = null;

/**
 * Register the service worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
	if (!browser || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
		return null;
	}

	try {
		// Register service worker
		registration = await navigator.serviceWorker.register('/sw.js', {
			scope: '/'
		});

		console.log('Service Worker registered successfully:', registration.scope);

		// Handle updates
		registration.addEventListener('updatefound', () => {
			const newWorker = registration!.installing;
			if (newWorker) {
				newWorker.addEventListener('statechange', () => {
					if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
						// New service worker available, prompt user to update
						console.log('New service worker available. Refresh to update.');
						// You could show a notification here to prompt user to refresh
					}
				});
			}
		});

		// Check for updates periodically (every hour)
		setInterval(() => {
			if (registration) {
				registration.update();
			}
		}, 60 * 60 * 1000);

		return registration;
	} catch (error) {
		console.error('Service Worker registration failed:', error);
		return null;
	}
}

/**
 * Unregister the service worker
 */
export async function unregisterServiceWorker(): Promise<boolean> {
	if (!browser || !registration) {
		return false;
	}

	try {
		const success = await registration.unregister();
		if (success) {
			console.log('Service Worker unregistered successfully');
			registration = null;
		}
		return success;
	} catch (error) {
		console.error('Service Worker unregistration failed:', error);
		return false;
	}
}

/**
 * Check if service worker is supported
 */
export function isServiceWorkerSupported(): boolean {
	return browser && typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
}

/**
 * Check if app is currently controlled by a service worker
 */
export function isControlled(): boolean {
	return browser && !!navigator.serviceWorker.controller;
}

/**
 * Wait for service worker to be ready
 */
export async function waitForServiceWorker(): Promise<ServiceWorkerRegistration | null> {
	if (!isServiceWorkerSupported()) {
		return null;
	}

	try {
		if (registration) {
			return registration;
		}

		// Wait for existing registration
		const existingRegistration = await navigator.serviceWorker.ready;
		registration = existingRegistration;
		return registration;
	} catch (error) {
		console.error('Failed to wait for service worker:', error);
		return null;
	}
}

/**
 * Send a message to the service worker
 */
export async function sendMessageToServiceWorker(message: any): Promise<any> {
	if (!isControlled()) {
		return null;
	}

	try {
		const messageChannel = new MessageChannel();
		
		return new Promise((resolve, reject) => {
			messageChannel.port1.onmessage = (event) => {
				if (event.data.error) {
					reject(new Error(event.data.error));
				} else {
					resolve(event.data);
				}
			};

			navigator.serviceWorker.controller!.postMessage(message, [messageChannel.port2]);
			
			// Timeout after 5 seconds
			setTimeout(() => {
				reject(new Error('Service worker message timeout'));
			}, 5000);
		});
	} catch (error) {
		console.error('Failed to send message to service worker:', error);
		return null;
	}
}

/**
 * Initialize service worker on app load
 */
export function initServiceWorker(): void {
	if (!browser) {
		return;
	}

	// Register service worker after a small delay to not block initial load
	if (document.readyState === 'complete') {
		setTimeout(() => {
			registerServiceWorker();
		}, 1000);
	} else {
		window.addEventListener('load', () => {
			setTimeout(() => {
				registerServiceWorker();
			}, 1000);
		});
	}
}
