<script lang="ts">
	import type { Book } from '../types';
	import LazyImage from './LazyImage.svelte';

	interface Props {
		book: Book;
		onSwipeLeft?: () => void;
		onSwipeRight?: () => void;
		onClick?: () => void;
	}

	let { book, onSwipeLeft, onSwipeRight, onClick }: Props = $props();
	
	// If book covers are added in the future, this will be used
	// For now, we'll keep the existing layout without images
	const bookCoverUrl = $derived(() => {
		// Future: Generate cover URL from Open Library
		// Example: `https://covers.openlibrary.org/b/olid/${book.ol_key}-M.jpg`
		// For now, return null
		return null;
	});
	
	let x = $state(0);
	let y = $state(0);
	let isDragging = $state(false);
	let startX = $state(0);
	let startY = $state(0);

	function handleStart(e: PointerEvent) {
		isDragging = true;
		startX = e.clientX;
		startY = e.clientY;
	}

	function handleMove(e: PointerEvent) {
		if (!isDragging) return;
		x = e.clientX - startX;
		y = e.clientY - startY;
	}

	function handleEnd() {
		if (!isDragging) return;
		isDragging = false;
		
		const threshold = 100;
		if (Math.abs(x) > threshold) {
			if (x > 0) {
				onSwipeRight?.();
			} else {
				onSwipeLeft?.();
			}
		}
		
		x = 0;
		y = 0;
	}

	$effect(() => {
		if (typeof window === 'undefined') return;
		
		const handlePointerMove = (e: PointerEvent) => handleMove(e);
		const handlePointerUp = () => handleEnd();
		
		if (isDragging) {
			window.addEventListener('pointermove', handlePointerMove);
			window.addEventListener('pointerup', handlePointerUp);
		}
		
		return () => {
			window.removeEventListener('pointermove', handlePointerMove);
			window.removeEventListener('pointerup', handlePointerUp);
		};
	});
</script>

<div
	class="card cursor-grab active:cursor-grabbing select-none focus:outline-2 focus:outline-offset-2 focus:outline-academia-gold"
	style="transform: translate({x}px, {y}px) rotate({x * 0.1}deg); opacity: {1 - Math.abs(x) / 300}"
	onpointerdown={handleStart}
	onclick={onClick}
	onkeydown={(e) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			onClick?.();
		}
	}}
	role="button"
	tabindex="0"
	aria-label="Book: {book.title} by {book.authors?.join(', ') || 'Unknown author'}. {book.first_publish_year ? `Published in ${book.first_publish_year}. ` : ''}{book.similarity !== undefined ? `Match: ${Math.round(book.similarity * 100)}%. ` : ''}Click to view details, or swipe left for not interested, swipe right for interested."
>
	<h2 class="text-2xl font-serif font-bold text-academia-gold mb-2">{book.title}</h2>
	
	{#if book.authors && book.authors.length > 0}
		<p class="text-academia-cream/80 mb-3">
			by {book.authors.join(', ')}
		</p>
	{/if}
	
	{#if book.first_publish_year}
		<p class="text-sm text-academia-accent mb-3">{book.first_publish_year}</p>
	{/if}
	
	{#if book.subjects && book.subjects.length > 0}
		<div class="flex flex-wrap gap-2 mb-4" role="list" aria-label="Subjects and genres">
			{#each book.subjects.slice(0, 5) as subject}
				<span class="px-2 py-1 bg-academia-lighter rounded text-xs text-academia-cream" role="listitem">
					{subject}
				</span>
			{/each}
		</div>
	{/if}
	
	{#if book.similarity !== undefined}
		<div class="mt-4 pt-4 border-t border-academia-lighter">
			<p class="text-sm text-academia-accent">
				Match: {Math.round(book.similarity * 100)}%
			</p>
		</div>
	{/if}
</div>
