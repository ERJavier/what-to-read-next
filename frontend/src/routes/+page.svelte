<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import type { Book, SearchHistoryEntry, FilterPreferences } from '$lib/types';
	import type { Component } from 'svelte';
	import { getRecommendations } from '$lib/api';
	import { saveBook } from '$lib/storage';
	import { getSearchHistory, addSearchToHistory } from '$lib/searchHistory';
	import { getFilterPreferences, saveFilterPreferences } from '$lib/filterPreferences';
	import { applyFiltersAndSort } from '$lib/filterUtils';
	import { getRecentlyViewedBooks, removeFromRecentlyViewed, clearRecentlyViewed } from '$lib/recentlyViewed';
	import { prefetchBookDetails } from '$lib/prefetch';
	import { performanceMonitor } from '$lib/performance';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import Loading from '$lib/components/Loading.svelte';
	import ErrorBoundary from '$lib/components/ErrorBoundary.svelte';
	import TasteProfile from '$lib/components/TasteProfile.svelte';
	import FilterBar from '$lib/components/FilterBar.svelte';
	import BookCard from '$lib/components/BookCard.svelte';
	import Tooltip from '$lib/components/Tooltip.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	
	// Lazy load heavy components based on view mode
	let SwipeStackComponent: Component<any> | null = $state(null);
	let ResultsGridComponent: Component<any> | null = $state(null);
	let KeyboardShortcutsModalComponent: Component<any> | null = $state(null);

	let searchQuery = $state('');
	let allBooks = $state<Book[]>([]); // Store all books before filtering
	let loading = $state(false);
	let loadingMore = $state(false);
	let error = $state<Error | null>(null);
	let viewMode = $state<'swipe' | 'grid'>('swipe');
	let searchHistory = $state<SearchHistoryEntry[]>([]);
	const INITIAL_LIMIT = 20;
	const LOAD_MORE_INCREMENT = 20;
	const MAX_LIMIT = 100; // Match API's maximum limit (defined in RecommendationRequest model)

	let recentlyViewed = $state(getRecentlyViewedBooks());
	let paginationMode = $state<'load-more' | 'infinite-scroll' | 'pages'>('load-more');
	let showRecentlyViewed = $state(false);
	let currentLimit = $state(20);
	let hasMoreResults = $state(false);
	let showBackToTop = $state(false);
	let filterPreferences = $state<FilterPreferences>(getFilterPreferences());
	let showShortcutsModal = $state(false);
	let searchBarRef: any = $state(null);
	let swipeStackRef: any = $state(null);
	let scrollTimeout: ReturnType<typeof setTimeout> | null = null;
	let showMobileNav = $state(false);

	// Apply filters and sorting to books with memoization
	// Use derived state to avoid unnecessary recalculations
	let books = $derived(applyFiltersAndSort(allBooks, filterPreferences));
	let currentPage = $derived(Math.ceil(currentLimit / INITIAL_LIMIT));
	let totalPages = $derived(Math.ceil(MAX_LIMIT / INITIAL_LIMIT));
	
	// Memoize page numbers calculation to avoid recreating array on every render
	let pageNumbers = $derived.by(() => {
		const total = Math.ceil(MAX_LIMIT / INITIAL_LIMIT);
		const maxVisible = 10;
		const current = Math.ceil(currentLimit / INITIAL_LIMIT);
		
		// Only recalculate if current page or total pages changed
		if (total <= maxVisible) {
			return Array.from({ length: total }, (_, i) => i + 1);
		}
		
		// Calculate visible page range
		const start = Math.max(1, current - Math.floor(maxVisible / 2));
		const end = Math.min(total, start + maxVisible - 1);
		const actualStart = Math.max(1, end - maxVisible + 1);
		
		return Array.from({ length: end - actualStart + 1 }, (_, i) => actualStart + i);
	});

	function loadSearchHistory() {
		searchHistory = getSearchHistory();
	}

	function loadRecentlyViewed() {
		recentlyViewed = getRecentlyViewedBooks();
	}

	function handleRemoveFromRecentlyViewed(bookId: number) {
		removeFromRecentlyViewed(bookId);
		loadRecentlyViewed();
	}

	function handleClearRecentlyViewed() {
		if (confirm('Are you sure you want to clear your recently viewed books?')) {
			clearRecentlyViewed();
			loadRecentlyViewed();
		}
	}

	onMount(() => {
		loadSearchHistory();
		loadRecentlyViewed();
		// Load filter preferences
		filterPreferences = getFilterPreferences();
		
		// Preload components that are likely to be used
		// Load SwipeStack (default view mode)
		import('$lib/components/SwipeStack.svelte').then(module => {
			SwipeStackComponent = module.default;
		}).catch(err => console.error('Failed to load SwipeStack:', err));
		
		// Preload KeyboardShortcutsModal (small component, load early)
		import('$lib/components/KeyboardShortcutsModal.svelte').then(module => {
			KeyboardShortcutsModalComponent = module.default;
		}).catch(err => console.error('Failed to load KeyboardShortcutsModal:', err));
		
		// Prefetch common navigation routes in the background
		import('$lib/prefetch').then(({ setupIntelligentPrefetching }) => {
			setupIntelligentPrefetching();
		}).catch(() => {
			// Silently fail - prefetching is an optimization
		});
		
		// Listen for storage changes to update the list when history changes elsewhere
		const handleStorageChange = () => {
			loadSearchHistory();
			loadRecentlyViewed();
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
	
	// Load ResultsGrid when switching to grid view
	$effect(() => {
		if (viewMode === 'grid' && !ResultsGridComponent && allBooks.length > 0) {
			import('$lib/components/ResultsGrid.svelte').then(module => {
				ResultsGridComponent = module.default;
			}).catch(err => console.error('Failed to load ResultsGrid:', err));
		}
	});

	async function handleSearch(query: string, limit?: number) {
		if (!query.trim()) return;
		
		loading = true;
		error = null;
		searchQuery = query;
		const searchLimit = limit || INITIAL_LIMIT;
		currentLimit = searchLimit;
		hasMoreResults = false; // Reset until we know otherwise
		
		try {
			// Measure search performance
			const results = await performanceMonitor.measure('search', async () => {
				return await getRecommendations({ query, limit: searchLimit });
			});
			
			allBooks = results; // Store all books, filtering will be applied reactively
			
			// Prefetch book detail pages for first batch of results
			if (results.length > 0) {
				const bookIdsToPrefetch = results.slice(0, 10).map(book => book.id).filter(id => id !== undefined) as number[];
				if (bookIdsToPrefetch.length > 0) {
					prefetchBookDetails(bookIdsToPrefetch);
				}
			}
			
			// Check if there might be more results (if we got exactly the requested amount)
			hasMoreResults = results.length === searchLimit && searchLimit < MAX_LIMIT;
			
			// Add to search history
			addSearchToHistory(query);
			loadSearchHistory();
			
			// Reset scroll position
			showBackToTop = false;
			window.scrollTo({ top: 0, behavior: 'smooth' });
		} catch (e) {
			console.error('Search error:', e);
			// Create error with user-friendly message
			if (e instanceof Error) {
				error = e;
			} else {
				error = new Error('Failed to search. Please try again.');
			}
			allBooks = [];
			hasMoreResults = false;
		} finally {
			// Always reset loading state, even if there's an error
			loading = false;
		}
	}

	async function goToPage(page: number) {
		if (!searchQuery || loading || loadingMore || page < 1 || page > totalPages) return;
		const targetLimit = Math.min(page * INITIAL_LIMIT, MAX_LIMIT);
		
		if (targetLimit <= currentLimit) {
			// For pages we've already loaded, just slice the array and scroll to top
			currentLimit = targetLimit;
			allBooks = allBooks.slice(0, targetLimit);
			hasMoreResults = targetLimit < MAX_LIMIT && allBooks.length === targetLimit;
			window.scrollTo({ top: 0, behavior: 'smooth' });
		} else {
			// For pages we haven't loaded yet, we need to fetch more
			await handleSearch(searchQuery, targetLimit);
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
			// Calculate new limit based on pagination mode
		let newLimit: number;
		if (paginationMode === 'pages') {
			// For pages mode, increment by one page worth
			newLimit = Math.min(currentLimit + INITIAL_LIMIT, MAX_LIMIT);
		} else {
			newLimit = Math.min(currentLimit + LOAD_MORE_INCREMENT, MAX_LIMIT);
		}
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

<!-- Skip to main content link for screen readers -->
<a
	href="#main-content"
	class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-academia-gold focus:text-academia-dark focus:rounded focus:font-semibold"
>
	Skip to main content
</a>

<div class="min-h-screen p-2 sm:p-4 md:p-6 lg:p-8">
	<header class="text-center mb-4 sm:mb-6 md:mb-8 relative px-2">
		<div class="absolute top-0 right-0 md:right-4">
			<ThemeToggle />
		</div>
		<h1 class="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-academia-gold dark:text-academia-gold mb-2 sm:mb-4">
			WhatToRead
		</h1>
		<p class="text-primary/80 dark:text-academia-cream/80 text-base sm:text-lg mb-4 sm:mb-6 px-2">
			Discover your next favorite book through semantic search
		</p>
		<Tooltip text="Press / to focus the search bar">
			<SearchBar bind:this={searchBarRef} onSearch={handleSearch} />
		</Tooltip>
	</header>

	<!-- Mobile Navigation Toggle -->
	<div class="md:hidden mb-4 px-2">
		<button
			class="btn btn-secondary w-full flex items-center justify-between"
			onclick={() => showMobileNav = !showMobileNav}
			aria-label="Toggle navigation menu"
			aria-expanded={showMobileNav}
		>
			<span>Menu</span>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-5 w-5 transition-transform {showMobileNav ? 'rotate-180' : ''}"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
				aria-hidden="true"
			>
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
			</svg>
		</button>
	</div>

	<nav 
		aria-label="View and navigation options" 
		class="flex flex-col md:flex-row gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6 px-2 {showMobileNav ? '' : 'hidden md:flex'}"
	>
		<div class="flex gap-2 sm:gap-3 md:gap-4 flex-wrap">
			<Tooltip text="Press ← → arrow keys to swipe (in swipe mode)">
				<button
					class="btn {viewMode === 'swipe' ? 'btn-primary' : 'btn-secondary'} text-sm md:text-base"
					onclick={() => { viewMode = 'swipe'; showMobileNav = false; }}
					aria-label="Switch to swipe view mode"
					aria-pressed={viewMode === 'swipe'}
				>
					Swipe
				</button>
			</Tooltip>
			<button
				class="btn {viewMode === 'grid' ? 'btn-primary' : 'btn-secondary'} text-sm md:text-base"
				onclick={() => { viewMode = 'grid'; showMobileNav = false; }}
				aria-label="Switch to grid view mode"
				aria-pressed={viewMode === 'grid'}
			>
				Grid
			</button>
			<button 
				class="btn btn-secondary text-sm md:text-base" 
				onclick={() => { goto('/saved'); showMobileNav = false; }}
				aria-label="View saved books"
			>
				<span class="hidden sm:inline">Saved Books</span>
				<span class="sm:hidden">Saved</span>
			</button>
			<Tooltip text="Press ? to view all keyboard shortcuts">
				<button 
					class="btn btn-secondary text-sm md:text-base" 
					onclick={() => { goto('/taste-profile'); showMobileNav = false; }}
					aria-label="View your taste profile"
				>
					<span class="hidden sm:inline">Taste Profile</span>
					<span class="sm:hidden">Profile</span>
				</button>
			</Tooltip>
			{#if recentlyViewed.length > 0}
				<button 
					class="btn btn-secondary text-sm md:text-base" 
					onclick={() => { showRecentlyViewed = !showRecentlyViewed; showMobileNav = false; }}
					aria-label="Toggle recently viewed books"
					aria-expanded={showRecentlyViewed}
				>
					<span class="hidden sm:inline">Recently Viewed ({recentlyViewed.length})</span>
					<span class="sm:hidden">Recent ({recentlyViewed.length})</span>
				</button>
			{/if}
		</div>
		{#if allBooks.length > 0}
			<div class="flex gap-2 sm:gap-3 md:gap-4 flex-wrap">
				<button
					class="btn {paginationMode === 'load-more' ? 'btn-primary' : 'btn-secondary'} text-xs sm:text-sm md:text-base"
					onclick={() => { paginationMode = 'load-more'; showMobileNav = false; }}
					aria-label="Switch to load more pagination mode. Click 'Load More' button to see additional results"
					aria-pressed={paginationMode === 'load-more'}
				>
					<span class="hidden md:inline">Mode: Load More</span>
					<span class="md:hidden">Load More</span>
				</button>
				<button
					class="btn {paginationMode === 'infinite-scroll' ? 'btn-primary' : 'btn-secondary'} text-xs sm:text-sm md:text-base"
					onclick={() => { paginationMode = 'infinite-scroll'; showMobileNav = false; }}
					aria-label="Switch to infinite scroll pagination mode. Automatically loads more as you scroll down"
					aria-pressed={paginationMode === 'infinite-scroll'}
				>
					<span class="hidden md:inline">Mode: Auto Scroll</span>
					<span class="md:hidden">Auto</span>
				</button>
				<button
					class="btn {paginationMode === 'pages' ? 'btn-primary' : 'btn-secondary'} text-xs sm:text-sm md:text-base"
					onclick={() => { paginationMode = 'pages'; showMobileNav = false; }}
					aria-label="Switch to page number pagination mode"
					aria-pressed={paginationMode === 'pages'}
				>
					<span class="hidden md:inline">Mode: Pages</span>
					<span class="md:hidden">Pages</span>
				</button>
			</div>
		{/if}
	</nav>

	<main id="main-content">

	{#if loading}
		<div role="status" aria-live="polite" aria-atomic="true">
			<Loading message="Finding your perfect books..." />
		</div>
	{:else if error}
		<div class="max-w-2xl mx-auto mb-6">
			<ErrorBoundary error={error} showSuggestions={true} />
			<div class="mt-4 flex gap-3 justify-center">
				<button
					class="btn btn-secondary"
					onclick={() => {
						error = null;
						searchQuery = '';
						allBooks = [];
					}}
					aria-label="Clear error and start over"
				>
					Start Over
				</button>
				{#if searchQuery}
					<button
						class="btn btn-primary"
						onclick={() => handleSearch(searchQuery)}
						aria-label="Retry search"
					>
						Retry Search
					</button>
				{/if}
			</div>
		</div>
		{:else if allBooks.length > 0}
		<div class="max-w-7xl mx-auto">
			{#if showRecentlyViewed && recentlyViewed.length > 0}
				<section class="mb-8 card" aria-labelledby="recently-viewed-heading">
					<div class="flex justify-between items-center mb-4">
						<h2 id="recently-viewed-heading" class="text-2xl font-serif font-bold text-academia-gold">
							Recently Viewed Books
						</h2>
						<div class="flex gap-2">
							<button
								class="btn btn-secondary text-sm"
								onclick={handleClearRecentlyViewed}
								aria-label="Clear recently viewed books"
							>
								Clear All
							</button>
							<button
								class="btn btn-secondary text-sm"
								onclick={() => showRecentlyViewed = false}
								aria-label="Hide recently viewed books"
							>
								Hide
							</button>
						</div>
					</div>
					{#if ResultsGridComponent}
						{@const ResultsGrid = ResultsGridComponent}
						<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
							{#each recentlyViewed as rv (rv.book.id)}
								<div class="card relative group">
									<button
										class="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity btn btn-secondary p-1 rounded-full w-8 h-8 flex items-center justify-center focus:outline-2 focus:outline-offset-2 focus:outline-academia-gold focus:opacity-100"
										onclick={() => handleRemoveFromRecentlyViewed(rv.book.id)}
										aria-label="Remove {rv.book.title} from recently viewed"
									>
										<span aria-hidden="true" class="text-sm">✕</span>
									</button>
									<BookCard
										book={rv.book}
										onClick={() => handleBookClick(rv.book)}
									/>
								</div>
							{/each}
						</div>
					{:else}
						<Loading message="Loading recently viewed books..." />
					{/if}
				</section>
			{/if}
			<div class="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
				<div class="lg:col-span-1">
					<TasteProfile 
						history={searchHistory} 
						onHistoryChange={loadSearchHistory}
						onQueryClick={handleSearch}
					/>
				</div>
				<div class="lg:col-span-3">
					<FilterBar
						books={allBooks}
						preferences={filterPreferences}
						onPreferencesChange={handleFilterPreferencesChange}
					/>
					{#if books.length === 0}
						<div class="card text-center py-8" role="status" aria-live="polite">
							<p class="text-academia-cream/60 text-lg mb-2">
								No books match your current filters.
							</p>
							<p class="text-academia-cream/40 text-sm">
								Try adjusting your filter criteria.
							</p>
						</div>
					{:else}
						{#if viewMode === 'swipe'}
							{#if SwipeStackComponent}
								{@const SwipeStack = SwipeStackComponent}
								<SwipeStack
									bind:this={swipeStackRef}
									{books}
									onSwipeLeft={handleSwipeLeft}
									onSwipeRight={handleSwipeRight}
									onBookClick={handleBookClick}
								/>
							{:else}
								<Loading message="Loading swipe view..." />
							{/if}
						{:else}
							{#if ResultsGridComponent}
								{@const ResultsGrid = ResultsGridComponent}
								<ResultsGrid {books} onBookClick={handleBookClick} />
							{:else}
								<Loading message="Loading grid view..." />
							{/if}
						{/if}
						
						{#if viewMode === 'grid' && books.length > 0}
							<div class="mt-6 text-center" role="region" aria-label="Pagination controls">
								{#if paginationMode === 'load-more'}
									{#if hasMoreResults}
										<button
											class="btn btn-primary"
											onclick={loadMoreBooks}
											disabled={loadingMore}
											aria-label={loadingMore ? 'Loading more books' : 'Load more books'}
											aria-busy={loadingMore}
										>
											{loadingMore ? 'Loading...' : 'Load More'}
										</button>
									{:else}
										<p class="text-academia-cream/60 text-sm" role="status" aria-live="polite">
											No more results to load
										</p>
									{/if}
								{:else if paginationMode === 'infinite-scroll'}
									{#if loadingMore}
										<div class="py-4" role="status" aria-live="polite" aria-atomic="true">
											<Loading message="Loading more books..." />
										</div>
									{/if}
									{#if !hasMoreResults && books.length > INITIAL_LIMIT}
										<p class="text-academia-cream/60 text-sm py-4" role="status" aria-live="polite">
											{#if currentLimit >= MAX_LIMIT}
												You've reached the maximum number of results ({MAX_LIMIT} books). Try refining your search for more specific results.
											{:else}
												You've reached the end of the results
											{/if}
										</p>
									{/if}
								{:else if paginationMode === 'pages'}
									<div class="flex flex-col items-center gap-4">
										<div class="flex items-center gap-2 flex-wrap justify-center">
											<button
												class="btn btn-secondary"
												onclick={() => goToPage(currentPage - 1)}
												disabled={currentPage === 1 || loading || loadingMore}
												aria-label="Go to previous page"
											>
												← Prev
											</button>
											
											<div class="flex items-center gap-1">
												{#each pageNumbers as pageNum}
													{#if pageNum === currentPage}
														<span
															class="px-3 py-2 bg-academia-gold text-academia-dark rounded font-semibold"
															aria-current="page"
															aria-label="Current page: {pageNum}"
														>
															{pageNum}
														</span>
													{:else}
														<button
															class="btn btn-secondary px-3 py-2"
															onclick={() => goToPage(pageNum)}
															disabled={loading || loadingMore}
															aria-label="Go to page {pageNum}"
														>
															{pageNum}
														</button>
													{/if}
												{/each}
												{#if totalPages > 10}
													<span class="text-academia-cream/60 px-2">...</span>
													<button
														class="btn btn-secondary px-3 py-2"
														onclick={() => goToPage(totalPages)}
														disabled={loading || loadingMore}
														aria-label="Go to last page ({totalPages})"
													>
														{totalPages}
													</button>
												{/if}
											</div>

											<button
												class="btn btn-secondary"
												onclick={() => goToPage(currentPage + 1)}
												disabled={!hasMoreResults || loading || loadingMore}
												aria-label="Go to next page"
											>
												Next →
											</button>
										</div>
										
										<p class="text-academia-cream/60 text-sm" role="status" aria-live="polite">
											Page {currentPage} of {totalPages} 
											{#if currentLimit >= MAX_LIMIT}
												(max {MAX_LIMIT} books)
											{/if}
										</p>
									</div>
								{/if}
							</div>
						{/if}
					{/if}
				</div>
			</div>
		</div>
	{:else if searchQuery}
		<div class="text-center py-12" role="status" aria-live="polite">
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
	</main>

	<!-- Back to Top Button -->
	{#if showBackToTop}
		<button
			class="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 btn btn-primary rounded-full w-10 h-10 sm:w-12 sm:h-12 p-0 shadow-lg z-50 focus:outline-2 focus:outline-offset-2 focus:outline-academia-gold text-lg sm:text-xl"
			onclick={scrollToTop}
			aria-label="Scroll back to top of page"
		>
			<span aria-hidden="true">↑</span>
		</button>
	{/if}

	<!-- Keyboard Shortcuts Modal -->
	{#if KeyboardShortcutsModalComponent}
		{@const KeyboardShortcutsModal = KeyboardShortcutsModalComponent}
		<KeyboardShortcutsModal
			open={showShortcutsModal}
			onClose={() => showShortcutsModal = false}
		/>
	{/if}
</div>
