<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import type { Book, SavedBook, SavedBookStatus } from '$lib/types';
	import {
		getSavedBooksAsArrays,
		removeSavedBook,
		clearAllSavedBooks
	} from '$lib/storage';
	import ResultsGrid from '$lib/components/ResultsGrid.svelte';

	type FilterType = 'all' | 'interested' | 'not_interested';

	let savedBooks = $state<{
		interested: SavedBook[];
		not_interested: SavedBook[];
	}>({
		interested: [],
		not_interested: []
	});

	let filter = $state<FilterType>('all');

	function loadSavedBooks() {
		savedBooks = getSavedBooksAsArrays();
	}

	onMount(() => {
		loadSavedBooks();
		// Listen for storage changes to update the list when books are saved elsewhere
		const handleStorageChange = () => {
			loadSavedBooks();
		};
		window.addEventListener('storage', handleStorageChange);
		return () => {
			window.removeEventListener('storage', handleStorageChange);
		};
	});

	const filteredBooks = $derived.by(() => {
		if (filter === 'all') {
			return [
				...savedBooks.interested.map((sb) => sb.book),
				...savedBooks.not_interested.map((sb) => sb.book)
			];
		} else if (filter === 'interested') {
			return savedBooks.interested.map((sb) => sb.book);
		} else {
			return savedBooks.not_interested.map((sb) => sb.book);
		}
	});

	const totalInterested = $derived(savedBooks.interested.length);
	const totalNotInterested = $derived(savedBooks.not_interested.length);
	const totalSaved = $derived(totalInterested + totalNotInterested);

	function handleBookClick(book: Book) {
		goto(`/books/${book.id}`);
	}

	function handleRemoveBook(bookId: number) {
		removeSavedBook(bookId);
		loadSavedBooks();
	}

	function handleClearAll() {
		if (confirm('Are you sure you want to clear all saved books? This cannot be undone.')) {
			clearAllSavedBooks();
			loadSavedBooks();
		}
	}

	function getBookStatus(bookId: number): SavedBookStatus | null {
		if (savedBooks.interested.find((sb) => sb.book.id === bookId)) {
			return 'interested';
		}
		if (savedBooks.not_interested.find((sb) => sb.book.id === bookId)) {
			return 'not_interested';
		}
		return null;
	}

	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>Saved Books - WhatToRead</title>
</svelte:head>

<div class="min-h-screen p-4 md:p-8">
	<header class="text-center mb-8">
		<h1 class="text-4xl md:text-5xl font-serif font-bold text-academia-gold mb-4">
			Saved Books
		</h1>
		<p class="text-academia-cream/80 text-lg mb-6">
			Your interested and not interested books
		</p>

		<div class="flex gap-4 mb-6 justify-center flex-wrap">
			<button
				class="btn {filter === 'all' ? 'btn-primary' : 'btn-secondary'}"
				onclick={() => (filter = 'all')}
			>
				All ({totalSaved})
			</button>
			<button
				class="btn {filter === 'interested' ? 'btn-primary' : 'btn-secondary'}"
				onclick={() => (filter = 'interested')}
			>
				Interested ({totalInterested})
			</button>
			<button
				class="btn {filter === 'not_interested' ? 'btn-primary' : 'btn-secondary'}"
				onclick={() => (filter = 'not_interested')}
			>
				Not Interested ({totalNotInterested})
			</button>
			<button class="btn btn-secondary" onclick={() => goto('/')}>
				Back to Search
			</button>
			{#if totalSaved > 0}
				<button class="btn btn-secondary" onclick={handleClearAll}>
					Clear All
				</button>
			{/if}
		</div>
	</header>

	{#if totalSaved === 0}
		<div class="text-center py-12 max-w-2xl mx-auto">
			<p class="text-academia-cream/60 text-lg mb-4">
				No saved books yet. Start swiping to save books you're interested in or not
				interested in!
			</p>
			<button class="btn btn-primary" onclick={() => goto('/')}>
				Start Searching
			</button>
		</div>
	{:else if filteredBooks.length === 0}
		<div class="text-center py-12">
			<p class="text-academia-cream/60 text-lg">
				No books in this category. Try a different filter.
			</p>
		</div>
	{:else}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
			{#each filteredBooks as book (book.id)}
				{@const status = getBookStatus(book.id)}
				{@const savedBook = savedBooks.interested.find((sb) => sb.book.id === book.id) ||
					savedBooks.not_interested.find((sb) => sb.book.id === book.id)}
				<div class="card relative">
					<div class="absolute top-2 right-2">
						{#if status === 'interested'}
							<span
								class="px-2 py-1 bg-green-900/30 border border-green-600 rounded text-xs text-green-300"
								title="Interested"
							>
								✓ Interested
							</span>
						{:else if status === 'not_interested'}
							<span
								class="px-2 py-1 bg-red-900/30 border border-red-600 rounded text-xs text-red-300"
								title="Not Interested"
							>
								✕ Not Interested
							</span>
						{/if}
					</div>

					<h2 class="text-2xl font-serif font-bold text-academia-gold mb-2 pr-20">
						{book.title}
					</h2>

					{#if book.authors && book.authors.length > 0}
						<p class="text-academia-cream/80 mb-3">by {book.authors.join(', ')}</p>
					{/if}

					{#if book.first_publish_year}
						<p class="text-sm text-academia-accent mb-3">{book.first_publish_year}</p>
					{/if}

					{#if book.subjects && book.subjects.length > 0}
						<div class="flex flex-wrap gap-2 mb-4">
							{#each book.subjects.slice(0, 5) as subject}
								<span
									class="px-2 py-1 bg-academia-lighter rounded text-xs text-academia-cream"
								>
									{subject}
								</span>
							{/each}
						</div>
					{/if}

					{#if savedBook}
						<p class="text-xs text-academia-cream/50 mb-3">
							Saved: {formatDate(savedBook.savedAt)}
						</p>
					{/if}

					<div class="flex gap-2 mt-4 pt-4 border-t border-academia-lighter">
						<button
							class="btn btn-primary flex-1"
							onclick={() => handleBookClick(book)}
						>
							View Details
						</button>
						<button
							class="btn btn-secondary"
							onclick={() => handleRemoveBook(book.id)}
							title="Remove from saved"
						>
							✕
						</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
