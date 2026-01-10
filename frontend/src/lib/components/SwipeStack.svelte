<script lang="ts">
	import type { Book } from '../types';
	import BookCard from './BookCard.svelte';

	interface Props {
		books: Book[];
		onSwipeLeft?: (book: Book) => void;
		onSwipeRight?: (book: Book) => void;
		onBookClick?: (book: Book) => void;
	}

	let { books, onSwipeLeft, onSwipeRight, onBookClick }: Props = $props();
	
	let currentIndex = $state(0);
	const visibleBooks = $derived(books.slice(currentIndex, currentIndex + 3));
	
	function handleSwipeLeft(book: Book) {
		onSwipeLeft?.(book);
		if (currentIndex < books.length - 1) {
			currentIndex++;
		}
	}
	
	function handleSwipeRight(book: Book) {
		onSwipeRight?.(book);
		if (currentIndex < books.length - 1) {
			currentIndex++;
		}
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
	class="relative w-full max-w-md mx-auto h-[600px]"
	role="region"
	aria-label="Swipeable book cards. Use arrow keys or swipe gestures to navigate."
>
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
