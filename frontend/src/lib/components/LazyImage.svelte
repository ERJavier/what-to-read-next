<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		src: string;
		alt: string;
		placeholder?: string; // Placeholder image or data URL
		class?: string;
		width?: number | string;
		height?: number | string;
		loading?: 'lazy' | 'eager'; // Browser native lazy loading (fallback)
	}

	let { 
		src, 
		alt, 
		placeholder,
		class: className = '',
		width,
		height,
		loading = 'lazy'
	}: Props = $props();

	let containerElement: HTMLDivElement | null = $state(null);
	let imgElement: HTMLImageElement | null = $state(null);
	let isLoaded = $state(false);
	let isInView = $state(false);
	let imageSrc = $state('');
	let hasError = $state(false);

	// Initialize with placeholder if provided
	$effect(() => {
		const placeholderValue = placeholder; // Capture current value
		if (placeholderValue && !isLoaded && !imageSrc) {
			imageSrc = placeholderValue;
		}
	});

	onMount(() => {
		if (typeof window === 'undefined' || !containerElement) return;

		// Use Intersection Observer for lazy loading (more control than native)
		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						isInView = true;
						// Start loading the image
						if (!isLoaded && src && !hasError) {
							const img = new Image();
							img.onload = () => {
								imageSrc = src;
								isLoaded = true;
								hasError = false;
							};
							img.onerror = () => {
								hasError = true;
								isLoaded = false;
							};
							img.src = src;
						}
						observer.unobserve(containerElement!);
					}
				});
			},
			{
				root: null,
				rootMargin: '50px', // Start loading 50px before image comes into view
				threshold: 0.01
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
		<!-- Loaded image -->
		<img 
			bind:this={imgElement}
			src={imageSrc || src}
			alt={alt}
			class="w-full h-full object-cover"
			loading={isInView ? 'eager' : loading}
		/>
	{/if}
</div>
