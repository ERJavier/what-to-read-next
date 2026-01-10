<script lang="ts">
	import { onMount } from 'svelte';
	import type { Book } from '../types';
	import BookCard from './BookCard.svelte';

	interface Props {
		books: Book[];
		onBookClick?: (book: Book) => void;
		enableVirtualization?: boolean; // Enable virtual scrolling for large lists
		virtualizationThreshold?: number; // Number of items before virtualization kicks in
	}

	let { 
		books, 
		onBookClick, 
		enableVirtualization = true,
		virtualizationThreshold = 50 // Enable virtualization for 50+ items
	}: Props = $props();

	let containerElement: HTMLDivElement | null = $state(null);
	let visibleIndices = $state<Set<number>>(new Set());

	// Determine if virtualization should be used
	const shouldVirtualize = $derived(
		enableVirtualization && books.length >= virtualizationThreshold
	);

	onMount(() => {
		if (!shouldVirtualize || typeof window === 'undefined' || !containerElement) return;

		// Set initial visible indices (first batch + buffer)
		const initialVisible = new Set<number>();
		const itemsToShow = Math.min(30, books.length); // Show first 30 initially
		for (let i = 0; i < itemsToShow; i++) {
			initialVisible.add(i);
		}
		visibleIndices = initialVisible;

		// Use Intersection Observer to track visible items
		const observer = new IntersectionObserver(
			(entries) => {
				const newVisible = new Set(visibleIndices);
				// Get current books length to handle reactive updates
				const currentBooksLength = books.length;
				
				entries.forEach((entry) => {
					const index = parseInt(entry.target.getAttribute('data-index') || '0', 10);
					if (entry.isIntersecting) {
						// Mark this item and nearby items as visible (buffer)
						for (let i = Math.max(0, index - 4); i <= Math.min(currentBooksLength - 1, index + 4); i++) {
							newVisible.add(i);
						}
					}
				});
				
				visibleIndices = newVisible;
			},
			{
				root: null,
				rootMargin: '300px', // Load items 300px before they come into view
				threshold: 0
			}
		);

		// Helper function to observe all placeholders
		const observeAllPlaceholders = () => {
			if (containerElement) {
				// Disconnect and reconnect to avoid duplicate observations
				observer.disconnect();
				const placeholders = containerElement.querySelectorAll('[data-index]');
				placeholders.forEach((placeholder) => {
					observer.observe(placeholder);
				});
			}
		};

		// Observe placeholder elements
		if (containerElement) {
			// Use a mutation observer to observe new items as they're added
			const mutationObserver = new MutationObserver(() => {
				observeAllPlaceholders();
			});

			mutationObserver.observe(containerElement, {
				childList: true,
				subtree: false
			});

			// Initial observation
			setTimeout(() => {
				observeAllPlaceholders();
			}, 0);

			return () => {
				observer.disconnect();
				mutationObserver.disconnect();
			};
		}
	});

	// Update visible indices when books change
	$effect(() => {
		if (shouldVirtualize && books.length > 0 && typeof window !== 'undefined') {
			// Reset visible indices when books change
			const initialVisible = new Set<number>();
			const itemsToShow = Math.min(30, books.length);
			for (let i = 0; i < itemsToShow; i++) {
				initialVisible.add(i);
			}
			visibleIndices = initialVisible;
		}
	});
</script>

<div 
	bind:this={containerElement}
	class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
>
	{#each books as book, index (book.id)}
		{@const shouldRender = !shouldVirtualize || visibleIndices.has(index)}
		
		{#if shouldRender}
			<div data-index={index}>
				<BookCard
					{book}
					onClick={() => onBookClick?.(book)}
				/>
			</div>
		{:else}
			<!-- Placeholder to maintain grid layout and enable intersection observer -->
			<div 
				data-index={index}
				class="invisible pointer-events-none"
				style="min-height: 250px;"
				aria-hidden="true"
			></div>
		{/if}
	{/each}
</div>

{#if books.length === 0}
	<div class="text-center py-12">
		<p class="text-academia-cream/60 text-lg">No books found. Try a different search.</p>
	</div>
{/if}
