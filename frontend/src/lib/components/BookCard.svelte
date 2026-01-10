<script lang="ts">
	import type { Book } from '../types';
	import LazyImage from './LazyImage.svelte';
	import { getOpenLibraryCoverUrl, getOpenLibraryCoverSrcset, getBookCoverPlaceholder } from '../imageUtils';

	interface Props {
		book: Book;
		onSwipeLeft?: () => void;
		onSwipeRight?: () => void;
		onClick?: () => void;
		showCover?: boolean; // Enable/disable book covers
	}

	let { book, onSwipeLeft, onSwipeRight, onClick, showCover = true }: Props = $props();
	
	// Generate optimized book cover URLs with responsive srcset
	const bookCoverImageSource = $derived.by(() => {
		if (!showCover || !book.ol_key) return null;
		
		// Return ImageSource format with srcset for responsive loading
		return {
			src: getOpenLibraryCoverUrl(book.ol_key, 'M'), // Default medium size
			srcset: getOpenLibraryCoverSrcset(book.ol_key)
		};
	});
	
	const bookCoverPlaceholder = $derived.by(() => {
		if (!showCover) return undefined;
		return getBookCoverPlaceholder(book.title);
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
	{#if showCover && bookCoverImageSource}
		<div class="mb-4 w-full aspect-[2/3] overflow-hidden rounded-md bg-academia-lighter">
			<LazyImage
				src={[bookCoverImageSource]}
				alt={`Cover for ${book.title}`}
				placeholder={bookCoverPlaceholder || undefined}
				sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
				width="100%"
				height="100%"
				class="w-full h-full"
				loading="lazy"
			/>
		</div>
	{/if}
	
	<h2 class="text-xl sm:text-2xl font-serif font-bold text-academia-gold mb-2 sm:mb-3 leading-tight line-clamp-2">
		{book.title}
	</h2>
	
	{#if book.authors && book.authors.length > 0}
		<div class="mb-3">
			<p class="text-sm font-medium text-academia-cream/60 mb-1">Authors</p>
			<p class="text-academia-cream/90 leading-relaxed">
				{book.authors.length > 2 
					? `${book.authors.slice(0, 2).join(', ')} and ${book.authors.length - 2} more`
					: book.authors.join(', ')}
			</p>
		</div>
	{/if}
	
	{#if book.first_publish_year}
		<div class="flex items-center gap-2 mb-3">
			<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-academia-cream/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
			</svg>
			<p class="text-sm text-academia-accent font-medium">{book.first_publish_year}</p>
		</div>
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
	
	{#if book.search_content && book.search_content !== book.title}
		<div class="mt-3 pt-3 border-t border-academia-lighter/50">
			<p class="text-sm text-academia-cream/70 line-clamp-2 leading-relaxed">
				{book.search_content.length > 150 
					? `${book.search_content.substring(0, 150).trim()}...` 
					: book.search_content}
			</p>
		</div>
	{/if}

	{#if book.subjects && book.subjects.length > 5}
		<div class="mt-2 text-xs text-academia-cream/50">
			+{book.subjects.length - 5} more {book.subjects.length - 5 === 1 ? 'subject' : 'subjects'}
		</div>
	{/if}

	{#if book.similarity !== undefined}
		<div class="mt-4 pt-4 border-t border-academia-lighter">
			<div class="flex items-center justify-between">
				<span class="text-sm font-medium text-academia-cream/80">Match Score</span>
				<div class="flex items-center gap-2">
					<div class="w-16 h-2 bg-academia-dark rounded-full overflow-hidden">
						<div 
							class="h-full bg-gradient-to-r from-academia-accent to-academia-gold transition-all duration-300"
							style="width: {Math.round(book.similarity * 100)}%"
						></div>
					</div>
					<span class="text-sm font-semibold text-academia-accent min-w-[3rem] text-right">
						{Math.round(book.similarity * 100)}%
					</span>
				</div>
			</div>
		</div>
	{/if}
</div>
