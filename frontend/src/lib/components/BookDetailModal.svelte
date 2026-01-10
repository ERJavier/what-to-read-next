<script lang="ts">
	import { goto } from '$app/navigation';
	import type { Book, BookDetail } from '$lib/types';
	import { getBookDetail, getRecommendations } from '$lib/api';
	import Loading from './Loading.svelte';
	import ErrorBoundary from './ErrorBoundary.svelte';
	import ResultsGrid from './ResultsGrid.svelte';

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
			{#if error}
				<ErrorBoundary error={error} />
			{/if}

			{#if loading}
				<Loading message="Loading book details..." />
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
				<!-- Book Title -->
				<h1
					id="modal-title"
					class="text-3xl md:text-4xl font-serif font-bold text-academia-gold mb-4"
				>
					{book.title}
				</h1>

				<!-- Authors -->
				{#if book.authors && book.authors.length > 0}
					<div class="mb-6">
						<h2 class="text-lg font-semibold text-academia-cream/80 mb-2">Authors</h2>
						<p class="text-xl text-academia-cream">
							{book.authors.join(', ')}
						</p>
					</div>
				{/if}

				<!-- Publication Year -->
				{#if book.first_publish_year}
					<div class="mb-6">
						<h2 class="text-lg font-semibold text-academia-cream/80 mb-2">
							First Published
						</h2>
						<p class="text-lg text-academia-accent">{book.first_publish_year}</p>
					</div>
				{/if}

				<!-- All Subjects -->
				{#if book.subjects && book.subjects.length > 0}
					<div class="mb-6">
						<h2 class="text-lg font-semibold text-academia-cream/80 mb-3">
							Subjects & Genres
						</h2>
					<div class="flex flex-wrap gap-2" role="list" aria-label="Subjects and genres">
						{#each book.subjects as subject}
							<span
								class="px-3 py-1.5 bg-academia-lighter rounded-md text-sm text-academia-cream border border-academia-lighter hover:border-academia-accent transition-colors"
								role="listitem"
							>
								{subject}
							</span>
						{/each}
					</div>
						<p class="text-sm text-academia-cream/60 mt-2">
							{book.subjects.length} {book.subjects.length === 1 ? 'subject' : 'subjects'}
						</p>
					</div>
				{/if}

				<!-- Search Content -->
				{#if book.search_content}
					<div class="mb-6">
						<h2 class="text-lg font-semibold text-academia-cream/80 mb-2">
							Search Content
						</h2>
						<p
							class="text-academia-cream/90 leading-relaxed bg-academia-lighter p-4 rounded-md border border-academia-lighter"
						>
							{book.search_content}
						</p>
						<p class="text-sm text-academia-cream/60 mt-2">
							This content was used to generate the book's semantic embedding for similarity
							search.
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
						<Loading message="Finding similar books..." />
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
