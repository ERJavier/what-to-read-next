<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import type { SearchHistoryEntry } from '../types';
	import { removeSearchFromHistory, clearSearchHistory } from '../searchHistory';
	import {
		calculateTasteProfileStats,
		generateInsights,
		generateRecommendationQueries,
		exportAsJSON,
		exportAsCSV,
		type TasteProfileStats,
		type TasteProfileInsight
	} from '../tasteProfileUtils';
	import { getRecommendations } from '../api';

	interface Props {
		history: SearchHistoryEntry[];
		onHistoryChange?: () => void;
	}

	let { history, onHistoryChange }: Props = $props();

	let stats = $state<TasteProfileStats | null>(null);
	let insights = $state<TasteProfileInsight[]>([]);
	let recommendationQueries = $state<string[]>([]);
	let activeTab = $state<'overview' | 'charts' | 'insights' | 'recommendations'>('overview');
	let showExportMenu = $state(false);
	let shareSuccess = $state(false);
	let loadingRecommendations = $state(false);
	let recommendedBooks = $state<any[]>([]);
	let isUpdatingStats = $state(false);

	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

		if (diffDays === 0) {
			return 'Today';
		} else if (diffDays === 1) {
			return 'Yesterday';
		} else if (diffDays < 7) {
			return `${diffDays} days ago`;
		} else {
			return date.toLocaleDateString('en-US', {
				month: 'short',
				day: 'numeric',
				year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
			});
		}
	}

	function handleRemoveQuery(query: string) {
		removeSearchFromHistory(query);
		onHistoryChange?.();
		updateStats();
	}

	function handleClearHistory() {
		if (confirm('Are you sure you want to clear all search history? This cannot be undone.')) {
			clearSearchHistory();
			onHistoryChange?.();
			updateStats();
		}
	}

	function updateStats() {
		// Prevent recursive calls
		if (isUpdatingStats) return;
		
		isUpdatingStats = true;
		
		// Calculate new stats (reads from localStorage)
		const newStats = calculateTasteProfileStats();
		const newInsights = generateInsights(newStats);
		const newRecommendationQueries = generateRecommendationQueries(newStats);
		
		// Update state - these are not tracked by the effect because we don't read them in the effect
		stats = newStats;
		insights = newInsights;
		recommendationQueries = newRecommendationQueries;
		
		isUpdatingStats = false;
	}

	async function loadRecommendations() {
		if (recommendationQueries.length === 0) return;
		
		loadingRecommendations = true;
		try {
			// Use the first recommendation query
			const query = recommendationQueries[0];
			const results = await getRecommendations({ query, limit: 9 });
			recommendedBooks = results;
		} catch (e) {
			console.error('Failed to load recommendations:', e);
			recommendedBooks = [];
		} finally {
			loadingRecommendations = false;
		}
	}

	function handleExportJSON() {
		if (!stats) return;
		const json = exportAsJSON(stats, insights);
		const blob = new Blob([json], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `taste-profile-${new Date().toISOString().split('T')[0]}.json`;
		a.click();
		URL.revokeObjectURL(url);
		showExportMenu = false;
	}

	function handleExportCSV() {
		if (!stats) return;
		const csv = exportAsCSV(stats);
		const blob = new Blob([csv], { type: 'text/csv' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `taste-profile-${new Date().toISOString().split('T')[0]}.csv`;
		a.click();
		URL.revokeObjectURL(url);
		showExportMenu = false;
	}

	async function handleShare() {
		if (!stats) return;
		
		const json = exportAsJSON(stats, insights);
		
		try {
			if (navigator.share) {
				const blob = new Blob([json], { type: 'application/json' });
				const file = new File([blob], 'taste-profile.json', { type: 'application/json' });
				await navigator.share({
					title: 'My Taste Profile',
					text: `Check out my reading taste profile from WhatToRead!`,
					files: [file]
				});
			} else {
				// Fallback: copy to clipboard
				await navigator.clipboard.writeText(json);
				shareSuccess = true;
				setTimeout(() => {
					shareSuccess = false;
				}, 2000);
			}
		} catch (e) {
			// Fallback: copy to clipboard
			try {
				await navigator.clipboard.writeText(json);
				shareSuccess = true;
				setTimeout(() => {
					shareSuccess = false;
				}, 2000);
			} catch (err) {
				console.error('Failed to share:', err);
			}
		}
	}

	function getMaxValue(data: Array<{ count: number }>): number {
		if (data.length === 0) return 1;
		return Math.max(...data.map((d) => d.count));
	}

	function getBarWidth(count: number, max: number): number {
		if (max === 0) return 0;
		return (count / max) * 100;
	}

	// Track previous history to detect actual changes
	let previousHistoryKey = $state<string>('');
	
	// Update stats when history actually changes
	$effect(() => {
		// Create a key from history to detect changes
		const historyKey = history.map(h => `${h.query}:${h.count}`).join('|');
		
		// Only update if history actually changed and we're not already updating
		if (historyKey !== previousHistoryKey && !isUpdatingStats) {
			previousHistoryKey = historyKey;
			updateStats();
		}
	});

	onMount(() => {
		// Initialize stats on mount
		if (!isUpdatingStats && history.length > 0) {
			const initialHistoryKey = history.map(h => `${h.query}:${h.count}`).join('|');
			previousHistoryKey = initialHistoryKey;
			updateStats();
		}
		
		// Close export menu when clicking outside
		const handleClickOutside = (e: MouseEvent) => {
			const target = e.target as HTMLElement;
			if (!target.closest('.export-menu-container')) {
				showExportMenu = false;
			}
		};
		window.addEventListener('click', handleClickOutside);
		
		// Listen for storage changes (saved books changes) to update stats
		const handleStorageChange = () => {
			if (!isUpdatingStats) {
				updateStats();
			}
		};
		window.addEventListener('storage', handleStorageChange);
		
		return () => {
			window.removeEventListener('click', handleClickOutside);
			window.removeEventListener('storage', handleStorageChange);
		};
	});

	// Load recommendations when activeTab or recommendationQueries change
	$effect(() => {
		if (activeTab === 'recommendations' && recommendationQueries.length > 0) {
			loadRecommendations();
		}
	});
</script>

{#if stats && (stats.totalSearches > 0 || stats.totalBooksSaved > 0)}
	<div class="card">
		<!-- Header -->
		<div class="flex items-center justify-between mb-4">
			<h3 class="text-lg font-serif font-bold text-academia-gold">Enhanced Taste Profile</h3>
			<div class="flex gap-2 items-center relative export-menu-container">
				<button
					class="text-xs text-academia-accent hover:text-academia-gold transition-colors"
					onclick={() => showExportMenu = !showExportMenu}
					title="Export"
				>
					Export
				</button>
				{#if showExportMenu}
					<div class="absolute right-0 top-full mt-2 bg-academia-dark border border-academia-lighter rounded shadow-lg z-10 min-w-[120px]">
						<button
							class="block w-full text-left px-3 py-2 text-sm text-academia-cream hover:bg-academia-lighter transition-colors"
							onclick={(e) => {
								e.stopPropagation();
								handleExportJSON();
							}}
						>
							Export as JSON
						</button>
						<button
							class="block w-full text-left px-3 py-2 text-sm text-academia-cream hover:bg-academia-lighter transition-colors border-t border-academia-lighter"
							onclick={(e) => {
								e.stopPropagation();
								handleExportCSV();
							}}
						>
							Export as CSV
						</button>
					</div>
				{/if}
				<button
					class="text-xs text-academia-accent hover:text-academia-gold transition-colors {shareSuccess ? 'text-green-400' : ''}"
					onclick={handleShare}
					title="Share"
				>
					{shareSuccess ? '✓ Copied!' : 'Share'}
				</button>
				<button
					class="text-xs text-academia-accent hover:text-academia-gold transition-colors"
					onclick={handleClearHistory}
					title="Clear all search history"
				>
					Clear All
				</button>
			</div>
		</div>

		<!-- Tabs -->
		<div class="flex gap-2 mb-4 border-b border-academia-lighter">
			<button
				class="px-3 py-2 text-sm font-medium transition-colors {activeTab === 'overview' ? 'text-academia-gold border-b-2 border-academia-gold' : 'text-academia-cream/60 hover:text-academia-cream'}"
				onclick={() => activeTab = 'overview'}
			>
				Overview
			</button>
			<button
				class="px-3 py-2 text-sm font-medium transition-colors {activeTab === 'charts' ? 'text-academia-gold border-b-2 border-academia-gold' : 'text-academia-cream/60 hover:text-academia-cream'}"
				onclick={() => activeTab = 'charts'}
			>
				Charts
			</button>
			<button
				class="px-3 py-2 text-sm font-medium transition-colors {activeTab === 'insights' ? 'text-academia-gold border-b-2 border-academia-gold' : 'text-academia-cream/60 hover:text-academia-cream'}"
				onclick={() => activeTab = 'insights'}
			>
				Insights
			</button>
			<button
				class="px-3 py-2 text-sm font-medium transition-colors {activeTab === 'recommendations' ? 'text-academia-gold border-b-2 border-academia-gold' : 'text-academia-cream/60 hover:text-academia-cream'}"
				onclick={() => activeTab = 'recommendations'}
			>
				Recommendations
			</button>
		</div>

		<!-- Overview Tab -->
		{#if activeTab === 'overview'}
			<div class="space-y-4">
				<!-- Statistics Grid -->
				<div class="grid grid-cols-2 gap-4">
					<div class="bg-academia-dark/50 rounded p-3">
						<div class="text-2xl font-bold text-academia-gold">{stats.totalSearches}</div>
						<div class="text-xs text-academia-cream/60">Total Searches</div>
					</div>
					<div class="bg-academia-dark/50 rounded p-3">
						<div class="text-2xl font-bold text-academia-gold">{stats.uniqueQueries}</div>
						<div class="text-xs text-academia-cream/60">Unique Queries</div>
					</div>
					<div class="bg-academia-dark/50 rounded p-3">
						<div class="text-2xl font-bold text-academia-gold">{stats.totalBooksSaved}</div>
						<div class="text-xs text-academia-cream/60">Books Saved</div>
					</div>
					<div class="bg-academia-dark/50 rounded p-3">
						<div class="text-2xl font-bold text-academia-gold">{stats.interestedBooks}</div>
						<div class="text-xs text-academia-cream/60">Interested</div>
					</div>
				</div>

				<!-- Top Genres -->
				{#if stats.favoriteGenres.length > 0}
					<div>
						<h4 class="text-sm font-semibold text-academia-cream mb-2">Favorite Genres</h4>
						<div class="flex flex-wrap gap-2">
							{#each stats.favoriteGenres.slice(0, 5) as genre}
								<span class="px-2 py-1 bg-academia-lighter rounded text-xs text-academia-cream">
									{genre.genre} ({genre.count})
								</span>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Top Authors -->
				{#if stats.favoriteAuthors.length > 0}
					<div>
						<h4 class="text-sm font-semibold text-academia-cream mb-2">Favorite Authors</h4>
						<div class="flex flex-wrap gap-2">
							{#each stats.favoriteAuthors.slice(0, 5) as author}
								<span class="px-2 py-1 bg-academia-lighter rounded text-xs text-academia-cream">
									{author.author} ({author.count})
								</span>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Recent Searches -->
				{#if history.length > 0}
					<div>
						<h4 class="text-sm font-semibold text-academia-cream mb-2">Recent Searches</h4>
						<div class="space-y-2">
							{#each history.slice(0, 5) as entry}
								<div class="flex items-start justify-between gap-2 text-sm">
									<div class="flex-1">
										<p class="text-academia-cream/80">{entry.query}</p>
										<p class="text-xs text-academia-cream/50">{formatDate(entry.lastSearched)}</p>
									</div>
									<button
										class="text-xs text-academia-cream/40 hover:text-red-400"
										onclick={() => handleRemoveQuery(entry.query)}
									>
										✕
									</button>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		{/if}

		<!-- Charts Tab -->
		{#if activeTab === 'charts'}
			<div class="space-y-6">
				<!-- Genre Chart -->
				{#if stats.favoriteGenres.length > 0}
					{@const maxGenreCount = getMaxValue(stats.favoriteGenres)}
					<div>
						<h4 class="text-sm font-semibold text-academia-cream mb-3">Top Genres</h4>
						<div class="space-y-2">
							{#each stats.favoriteGenres.slice(0, 8) as genre}
								<div>
									<div class="flex justify-between items-center mb-1">
										<span class="text-xs text-academia-cream/80">{genre.genre}</span>
										<span class="text-xs text-academia-accent">{genre.count}</span>
									</div>
									<div class="h-4 bg-academia-dark rounded overflow-hidden">
										<div
											class="h-full bg-academia-gold transition-all duration-300"
											style="width: {getBarWidth(genre.count, maxGenreCount)}%"
										></div>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Author Chart -->
				{#if stats.favoriteAuthors.length > 0}
					{@const maxAuthorCount = getMaxValue(stats.favoriteAuthors)}
					<div>
						<h4 class="text-sm font-semibold text-academia-cream mb-3">Top Authors</h4>
						<div class="space-y-2">
							{#each stats.favoriteAuthors.slice(0, 8) as author}
								<div>
									<div class="flex justify-between items-center mb-1">
										<span class="text-xs text-academia-cream/80">{author.author}</span>
										<span class="text-xs text-academia-accent">{author.count}</span>
									</div>
									<div class="h-4 bg-academia-dark rounded overflow-hidden">
										<div
											class="h-full bg-academia-accent transition-all duration-300"
											style="width: {getBarWidth(author.count, maxAuthorCount)}%"
										></div>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Year Distribution Chart -->
				{#if stats.yearDistribution.length > 0}
					{@const maxYearCount = getMaxValue(stats.yearDistribution)}
					<div>
						<h4 class="text-sm font-semibold text-academia-cream mb-3">Decade Distribution</h4>
						<div class="space-y-2">
							{#each stats.yearDistribution as year}
								<div>
									<div class="flex justify-between items-center mb-1">
										<span class="text-xs text-academia-cream/80">{year.year}s</span>
										<span class="text-xs text-academia-accent">{year.count}</span>
									</div>
									<div class="h-4 bg-academia-dark rounded overflow-hidden">
										<div
											class="h-full bg-academia-gold/70 transition-all duration-300"
											style="width: {getBarWidth(year.count, maxYearCount)}%"
										></div>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Search Activity Chart -->
				{#if stats.mostSearchedQueries.length > 0}
					{@const maxQueryCount = getMaxValue(stats.mostSearchedQueries)}
					<div>
						<h4 class="text-sm font-semibold text-academia-cream mb-3">Most Searched Queries</h4>
						<div class="space-y-2">
							{#each stats.mostSearchedQueries.slice(0, 8) as query}
								<div>
									<div class="flex justify-between items-center mb-1">
										<span class="text-xs text-academia-cream/80 truncate">{query.query}</span>
										<span class="text-xs text-academia-accent">{query.count}</span>
									</div>
									<div class="h-4 bg-academia-dark rounded overflow-hidden">
										<div
											class="h-full bg-academia-accent/70 transition-all duration-300"
											style="width: {getBarWidth(query.count, maxQueryCount)}%"
										></div>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		{/if}

		<!-- Insights Tab -->
		{#if activeTab === 'insights'}
			<div class="space-y-3">
				{#if insights.length > 0}
					{#each insights as insight}
						<div class="bg-academia-dark/50 rounded p-3 border-l-4 border-academia-gold">
							<div class="flex items-start justify-between">
								<div class="flex-1">
									<h4 class="text-sm font-semibold text-academia-gold mb-1">{insight.title}</h4>
									<p class="text-xs text-academia-cream/80">{insight.message}</p>
								</div>
								{#if insight.type === 'genre' || insight.type === 'author'}
									<span class="ml-2 text-xs px-2 py-1 bg-academia-lighter rounded text-academia-cream">
										{insight.type === 'genre' ? 'Genre' : 'Author'}
									</span>
								{/if}
							</div>
						</div>
					{/each}
				{:else}
					<div class="text-center py-8 text-academia-cream/60 text-sm">
						No insights available yet. Keep searching and saving books to generate insights!
					</div>
				{/if}
			</div>
		{/if}

		<!-- Recommendations Tab -->
		{#if activeTab === 'recommendations'}
			<div class="space-y-4">
				{#if recommendationQueries.length > 0}
					<div>
						<p class="text-sm text-academia-cream/80 mb-4">
							Based on your taste profile, here are some book recommendations:
						</p>
						{#if loadingRecommendations}
							<div class="text-center py-8 text-academia-cream/60 text-sm">Loading recommendations...</div>
						{:else if recommendedBooks.length > 0}
							<div class="grid grid-cols-1 gap-3">
								{#each recommendedBooks as book}
									<div
										class="bg-academia-dark/50 rounded p-3 hover:bg-academia-dark transition-colors cursor-pointer"
										role="button"
										tabindex="0"
										onclick={() => goto(`/books/${book.id}`)}
										onkeydown={(e) => {
											if (e.key === 'Enter' || e.key === ' ') {
												e.preventDefault();
												goto(`/books/${book.id}`);
											}
										}}
									>
										<h5 class="text-sm font-semibold text-academia-gold mb-1">{book.title}</h5>
										{#if book.authors && book.authors.length > 0}
											<p class="text-xs text-academia-cream/60 mb-2">
												by {book.authors.join(', ')}
											</p>
										{/if}
										{#if book.subjects && book.subjects.length > 0}
											<div class="flex flex-wrap gap-1 mt-2">
												{#each book.subjects.slice(0, 3) as subject}
													<span class="text-xs px-1.5 py-0.5 bg-academia-lighter rounded text-academia-cream/60">
														{subject}
													</span>
												{/each}
											</div>
										{/if}
									</div>
								{/each}
							</div>
						{:else}
							<div class="text-center py-8 text-academia-cream/60 text-sm">
								No recommendations available at the moment.
							</div>
						{/if}
					</div>
				{:else}
					<div class="text-center py-8 text-academia-cream/60 text-sm">
						Save some books and search for books to get personalized recommendations!
					</div>
				{/if}
			</div>
		{/if}
	</div>
{:else}
	<div class="card">
		<h3 class="text-lg font-serif font-bold text-academia-gold mb-2">Your Taste Profile</h3>
		<p class="text-sm text-academia-cream/60">
			Start searching and saving books to build your personalized taste profile!
		</p>
	</div>
{/if}
