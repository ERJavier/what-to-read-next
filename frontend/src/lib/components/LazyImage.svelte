<script lang="ts">
	import { onMount } from 'svelte';

	interface ImageSource {
		src: string;
		srcset?: string;
		media?: string;
		type?: string; // MIME type for <source> element
	}

	interface Props {
		src: string | ImageSource[];
		alt: string;
		placeholder?: string; // Placeholder image or data URL
		class?: string;
		width?: number | string;
		height?: number | string;
		loading?: 'lazy' | 'eager'; // Browser native lazy loading (fallback)
		sizes?: string; // For responsive images
		// WebP support: if true, automatically generate WebP version with fallback
		webp?: boolean;
	}

	let { 
		src, 
		alt, 
		placeholder,
		class: className = '',
		width,
		height,
		loading = 'lazy',
		sizes,
		webp = false
	}: Props = $props();

	let containerElement: HTMLDivElement | null = $state(null);
	let imgElement: HTMLImageElement | null = $state(null);
	let isLoaded = $state(false);
	let isInView = $state(false);
	let imageSrc = $state('');
	let imageSources = $state<ImageSource[]>([]);
	let hasError = $state(false);
	let supportsWebP = $state<boolean | null>(null);

	// Generate srcset for responsive images
	function generateSrcset(baseUrl: string, sizesAttr: string): string {
		// Extract width descriptors from sizes attribute
		// Simple implementation: create common responsive breakpoints
		const widths = [320, 640, 768, 1024, 1280, 1920];
		
		// If baseUrl contains Open Library covers, use their size parameters
		if (baseUrl.includes('covers.openlibrary.org')) {
			// Open Library uses size suffixes: S, M, L
			return [
				baseUrl.replace(/-[SML]\.jpg$/, '-S.jpg') + ' 160w',
				baseUrl.replace(/-[SML]\.jpg$/, '-M.jpg') + ' 480w',
				baseUrl.replace(/-[SML]\.jpg$/, '-L.jpg') + ' 768w'
			].join(', ');
		}
		
		// For other URLs, append width parameters (common pattern)
		// This is a simplified version - actual implementation may vary by CDN
		return widths
			.filter(w => w <= 1920) // Reasonable max
			.map(w => `${baseUrl}?w=${w} ${w}w`)
			.join(', ');
	}

	// Normalize src to ImageSource array format - computed reactively
	const normalizedSources = $derived.by(() => {
		if (Array.isArray(src)) {
			return src;
		}
		
		// Single string src - convert to array format
		const baseSrc = src as string;
		
		if (webp) {
			// Generate WebP version with fallback
			// Try to create WebP URL (assuming source supports it, or using image CDN)
			const webpSrc = baseSrc.replace(/\.(jpg|jpeg|png)$/i, '.webp');
			return [
				{
					src: webpSrc,
					type: 'image/webp',
					srcset: sizes ? generateSrcset(webpSrc, sizes) : undefined
				},
				{
					src: baseSrc,
					srcset: sizes ? generateSrcset(baseSrc, sizes) : undefined
				}
			];
		}
		
		return [{
			src: baseSrc,
			srcset: sizes ? generateSrcset(baseSrc, sizes) : undefined
		}];
	});

	// Check WebP support
	onMount(() => {
		if (typeof window === 'undefined') return;
		
		// Check WebP support
		const webpSupported = () => {
			const canvas = document.createElement('canvas');
			canvas.width = 1;
			canvas.height = 1;
			return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
		};
		
		supportsWebP = webpSupported();
	});

	// Update imageSources when normalizedSources changes, but only sync state when needed
	$effect(() => {
		const sources = normalizedSources;
		// Only update imageSources if it's actually different (avoid unnecessary updates)
		if (JSON.stringify(sources) !== JSON.stringify(imageSources)) {
			imageSources = sources;
		}
		
		// Set initial src for immediate rendering if not already set
		if (sources.length > 0 && !isLoaded && !imageSrc && !placeholder) {
			const fallbackSrc = sources[sources.length - 1].src;
			imageSrc = fallbackSrc;
		}
	});

	// Initialize with placeholder if provided - only once
	$effect(() => {
		if (placeholder && !isLoaded && !imageSrc) {
			imageSrc = placeholder;
		}
	});

	onMount(() => {
		if (typeof window === 'undefined' || !containerElement) return;

		// Use Intersection Observer for lazy loading (more control than native)
		// Optimized with better threshold and rootMargin
		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						isInView = true;
						// Start loading the image
						if (!isLoaded && imageSources.length > 0 && !hasError) {
							// Use the first source (WebP if available and supported, or fallback)
							const sourceToLoad = supportsWebP && imageSources.length > 1 
								? imageSources[0] 
								: imageSources[imageSources.length - 1];
							
							const img = new Image();
							
							// Set fetch priority for better loading performance
							if ('fetchPriority' in img) {
								(img as any).fetchPriority = isInView ? 'high' : 'low';
							}
							
							img.onload = () => {
								imageSrc = sourceToLoad.src;
								isLoaded = true;
								hasError = false;
							};
							img.onerror = () => {
								// If WebP fails, try fallback
								if (supportsWebP && imageSources.length > 1 && sourceToLoad === imageSources[0]) {
									const fallback = imageSources[imageSources.length - 1];
									const fallbackImg = new Image();
									fallbackImg.onload = () => {
										imageSrc = fallback.src;
										isLoaded = true;
										hasError = false;
									};
									fallbackImg.onerror = () => {
										hasError = true;
										isLoaded = false;
									};
									fallbackImg.src = fallback.src;
								} else {
									hasError = true;
									isLoaded = false;
								}
							};
							img.src = sourceToLoad.src;
						}
						// Once loaded, we can unobserve to save resources
						if (isLoaded || hasError) {
							observer.unobserve(containerElement!);
						}
					}
				});
			},
			{
				root: null,
				rootMargin: '100px', // Start loading 100px before image comes into view (increased for better perceived performance)
				threshold: [0, 0.01, 0.1] // Multiple thresholds for better granularity
			}
		);

		observer.observe(containerElement);

		return () => {
			observer.disconnect();
		};
	});

	// Style attributes
	const styleAttr = $derived(() => {
		const styles: Record<string, string> = {};
		if (width) styles.width = typeof width === 'number' ? `${width}px` : width;
		if (height) styles.height = typeof height === 'number' ? `${height}px` : height;
		return Object.entries(styles).map(([k, v]) => `${k}: ${v}`).join('; ');
	});
</script>

<div 
	bind:this={containerElement}
	class={className}
	style={styleAttr()}
>
	{#if hasError}
		<!-- Error state: show placeholder or error message -->
		<div 
			class="bg-academia-lighter flex items-center justify-center text-academia-cream/40 text-sm"
			style="min-height: {typeof height === 'number' ? height + 'px' : height || '200px'};"
		>
			{placeholder ? 'Image not available' : alt}
		</div>
	{:else if !isLoaded}
		<!-- Loading state: show placeholder -->
		<div 
			class="bg-academia-lighter flex items-center justify-center animate-pulse"
			style="min-height: {typeof height === 'number' ? height + 'px' : height || '200px'};"
		>
			{#if placeholder}
				<img 
					bind:this={imgElement}
					src={placeholder}
					alt={alt}
					class="opacity-50 w-full h-full object-cover"
					loading="eager"
				/>
			{:else}
				<span class="text-academia-cream/40 text-xs">Loading...</span>
			{/if}
		</div>
	{:else}
		<!-- Loaded image with responsive support -->
		{#if imageSources.length > 0}
			{@const fallbackSource = imageSources[imageSources.length - 1]}
			{#if imageSources.length > 1 && supportsWebP}
				<picture>
					<!-- WebP source -->
					{#each imageSources.slice(0, -1) as source}
						<source
							{...(source.srcset ? { srcset: source.srcset } : {})}
							{...(source.type ? { type: source.type } : {})}
							{...(source.media ? { media: source.media } : {})}
						/>
					{/each}
					<img 
						bind:this={imgElement}
						src={imageSrc || fallbackSource.src}
						{...(fallbackSource.srcset ? { srcset: fallbackSource.srcset } : {})}
						{...(sizes ? { sizes } : {})}
						alt={alt}
						{...(typeof width === 'number' ? { width } : {})}
						{...(typeof height === 'number' ? { height } : {})}
						class="w-full h-full object-cover"
						loading={isInView ? 'eager' : loading}
						decoding="async"
					/>
				</picture>
			{:else}
				<!-- Simple img without picture element -->
				<img 
					bind:this={imgElement}
					src={imageSrc || fallbackSource.src}
					{...(fallbackSource.srcset ? { srcset: fallbackSource.srcset } : {})}
					{...(sizes ? { sizes } : {})}
					alt={alt}
					{...(typeof width === 'number' ? { width } : {})}
					{...(typeof height === 'number' ? { height } : {})}
					class="w-full h-full object-cover"
					loading={isInView ? 'eager' : loading}
					decoding="async"
				/>
			{/if}
		{/if}
	{/if}
</div>
