/**
 * Performance Monitoring
 * Collects and reports performance metrics for the application
 */

export interface PerformanceMetric {
	name: string;
	value: number;
	unit: string;
	timestamp: number;
	tags?: Record<string, string>;
}

export interface PerformanceReport {
	metrics: PerformanceMetric[];
	timestamp: number;
}

class PerformanceMonitor {
	private metrics: PerformanceMetric[] = [];
	private observers: PerformanceObserver[] = [];
	private enabled: boolean = true;

	constructor() {
		if (typeof window === 'undefined') {
			this.enabled = false;
			return;
		}

		// Check if PerformanceObserver is supported
		if ('PerformanceObserver' in window) {
			this.initObservers();
		}

		// Collect initial page load metrics
		if ('performance' in window && 'getEntriesByType' in window.performance) {
			this.collectPageLoadMetrics();
		}
	}

	/**
	 * Initialize performance observers
	 */
	private initObservers(): void {
		try {
			// Observe navigation timing
			const navObserver = new PerformanceObserver((list) => {
				const entries = list.getEntries();
				entries.forEach((entry) => {
					if (entry.entryType === 'navigation') {
						this.collectNavigationMetrics(entry as PerformanceNavigationTiming);
					}
				});
			});
			navObserver.observe({ entryTypes: ['navigation'] });

			// Observe resource timing
			const resourceObserver = new PerformanceObserver((list) => {
				const entries = list.getEntries();
				entries.forEach((entry) => {
					if (entry.entryType === 'resource') {
						this.collectResourceMetrics(entry as PerformanceResourceTiming);
					}
				});
			});
			resourceObserver.observe({ entryTypes: ['resource'] });

			// Observe paint timing (if supported)
			if ('PerformanceObserver' in window) {
				try {
					const paintObserver = new PerformanceObserver((list) => {
						const entries = list.getEntries();
						entries.forEach((entry) => {
							if (entry.entryType === 'paint') {
								this.collectPaintMetrics(entry as PerformancePaintTiming);
							}
						});
					});
					paintObserver.observe({ entryTypes: ['paint'] });
					this.observers.push(paintObserver);
				} catch (e) {
					// Paint observer not supported in all browsers
				}
			}

			// Observe long tasks (if supported)
			if ('PerformanceObserver' in window) {
				try {
					const longTaskObserver = new PerformanceObserver((list) => {
						const entries = list.getEntries();
						entries.forEach((entry) => {
							if (entry.entryType === 'longtask') {
								this.addMetric({
									name: 'longtask',
									value: entry.duration,
									unit: 'ms',
									timestamp: entry.startTime,
									tags: { source: 'performance-observer' }
								});
							}
						});
					});
					longTaskObserver.observe({ entryTypes: ['longtask'] });
					this.observers.push(longTaskObserver);
				} catch (e) {
					// Long task observer not supported in all browsers
				}
			}

			this.observers.push(navObserver, resourceObserver);
		} catch (error) {
			console.warn('PerformanceObserver not fully supported', error);
		}
	}

	/**
	 * Collect page load metrics
	 */
	private collectPageLoadMetrics(): void {
		if (!('performance' in window)) return;

		try {
			const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
			if (navigation) {
				this.collectNavigationMetrics(navigation);
			}

			const paints = performance.getEntriesByType('paint');
			paints.forEach((paint) => {
				this.collectPaintMetrics(paint as PerformancePaintTiming);
			});
		} catch (error) {
			console.warn('Failed to collect page load metrics', error);
		}
	}

	/**
	 * Collect navigation timing metrics
	 */
	private collectNavigationMetrics(entry: PerformanceNavigationTiming): void {
		const metrics = [
			{ name: 'dom_content_loaded', value: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart },
			{ name: 'load_complete', value: entry.loadEventEnd - entry.loadEventStart },
			{ name: 'dom_interactive', value: entry.domInteractive - entry.fetchStart },
			{ name: 'first_byte', value: entry.responseStart - entry.requestStart },
			{ name: 'dns_lookup', value: entry.domainLookupEnd - entry.domainLookupStart },
			{ name: 'tcp_connection', value: entry.connectEnd - entry.connectStart },
			{ name: 'ssl_negotiation', value: entry.secureConnectionStart > 0 ? entry.connectEnd - entry.secureConnectionStart : 0 },
			{ name: 'server_response', value: entry.responseEnd - entry.responseStart },
			{ name: 'dom_processing', value: entry.domComplete - entry.domInteractive },
			{ name: 'total_page_load', value: entry.loadEventEnd - entry.fetchStart }
		];

		metrics.forEach(({ name, value }) => {
			if (value > 0) {
				this.addMetric({
					name: `navigation.${name}`,
					value: Math.round(value),
					unit: 'ms',
					timestamp: Date.now(),
					tags: { type: 'navigation' }
				});
			}
		});
	}

	/**
	 * Collect paint timing metrics
	 */
	private collectPaintMetrics(entry: PerformancePaintTiming): void {
		this.addMetric({
			name: `paint.${entry.name}`,
			value: Math.round(entry.startTime),
			unit: 'ms',
			timestamp: Date.now(),
			tags: { type: 'paint' }
		});
	}

	/**
	 * Collect resource timing metrics
	 */
	private collectResourceMetrics(entry: PerformanceResourceTiming): void {
		// Only track API calls and significant resources
		if (entry.name.includes('/recommend') || entry.name.includes('/books/')) {
			this.addMetric({
				name: 'api.request',
				value: Math.round(entry.responseEnd - entry.requestStart),
				unit: 'ms',
				timestamp: Date.now(),
				tags: {
					type: 'resource',
					url: entry.name,
					transfer_size: entry.transferSize.toString()
				}
			});
		}
	}

	/**
	 * Measure custom operation
	 */
	async measure<T>(name: string, fn: () => T | Promise<T>): Promise<T> {
		const start = performance.now();
		
		try {
			const result = await fn();
			const duration = performance.now() - start;
			this.addMetric({
				name: `custom.${name}`,
				value: Math.round(duration),
				unit: 'ms',
				timestamp: Date.now(),
				tags: { type: 'custom' }
			});
			return result;
		} catch (error) {
			const duration = performance.now() - start;
			this.addMetric({
				name: `custom.${name}`,
				value: Math.round(duration),
				unit: 'ms',
				timestamp: Date.now(),
				tags: { type: 'custom', error: 'true' }
			});
			throw error;
		}
	}

	/**
	 * Add a custom metric
	 */
	addMetric(metric: PerformanceMetric): void {
		if (!this.enabled) return;

		this.metrics.push({
			...metric,
			timestamp: metric.timestamp || Date.now()
		});

		// Keep only last 1000 metrics to prevent memory issues
		if (this.metrics.length > 1000) {
			this.metrics = this.metrics.slice(-1000);
		}
	}

	/**
	 * Get all metrics
	 */
	getMetrics(): PerformanceMetric[] {
		return [...this.metrics];
	}

	/**
	 * Get metrics by name
	 */
	getMetricsByName(name: string): PerformanceMetric[] {
		return this.metrics.filter(m => m.name === name);
	}

	/**
	 * Get a performance report
	 */
	getReport(): PerformanceReport {
		return {
			metrics: this.getMetrics(),
			timestamp: Date.now()
		};
	}

	/**
	 * Clear all metrics
	 */
	clear(): void {
		this.metrics = [];
	}

	/**
	 * Disable monitoring
	 */
	disable(): void {
		this.enabled = false;
		this.observers.forEach(observer => observer.disconnect());
		this.observers = [];
	}

	/**
	 * Enable monitoring
	 */
	enable(): void {
		this.enabled = true;
		if (typeof window !== 'undefined') {
			this.initObservers();
		}
	}

	/**
	 * Get Web Vitals metrics (Core Web Vitals)
	 */
	async getWebVitals(): Promise<Record<string, number>> {
		if (typeof window === 'undefined') {
			return {};
		}

		const vitals: Record<string, number> = {};

		// Largest Contentful Paint (LCP)
		try {
			const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
			if (lcpEntries.length > 0) {
				const lastEntry = lcpEntries[lcpEntries.length - 1] as any;
				vitals.lcp = Math.round(lastEntry.renderTime || lastEntry.loadTime);
			}
		} catch (e) {
			// LCP not supported
		}

		// First Input Delay (FID) - requires user interaction
		// Cumulative Layout Shift (CLS) - requires observer

		return vitals;
	}
}

// Export a singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Log performance metrics in development
if (typeof window !== 'undefined' && import.meta.env.DEV) {
	window.addEventListener('load', () => {
		setTimeout(() => {
			const report = performanceMonitor.getReport();
			if (report.metrics.length > 0) {
				console.group('📊 Performance Metrics');
				report.metrics.forEach(metric => {
					console.log(`${metric.name}: ${metric.value}${metric.unit}`, metric.tags || '');
				});
				console.groupEnd();
			}
		}, 3000);
	});
}
