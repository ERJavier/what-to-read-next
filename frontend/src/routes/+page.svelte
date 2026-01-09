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
	let error = $state<Error | null>(null);
	let viewMode = $state<'swipe' | 'grid'>('swipe');
	let searchHistory = $state<SearchHistoryEntry[]>([]);

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
		return () => {
			window.removeEventListener('storage', handleStorageChange);
		};
	});

	async function handleSearch(query: string) {
		if (!query.trim()) return;
		
		loading = true;
		error = null;
		searchQuery = query;
		
		try {
			const results = await getRecommendations({ query, limit: 20 });
			books = results;
			
			// Add to search history
			addSearchToHistory(query);
			loadSearchHistory();
		} catch (e) {
			error = e instanceof Error ? e : new Error('Failed to search');
			books = [];
		} finally {
			loading = false;
		}
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
</div>
