<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import type { Book, SearchHistoryEntry, FilterPreferences } from '$lib/types';
	import { getRecommendations } from '$lib/api';
	import { saveBook } from '$lib/storage';
	import { getSearchHistory, addSearchToHistory } from '$lib/searchHistory';
	import { getFilterPreferences, saveFilterPreferences } from '$lib/filterPreferences';
	import { applyFiltersAndSort } from '$lib/filterUtils';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import SwipeStack from '$lib/components/SwipeStack.svelte';
	import ResultsGrid from '$lib/components/ResultsGrid.svelte';
	import Loading from '$lib/components/Loading.svelte';
	import ErrorBoundary from '$lib/components/ErrorBoundary.svelte';
	import FilterBar from '$lib/components/FilterBar.svelte';
	import KeyboardShortcutsModal from '$lib/components/KeyboardShortcutsModal.svelte';

	let searchQuery = $state('');
	let allBooks = $state<Book[]>([]); // Store all books before filtering
	let loading = $state(false);
	let loadingMore = $state(false);
	let error = $state<Error | null>(null);
	let viewMode = $state<'swipe' | 'grid'>('swipe');
	let searchHistory = $state<SearchHistoryEntry[]>([]);
	let paginationMode = $state<'load-more' | 'infinite-scroll'>('load-more');
	let currentLimit = $state(20);
	let hasMoreResults = $state(false);
	let showBackToTop = $state(false);
	let filterPreferences = $state<FilterPreferences>(getFilterPreferences());
	let showShortcutsModal = $state(false);
	let searchBarRef: any = $state(null);
	let swipeStackRef: any = $state(null);
	let scrollTimeout: ReturnType<typeof setTimeout> | null = null;
	const INITIAL_LIMIT = 20;
	const LOAD_MORE_INCREMENT = 20;
	const MAX_LIMIT = 100; // Match API's maximum limit (defined in RecommendationRequest model)

	// Apply filters and sorting to books
	let books = $derived(applyFiltersAndSort(allBooks, filterPreferences));

	function loadSearchHistory() {
		searchHistory = getSearchHistory();
	}

	onMount(() => {
		loadSearchHistory();
		// Load filter preferences
		filterPreferences = getFilterPreferences();
		
		// Listen for storage changes to update the list when history changes elsewhere
		const handleStorageChange = () => {
			loadSearchHistory();
		};
		window.addEventListener('storage', handleStorageChange);

		// Handle scroll for back to top button and infinite scroll (with throttling)
		const handleScroll = () => {
			showBackToTop = window.scrollY > 400;
			
			// Throttle scroll events to prevent rapid firing
			if (scrollTimeout) {
				clearTimeout(scrollTimeout);
			}
			
			scrollTimeout = setTimeout(() => {
				// Infinite scroll: load more when near bottom
				if (paginationMode === 'infinite-scroll' && !loadingMore && hasMoreResults && searchQuery) {
					const scrollPosition = window.innerHeight + window.scrollY;
					const documentHeight = document.documentElement.scrollHeight;
					const threshold = 200; // Load when 200px from bottom
					
					if (scrollPosition >= documentHeight - threshold) {
						loadMoreBooks();
					}
				}
			}, 100); // Throttle to max once per 100ms
		};
		
		window.addEventListener('scroll', handleScroll, { passive: true });
		
		// Handle keyboard shortcuts
		window.addEventListener('keydown', handleKeyboardShortcuts);
		
		return () => {
			window.removeEventListener('storage', handleStorageChange);
			window.removeEventListener('scroll', handleScroll);
			window.removeEventListener('keydown', handleKeyboardShortcuts);
			if (scrollTimeout) {
				clearTimeout(scrollTimeout);
			}
		};
	});

	async function handleSearch(query: string) {
		if (!query.trim()) return;
		
		loading = true;
		error = null;
		searchQuery = query;
		currentLimit = INITIAL_LIMIT;
		hasMoreResults = false; // Reset until we know otherwise
		
		try {
			const results = await getRecommendations({ query, limit: INITIAL_LIMIT });
			allBooks = results; // Store all books, filtering will be applied reactively
			
			// Check if there might be more results (if we got exactly the requested amount)
			hasMoreResults = results.length === INITIAL_LIMIT;
			
			// Add to search history
			addSearchToHistory(query);
			loadSearchHistory();
			
			// Reset scroll position
			showBackToTop = false;
		} catch (e) {
			const errorMessage = e instanceof Error ? e.message : 'Failed to search';
			error = new Error(errorMessage);
			allBooks = [];
			hasMoreResults = false;
		} finally {
			loading = false;
		}
	}

	async function loadMoreBooks() {
		if (loadingMore || !searchQuery || !hasMoreResults) return;
		
		// Prevent exceeding max limit to avoid validation errors
		// API allows max 100 books per request
		if (currentLimit >= MAX_LIMIT) {
			hasMoreResults = false;
			loadingMore = false;
			return;
		}
		
		loadingMore = true;
		error = null; // Clear any previous errors
		
		try {
			// Calculate new limit, ensuring we don't exceed API's max of 100
			const newLimit = Math.min(currentLimit + LOAD_MORE_INCREMENT, MAX_LIMIT);
			const newResults = await getRecommendations({ query: searchQuery, limit: newLimit });
			
			// Deduplicate by book ID (in case API returns duplicates)
			const existingIds = new Set(allBooks.map((b) => b.id));
			const additionalBooks = newResults.filter((b) => !existingIds.has(b.id));
			
			allBooks = [...allBooks, ...additionalBooks];
			currentLimit = newLimit;
			
			// Check if there might be more results
			// Stop if we've reached the max limit or got fewer results than requested
			hasMoreResults = newLimit < MAX_LIMIT && newResults.length >= newLimit && additionalBooks.length > 0;
			
			// If we've hit the max limit, don't try to load more
			if (newLimit >= MAX_LIMIT) {
				hasMoreResults = false;
			}
		} catch (err) {
			const errorMessage: string = err instanceof Error ? err.message : 'Failed to load more books';
			
			// Set the error
			error = new Error(errorMessage);
			
			// If it's a validation error or limit reached, stop trying to load more
			if (errorMessage.includes('Validation') || currentLimit >= MAX_LIMIT) {
				hasMoreResults = false;
			}
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

	function handleFilterPreferencesChange(newPreferences: FilterPreferences) {
		filterPreferences = newPreferences;
		saveFilterPreferences(newPreferences);
	}

	function handleKeyboardShortcuts(e: KeyboardEvent) {
		// Don't trigger shortcuts when typing in inputs, textareas, or contenteditable elements
		const target = e.target as HTMLElement;
		const isInput = target.tagName === 'INPUT' || 
		                target.tagName === 'TEXTAREA' || 
		                target.isContentEditable;
		
		if (isInput) return;

		// Handle '/' key to focus search bar
		if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
			e.preventDefault();
			searchBarRef?.focus();
			return;
		}

		// Handle '?' key to show shortcuts help (Shift + /)
		if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
			e.preventDefault();
			showShortcutsModal = true;
			return;
		}

		// Handle arrow keys for swiping (only in swipe mode with books available)
		if (viewMode === 'swipe' && books.length > 0) {
			if (e.key === 'ArrowLeft' && !e.ctrlKey && !e.metaKey && !e.altKey) {
				e.preventDefault();
				swipeStackRef?.swipeLeft();
				return;
			}
			
			if (e.key === 'ArrowRight' && !e.ctrlKey && !e.metaKey && !e.altKey) {
				e.preventDefault();
				swipeStackRef?.swipeRight();
				return;
			}
		}
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
		<SearchBar bind:this={searchBarRef} onSearch={handleSearch} />
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
		<button class="btn btn-secondary" onclick={() => goto('/taste-profile')}>
			Taste Profile
		</button>
		{#if allBooks.length > 0}
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

	{#if loading}
		<Loading message="Finding your perfect books..." />
	{:else if error}
		<div class="card bg-red-900/20 border-red-500 max-w-2xl mx-auto mb-6">
			<h2 class="text-xl font-bold text-red-400 mb-2">Error</h2>
			<p class="text-red-300">{error.message}</p>
		</div>
	{:else if allBooks.length > 0}
		<div class="max-w-7xl mx-auto">
			<FilterBar
				books={allBooks}
				preferences={filterPreferences}
				onPreferencesChange={handleFilterPreferencesChange}
			/>
			{#if books.length === 0}
				<div class="card text-center py-8">
					<p class="text-academia-cream/60 text-lg mb-2">
						No books match your current filters.
					</p>
					<p class="text-academia-cream/40 text-sm">
						Try adjusting your filter criteria.
					</p>
				</div>
			{:else}
				{#if viewMode === 'swipe'}
					<SwipeStack
						bind:this={swipeStackRef}
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
									{#if currentLimit >= MAX_LIMIT}
										You've reached the maximum number of results ({MAX_LIMIT} books). Try refining your search for more specific results.
									{:else}
										You've reached the end of the results
									{/if}
								</p>
							{/if}
						{/if}
					</div>
				{/if}
			{/if}
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

	<!-- Keyboard Shortcuts Modal -->
	<KeyboardShortcutsModal
		open={showShortcutsModal}
		onClose={() => showShortcutsModal = false}
	/>
</div>
