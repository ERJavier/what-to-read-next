<script lang="ts">
	import { goto } from '$app/navigation';
	import type { Book, BookDetail } from '$lib/types';
	import { getBookDetail, getRecommendations } from '$lib/api';
	import Loading from './Loading.svelte';
	import ErrorBoundary from './ErrorBoundary.svelte';
	import ResultsGrid from './ResultsGrid.svelte';
	import Skeleton from './Skeleton.svelte';

	interface Props {
		bookId: number;
		onClose: () => void;
	}

	let { bookId, onClose }: Props = $props();

	let book = $state<BookDetail | null>(null);
	let relatedBooks = $state<Book[]>([]);
	let loading = $state(true);
	let loadingRelated = $state(false);
	let error = $state<Error | null>(null);
	let relatedBooksError = $state<Error | null>(null);
	let modalContentRef: HTMLDivElement | null = $state(null);
	let lastFocusedElement: HTMLElement | null = null;

	// Focus trap and management
	function trapFocus(e: KeyboardEvent) {
		if (e.key !== 'Tab' || !modalContentRef) return;

		const focusableElements = modalContentRef.querySelectorAll<HTMLElement>(
			'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
		);
		const firstElement = focusableElements[0];
		const lastElement = focusableElements[focusableElements.length - 1];

		if (e.shiftKey) {
			if (document.activeElement === firstElement) {
				e.preventDefault();
				lastElement?.focus();
			}
		} else {
			if (document.activeElement === lastElement) {
				e.preventDefault();
				firstElement?.focus();
			}
		}
	}

	$effect(() => {
		if (typeof window === 'undefined') return;

		// Store the element that opened the modal
		lastFocusedElement = document.activeElement as HTMLElement;

		window.addEventListener('keydown', handleEscape);
		// Prevent body scroll when modal is open
		document.body.style.overflow = 'hidden';

		// Focus the modal content when it opens
		setTimeout(() => {
			modalContentRef?.focus();
		}, 100);

		return () => {
			window.removeEventListener('keydown', handleEscape);
			document.body.style.overflow = '';
			// Return focus to the element that opened the modal
			lastFocusedElement?.focus();
		};
	});

	async function loadBookDetail(id: number) {
		loading = true;
		error = null;

		try {
			const bookData = await getBookDetail(id);
			book = bookData;
		} catch (e) {
			error = e instanceof Error ? e : new Error('Failed to load book details');
			book = null;
		} finally {
			loading = false;
		}
	}

	async function loadRelatedBooks(currentBook: BookDetail) {
		loadingRelated = true;
		relatedBooksError = null;
		relatedBooks = [];

		try {
			// Use search_content if available, otherwise use title as query
			const query = currentBook.search_content || currentBook.title;
			
			// Get fewer recommendations for modal (space is limited)
			const limit = 9;
			const recommendations = await getRecommendations({ query, limit });

			// Exclude the current book from results
			relatedBooks = recommendations.filter((book) => book.id !== currentBook.id).slice(0, 6);
		} catch (e) {
			relatedBooksError = e instanceof Error ? e : new Error('Failed to load related books');
			relatedBooks = [];
		} finally {
			loadingRelated = false;
		}
	}

	$effect(() => {
		loadBookDetail(bookId);
	});

	// Load related books when book is loaded
	$effect(() => {
		if (book && !loading) {
			loadRelatedBooks(book);
		}
	});

	function handleRelatedBookClick(book: Book) {
		onClose(); // Close current modal
		goto(`/books/${book.id}`); // Navigate to new book detail page
	}

	function handleEscape(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose();
		}
	}

	function handleBackdropClick(e: MouseEvent) {
		// Close if clicking on the backdrop (not the modal content)
		if (e.target === e.currentTarget) {
			onClose();
		}
	}

	function handleBackdropKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose();
		} else if (e.key === 'Tab') {
			trapFocus(e);
		}
	}
</script>

<!-- Modal Backdrop -->
<div
	class="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 overflow-y-auto"
	onclick={handleBackdropClick}
	onkeydown={handleBackdropKeydown}
	role="dialog"
	aria-modal="true"
	aria-labelledby="modal-title"
	tabindex="0"
>
	<!-- Modal Content -->
	<div
		bind:this={modalContentRef}
		class="bg-academia-light rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-academia-lighter focus:outline-none"
		onclick={(e) => e.stopPropagation()}
		onkeydown={(e) => {
			e.stopPropagation();
			if (e.key === 'Tab') {
				trapFocus(e);
			}
		}}
		role="document"
		tabindex="-1"
		aria-labelledby="modal-title"
		aria-describedby="modal-description"
	>
		<!-- Close Button -->
		<div class="sticky top-0 bg-academia-light z-10 flex justify-end p-4 border-b border-academia-lighter">
			<button
				onclick={onClose}
				class="text-academia-cream/60 hover:text-academia-cream transition-colors focus:outline-2 focus:outline-offset-2 focus:outline-academia-gold rounded"
				aria-label="Close book detail modal"
			>
				<span class="sr-only">Close</span>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-6 w-6"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					aria-hidden="true"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M6 18L18 6M6 6l12 12"
					/>
				</svg>
			</button>
		</div>

		<!-- Modal Body -->
		<div class="p-6 md:p-8">
			{#if loading}
				<div class="space-y-6">
					<Skeleton variant="text" height="3rem" width="80%" class="mb-4" />
					<Skeleton variant="text" height="1.5rem" width="60%" lines={2} class="mb-6" />
					<Skeleton variant="card" height="200px" class="mb-6" />
					<Skeleton variant="rectangular" height="100px" />
				</div>
			{:else if error}
				<ErrorBoundary error={error} showSuggestions={true} />
				<div class="mt-4 flex gap-3">
					<button onclick={onClose} class="btn btn-secondary">
						Close
					</button>
					<button
						onclick={() => {
							error = null;
							if (bookId) {
								loadBookDetail(bookId);
							}
						}}
						class="btn btn-primary"
					>
						Retry
					</button>
				</div>
			{:else if book}
				<div id="modal-description" class="sr-only">
					Book details for {book.title}
				</div>
				
				<!-- Header Section with Title and Metadata -->
				<div class="mb-8 pb-6 border-b border-academia-lighter">
					<h1
						id="modal-title"
						class="text-3xl md:text-4xl font-serif font-bold text-academia-gold mb-4 leading-tight"
					>
						{book.title}
					</h1>

					<!-- Metadata Row -->
					<div class="flex flex-wrap gap-4 items-center text-sm text-academia-cream/70">
						{#if book.first_publish_year}
							<div class="flex items-center gap-2">
								<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-academia-cream/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
								</svg>
								<span class="font-medium">{book.first_publish_year}</span>
							</div>
						{/if}
						
						{#if book.authors && book.authors.length > 0}
							<div class="flex items-center gap-2">
								<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-academia-cream/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
								</svg>
								<span>{book.authors.length} {book.authors.length === 1 ? 'Author' : 'Authors'}</span>
							</div>
						{/if}
						
						{#if book.subjects && book.subjects.length > 0}
							<div class="flex items-center gap-2">
								<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-academia-cream/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
								</svg>
								<span>{book.subjects.length} {book.subjects.length === 1 ? 'Subject' : 'Subjects'}</span>
							</div>
						{/if}
					</div>
				</div>

				<!-- Authors Section -->
				{#if book.authors && book.authors.length > 0}
					<div class="mb-8">
						<h2 class="text-xl font-semibold text-academia-cream mb-3 flex items-center gap-2">
							<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-academia-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
							</svg>
							Authors
						</h2>
						<div class="bg-academia-lighter/30 rounded-lg p-4 border border-academia-lighter">
							<p class="text-lg text-academia-cream leading-relaxed">
								{book.authors.join(', ')}
							</p>
						</div>
					</div>
				{/if}

				<!-- All Subjects -->
				{#if book.subjects && book.subjects.length > 0}
					<div class="mb-8">
						<h2 class="text-xl font-semibold text-academia-cream mb-3 flex items-center gap-2">
							<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-academia-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
							</svg>
							Subjects & Genres
						</h2>
						<div class="bg-academia-lighter/30 rounded-lg p-4 border border-academia-lighter">
							<div class="flex flex-wrap gap-2" role="list" aria-label="Subjects and genres">
								{#each book.subjects as subject}
									<span
										class="px-3 py-1.5 bg-academia-dark/50 rounded-md text-sm font-medium text-academia-cream border border-academia-lighter hover:border-academia-gold hover:bg-academia-lighter/50 transition-all cursor-default"
										role="listitem"
										title={subject}
									>
										{subject}
									</span>
								{/each}
							</div>
						</div>
					</div>
				{/if}

				<!-- Search Content / Description -->
				{#if book.search_content && book.search_content !== book.title}
					<div class="mb-8">
						<h2 class="text-xl font-semibold text-academia-cream mb-3 flex items-center gap-2">
							<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-academia-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
							</svg>
							Description
						</h2>
						<div class="bg-academia-lighter/30 rounded-lg p-5 border border-academia-lighter">
							<p class="text-academia-cream/90 leading-relaxed text-base whitespace-pre-wrap">
								{book.search_content}
							</p>
						</div>
						<p class="text-xs text-academia-cream/50 mt-3 italic">
							This content was used to generate the book's semantic embedding for similarity search.
						</p>
					</div>
				{/if}

				<!-- Open Library Link -->
				{#if book.ol_key}
					<div class="mt-8 pt-6 border-t border-academia-lighter">
					<a
						href="https://openlibrary.org{book.ol_key}"
						target="_blank"
						rel="noopener noreferrer"
						class="btn btn-primary inline-flex items-center gap-2 focus:outline-2 focus:outline-offset-2 focus:outline-academia-gold"
						aria-label="View {book.title} on Open Library (opens in new tab)"
					>
						View on Open Library
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-4 w-4"
							viewBox="0 0 20 20"
							fill="currentColor"
							aria-hidden="true"
						>
							<path
								d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"
							/>
							<path
								d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z"
							/>
						</svg>
					</a>
					</div>
				{/if}

				<!-- Related/Recommended Books Section -->
				<section class="mt-8 pt-6 border-t border-academia-lighter" aria-labelledby="related-books-heading">
					<h2 id="related-books-heading" class="text-xl font-semibold text-academia-cream/80 mb-4">
						Related Books
					</h2>

					{#if loadingRelated}
						<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
							{#each Array(6) as _}
								<Skeleton variant="card" height="300px" />
							{/each}
						</div>
					{:else if relatedBooksError}
						<div class="card bg-yellow-900/20 border-yellow-500 p-4">
							<p class="text-yellow-300 text-sm">
								Unable to load related books. {relatedBooksError.message}
							</p>
						</div>
					{:else if relatedBooks.length > 0}
						<ResultsGrid books={relatedBooks} onBookClick={handleRelatedBookClick} />
					{:else}
						<div class="text-center py-4">
							<p class="text-academia-cream/60 text-sm">
							No related books found at this time.
						</p>
					</div>
				{/if}
			</section>
			{/if}
		</div>
	</div>
</div>

<style>
	/* Smooth scroll for modal content */
	:global([role='dialog'] > div) {
		scrollbar-width: thin;
		scrollbar-color: rgba(218, 215, 202, 0.3) transparent;
	}

	:global([role='dialog'] > div::-webkit-scrollbar) {
		width: 8px;
	}

	:global([role='dialog'] > div::-webkit-scrollbar-track) {
		background: transparent;
	}

	:global([role='dialog'] > div::-webkit-scrollbar-thumb) {
		background-color: rgba(218, 215, 202, 0.3);
		border-radius: 4px;
	}

	:global([role='dialog'] > div::-webkit-scrollbar-thumb:hover) {
		background-color: rgba(218, 215, 202, 0.5);
	}
</style>
