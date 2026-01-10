<script lang="ts">
	import { onMount } from 'svelte';
	import type { Book } from '../types';
	import BookCard from './BookCard.svelte';
	import { preloadBookCovers } from '../imagePreloader';

	interface Props {
		books: Book[];
		onSwipeLeft?: (book: Book) => void;
		onSwipeRight?: (book: Book) => void;
		onBookClick?: (book: Book) => void;
	}

	let { books, onSwipeLeft, onSwipeRight, onBookClick }: Props = $props();
	
	let currentIndex = $state(0);
	let swipeDirection = $state<'left' | 'right' | null>(null);
	let showFeedback = $state(false);
	
	// Memoize visible books to avoid recreating array on every render
	const visibleBooks = $derived.by(() => {
		if (books.length === 0) return [];
		const endIndex = Math.min(currentIndex + 3, books.length);
		return books.slice(currentIndex, endIndex);
	});

	// Preload images for next books when index changes
	$effect(() => {
		if (typeof window !== 'undefined' && books.length > 0 && currentIndex < books.length) {
			// Preload next 3-5 books in the background
			preloadBookCovers(books, currentIndex + 1, 5).catch(err => {
				// Silently fail - preloading is a performance optimization, not critical
				if (import.meta.env.DEV) {
					console.debug('Failed to preload book covers', err);
				}
			});
		}
	});
	
	function handleSwipeLeft(book: Book) {
		swipeDirection = 'left';
		showFeedback = true;
		onSwipeLeft?.(book);
		
		setTimeout(() => {
			if (currentIndex < books.length - 1) {
				currentIndex++;
			}
			showFeedback = false;
			swipeDirection = null;
		}, 300);
	}
	
	function handleSwipeRight(book: Book) {
		swipeDirection = 'right';
		showFeedback = true;
		onSwipeRight?.(book);
		
		setTimeout(() => {
			if (currentIndex < books.length - 1) {
				currentIndex++;
			}
			showFeedback = false;
			swipeDirection = null;
		}, 300);
	}

	// Expose methods for keyboard shortcuts
	export function swipeLeft() {
		if (currentIndex < books.length && visibleBooks.length > 0) {
			const currentBook = visibleBooks[0];
			handleSwipeLeft(currentBook);
		}
	}

	export function swipeRight() {
		if (currentIndex < books.length && visibleBooks.length > 0) {
			const currentBook = visibleBooks[0];
			handleSwipeRight(currentBook);
		}
	}

	// Handle keyboard navigation for swipe stack
	function handleKeydown(e: KeyboardEvent, book: Book) {
		if (e.key === 'ArrowLeft' && !e.ctrlKey && !e.metaKey && !e.altKey) {
			e.preventDefault();
			handleSwipeLeft(book);
		} else if (e.key === 'ArrowRight' && !e.ctrlKey && !e.metaKey && !e.altKey) {
			e.preventDefault();
			handleSwipeRight(book);
		}
	}
</script>

<div 
	class="relative w-full max-w-md md:max-w-lg lg:max-w-xl mx-auto h-[500px] sm:h-[550px] md:h-[600px] lg:h-[650px] landscape:h-[450px] md:landscape:h-[500px]"
	role="region"
	aria-label="Swipeable book cards. Use arrow keys or swipe gestures to navigate."
>
	<!-- Visual Feedback Overlay -->
	{#if showFeedback && swipeDirection}
		<div 
			class="absolute inset-0 z-50 flex items-center justify-center pointer-events-none transition-opacity duration-300 {showFeedback ? 'opacity-100' : 'opacity-0'}"
			aria-hidden="true"
		>
			{#if swipeDirection === 'right'}
				<div class="bg-green-900/80 rounded-full p-8 border-4 border-green-500 shadow-2xl transform scale-110">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
					</svg>
					<p class="text-center text-green-300 font-bold mt-2 text-lg">Interested!</p>
				</div>
			{:else if swipeDirection === 'left'}
				<div class="bg-red-900/80 rounded-full p-8 border-4 border-red-500 shadow-2xl transform scale-110">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12" />
					</svg>
					<p class="text-center text-red-300 font-bold mt-2 text-lg">Not Interested</p>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Progress Indicator -->
	{#if books.length > 0}
		<div class="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-academia-dark/80 backdrop-blur-sm rounded-full px-4 py-2 border border-academia-lighter">
			<p class="text-xs text-academia-cream/80 font-medium">
				{currentIndex + 1} / {books.length}
			</p>
		</div>
	{/if}

	<!-- Swipe Hint -->
	{#if visibleBooks.length > 0 && currentIndex === 0 && !showFeedback}
		<div class="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 bg-academia-dark/80 backdrop-blur-sm rounded-full px-4 py-2 border border-academia-lighter flex items-center gap-3 text-xs text-academia-cream/70">
			<span class="flex items-center gap-1">
				<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
				</svg>
				Swipe left
			</span>
			<span class="text-academia-cream/40">•</span>
			<span class="flex items-center gap-1">
				Swipe right
				<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
				</svg>
			</span>
		</div>
	{/if}

	{#each visibleBooks as book, i (book.id)}
		{@const zIndex = visibleBooks.length - i}
		{@const scale = 1 - (i * 0.05)}
		{@const opacity = 1 - (i * 0.3)}
		
		<div
			class="absolute inset-0 transition-all duration-300 ease-out"
			style="z-index: {zIndex}; transform: scale({scale}); opacity: {opacity};"
			role={i === 0 ? 'application' : 'presentation'}
			aria-label={i === 0 ? `Book ${currentIndex + 1} of ${books.length}. ${book.title} by ${book.authors?.join(', ') || 'Unknown author'}. Swipe left for not interested, right for interested, or click for details.` : undefined}
		>
			<BookCard
				{book}
				onSwipeLeft={() => handleSwipeLeft(book)}
				onSwipeRight={() => handleSwipeRight(book)}
				onClick={() => onBookClick?.(book)}
			/>
		</div>
	{/each}
	
	{#if books.length === 0}
		<div class="text-center py-12" role="status" aria-live="polite">
			<p class="text-academia-cream/60 text-lg">No books to swipe. Start searching!</p>
		</div>
	{/if}
</div>
