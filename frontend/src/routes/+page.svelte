<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import type { Book, SearchHistoryEntry } from '$lib/types';
	import { getRecommendations } from '$lib/api';
	import { saveBook } from '$lib/storage';
	import { getSearchHistory, addSearchToHistory } from '$lib/searchHistory';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import SwipeStack from '$lib/components/SwipeStack.svelte';
	import ResultsGrid from '$lib/components/ResultsGrid.svelte';
	import Loading from '$lib/components/Loading.svelte';
	import ErrorBoundary from '$lib/components/ErrorBoundary.svelte';
	import TasteProfile from '$lib/components/TasteProfile.svelte';

	let searchQuery = $state('');
	let books = $state<Book[]>([]);
	let loading = $state(false);
	let loadingMore = $state(false);
	let error = $state<Error | null>(null);
	let viewMode = $state<'swipe' | 'grid'>('swipe');
	let searchHistory = $state<SearchHistoryEntry[]>([]);
	let paginationMode = $state<'load-more' | 'infinite-scroll'>('load-more');
	let currentLimit = $state(20);
	let hasMoreResults = $state(false);
	let showBackToTop = $state(false);
	const INITIAL_LIMIT = 20;
	const LOAD_MORE_INCREMENT = 20;

	function loadSearchHistory() {
		searchHistory = getSearchHistory();
	}

	onMount(() => {
		loadSearchHistory();
		// Listen for storage changes to update the list when history changes elsewhere
		const handleStorageChange = () => {
			loadSearchHistory();
		};
		window.addEventListener('storage', handleStorageChange);

		// Handle scroll for back to top button and infinite scroll
		const handleScroll = () => {
			showBackToTop = window.scrollY > 400;
			
			// Infinite scroll: load more when near bottom
			if (paginationMode === 'infinite-scroll' && !loadingMore && hasMoreResults) {
				const scrollPosition = window.innerHeight + window.scrollY;
				const documentHeight = document.documentElement.scrollHeight;
				const threshold = 200; // Load when 200px from bottom
				
				if (scrollPosition >= documentHeight - threshold) {
					loadMoreBooks();
				}
			}
		};
		
		window.addEventListener('scroll', handleScroll);
		
		return () => {
			window.removeEventListener('storage', handleStorageChange);
			window.removeEventListener('scroll', handleScroll);
		};
	});

	async function handleSearch(query: string) {
		if (!query.trim()) return;
		
		loading = true;
		error = null;
		searchQuery = query;
		currentLimit = INITIAL_LIMIT;
		
		try {
			const results = await getRecommendations({ query, limit: INITIAL_LIMIT });
			books = results;
			
			// Check if there might be more results (if we got exactly the requested amount)
			hasMoreResults = results.length === INITIAL_LIMIT;
			
			// Add to search history
			addSearchToHistory(query);
			loadSearchHistory();
			
			// Reset scroll position
			showBackToTop = false;
		} catch (e) {
			error = e instanceof Error ? e : new Error('Failed to search');
			books = [];
			hasMoreResults = false;
		} finally {
			loading = false;
		}
	}

	async function loadMoreBooks() {
		if (loadingMore || !searchQuery || !hasMoreResults) return;
		
		loadingMore = true;
		try {
			const newLimit = currentLimit + LOAD_MORE_INCREMENT;
			const newResults = await getRecommendations({ query: searchQuery, limit: newLimit });
			
			// Deduplicate by book ID (in case API returns duplicates)
			const existingIds = new Set(books.map((b) => b.id));
			const additionalBooks = newResults.filter((b) => !existingIds.has(b.id));
			
			books = [...books, ...additionalBooks];
			currentLimit = newLimit;
			
			// Check if there might be more results
			hasMoreResults = newResults.length === newLimit && additionalBooks.length > 0;
		} catch (e) {
			error = e instanceof Error ? e : new Error('Failed to load more books');
		} finally {
			loadingMore = false;
		}
	}

	function scrollToTop() {
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	function handleSwipeLeft(book: Book) {
		console.log('Swiped left on:', book.title);
		saveBook(book, 'not_interested');
	}

	function handleSwipeRight(book: Book) {
		console.log('Swiped right on:', book.title);
		saveBook(book, 'interested');
	}

	function handleBookClick(book: Book) {
		// Navigate to book detail page
		goto(`/books/${book.id}`);
	}
</script>

<svelte:head>
	<title>WhatToRead - Discover Your Next Book</title>
</svelte:head>

<div class="min-h-screen p-4 md:p-8">
	<header class="text-center mb-8">
		<h1 class="text-4xl md:text-5xl font-serif font-bold text-academia-gold mb-4">
			WhatToRead
		</h1>
		<p class="text-academia-cream/80 text-lg mb-6">
			Discover your next favorite book through semantic search
		</p>
		<SearchBar onSearch={handleSearch} />
	</header>

	<div class="flex gap-4 mb-6 justify-center flex-wrap">
		<button
			class="btn {viewMode === 'swipe' ? 'btn-primary' : 'btn-secondary'}"
			onclick={() => viewMode = 'swipe'}
		>
			Swipe
		</button>
		<button
			class="btn {viewMode === 'grid' ? 'btn-primary' : 'btn-secondary'}"
			onclick={() => viewMode = 'grid'}
		>
			Grid
		</button>
		<button class="btn btn-secondary" onclick={() => goto('/saved')}>
			Saved Books
		</button>
		{#if books.length > 0}
			<button
				class="btn {paginationMode === 'load-more' ? 'btn-primary' : 'btn-secondary'}"
				onclick={() => paginationMode = 'load-more'}
				title="Click 'Load More' button to see additional results"
			>
				Mode: Load More
			</button>
			<button
				class="btn {paginationMode === 'infinite-scroll' ? 'btn-primary' : 'btn-secondary'}"
				onclick={() => paginationMode = 'infinite-scroll'}
				title="Automatically load more as you scroll down"
			>
				Mode: Auto Scroll
			</button>
		{/if}
	</div>

	{#if error}
		<ErrorBoundary error={error} />
	{/if}

	{#if loading}
		<Loading message="Finding your perfect books..." />
	{:else if error}
		<div class="card bg-red-900/20 border-red-500 max-w-2xl mx-auto">
			<h2 class="text-xl font-bold text-red-400 mb-2">Error</h2>
			<p class="text-red-300">{error.message}</p>
		</div>
	{:else if books.length > 0}
		<div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
			<div class="lg:col-span-1">
				<TasteProfile 
					history={searchHistory} 
					onHistoryChange={loadSearchHistory}
				/>
			</div>
			<div class="lg:col-span-3">
				{#if viewMode === 'swipe'}
					<SwipeStack
						{books}
						onSwipeLeft={handleSwipeLeft}
						onSwipeRight={handleSwipeRight}
						onBookClick={handleBookClick}
					/>
				{:else}
					<ResultsGrid {books} onBookClick={handleBookClick} />
				{/if}
				
				{#if viewMode === 'grid' && books.length > 0}
					<div class="mt-6 text-center">
						{#if paginationMode === 'load-more'}
							{#if hasMoreResults}
								<button
									class="btn btn-primary"
									onclick={loadMoreBooks}
									disabled={loadingMore}
								>
									{loadingMore ? 'Loading...' : 'Load More'}
								</button>
							{:else}
								<p class="text-academia-cream/60 text-sm">
									No more results to load
								</p>
							{/if}
						{:else if paginationMode === 'infinite-scroll'}
							{#if loadingMore}
								<div class="py-4">
									<Loading message="Loading more books..." />
								</div>
							{/if}
							{#if !hasMoreResults && books.length > INITIAL_LIMIT}
								<p class="text-academia-cream/60 text-sm py-4">
									You've reached the end of the results
								</p>
							{/if}
						{/if}
					</div>
				{/if}
			</div>
		</div>
	{:else if searchQuery}
		<div class="text-center py-12">
			<p class="text-academia-cream/60 text-lg">No books found. Try a different search.</p>
		</div>
	{:else}
		<div class="text-center py-12 max-w-2xl mx-auto">
			<p class="text-academia-cream/60 text-lg mb-4">
				Start by searching for books using natural language.
			</p>
			<p class="text-academia-cream/40 text-sm">
				Examples: "dark psychological thrillers", "philosophical science fiction", 
				"melancholic coming-of-age stories"
			</p>
		</div>
	{/if}

	<!-- Back to Top Button -->
	{#if showBackToTop}
		<button
			class="fixed bottom-8 right-8 btn btn-primary rounded-full w-12 h-12 p-0 shadow-lg z-50"
			onclick={scrollToTop}
			title="Back to top"
			aria-label="Back to top"
		>
			↑
		</button>
	{/if}
</div>
