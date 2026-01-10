<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import type { Book, BookDetail } from '$lib/types';
	import { getBookDetail, getRecommendations } from '$lib/api';
	import Loading from '$lib/components/Loading.svelte';
	import ErrorBoundary from '$lib/components/ErrorBoundary.svelte';
	import ResultsGrid from '$lib/components/ResultsGrid.svelte';

	let book = $state<BookDetail | null>(null);
	let relatedBooks = $state<Book[]>([]);
	let loading = $state(true);
	let loadingRelated = $state(false);
	let error = $state<Error | null>(null);
	let relatedBooksError = $state<Error | null>(null);

	$effect(() => {
		const bookId = Number($page.params.id);
		
		if (isNaN(bookId)) {
			error = new Error('Invalid book ID');
			loading = false;
			return;
		}

		loadBookDetail(bookId);
	});

	// Load related books when book is loaded
	$effect(() => {
		if (book && !loading) {
			loadRelatedBooks(book);
		}
	});

	async function loadBookDetail(bookId: number) {
		loading = true;
		error = null;

		try {
			const bookData = await getBookDetail(bookId);
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
			
			// Get more recommendations than needed to account for excluding current book
			const limit = 12;
			const recommendations = await getRecommendations({ query, limit });

			// Exclude the current book from results
			relatedBooks = recommendations.filter((book) => book.id !== currentBook.id).slice(0, 9);
		} catch (e) {
			relatedBooksError = e instanceof Error ? e : new Error('Failed to load related books');
			relatedBooks = [];
		} finally {
			loadingRelated = false;
		}
	}

	function handleBack() {
		goto('/');
	}

	function handleRelatedBookClick(book: Book) {
		goto(`/books/${book.id}`);
	}
</script>

<svelte:head>
	<title>{book?.title || 'Book Details'} - WhatToRead</title>
</svelte:head>

<!-- Skip to main content link -->
<a
	href="#main-content"
	class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-academia-gold focus:text-academia-dark focus:rounded focus:font-semibold"
>
	Skip to main content
</a>

<div class="min-h-screen p-4 md:p-8">
	<div class="max-w-4xl mx-auto">
		<!-- Back Button -->
		<nav aria-label="Navigation">
			<button
				onclick={handleBack}
				class="btn btn-secondary mb-6 flex items-center gap-2 focus:outline-2 focus:outline-offset-2 focus:outline-academia-gold"
				aria-label="Go back to search page"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-5 w-5"
					viewBox="0 0 20 20"
					fill="currentColor"
					aria-hidden="true"
				>
					<path
						fill-rule="evenodd"
						d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
						clip-rule="evenodd"
					/>
				</svg>
				Back to Search
			</button>
		</nav>

		<main id="main-content" role="main">
			{#if error}
				<ErrorBoundary error={error} />
			{/if}

			{#if loading}
				<div role="status" aria-live="polite" aria-atomic="true">
					<Loading message="Loading book details..." />
				</div>
			{:else if error}
				<div class="card bg-red-900/20 border-red-500" role="alert" aria-live="assertive">
					<h2 class="text-xl font-bold text-red-400 mb-2">Error</h2>
					<p class="text-red-300 mb-4">{error.message}</p>
					<button 
						onclick={handleBack} 
						class="btn btn-secondary focus:outline-2 focus:outline-offset-2 focus:outline-academia-gold"
						aria-label="Go back to search page"
					>
						Go Back
					</button>
				</div>
			{:else if book}
				<article class="card">
				<!-- Book Title -->
				<h1 class="text-4xl md:text-5xl font-serif font-bold text-academia-gold mb-4">
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
						<p class="text-academia-cream/90 leading-relaxed bg-academia-lighter p-4 rounded-md border border-academia-lighter">
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
							class="btn btn-primary inline-flex items-center gap-2"
						>
							View on Open Library
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-4 w-4"
								viewBox="0 0 20 20"
								fill="currentColor"
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

				</article>

				<!-- Related/Recommended Books Section -->
				{#if book && !loading}
					<section class="mt-8 pt-6 border-t border-academia-lighter" aria-labelledby="related-books-heading">
						<h2 id="related-books-heading" class="text-2xl font-semibold text-academia-cream/80 mb-6">
							Related Books
						</h2>

						{#if loadingRelated}
							<div role="status" aria-live="polite" aria-atomic="true">
								<Loading message="Finding similar books..." />
							</div>
						{:else if relatedBooksError}
							<div class="card bg-yellow-900/20 border-yellow-500" role="alert" aria-live="assertive">
								<p class="text-yellow-300">
									Unable to load related books. {relatedBooksError.message}
								</p>
							</div>
						{:else if relatedBooks.length > 0}
							<ResultsGrid books={relatedBooks} onBookClick={handleRelatedBookClick} />
						{:else}
							<div class="text-center py-8" role="status" aria-live="polite">
								<p class="text-academia-cream/60">
									No related books found at this time.
								</p>
							</div>
						{/if}
					</section>
				{/if}
			{/if}
		</main>
	</div>
</div>
