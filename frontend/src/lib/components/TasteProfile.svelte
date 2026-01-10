<script lang="ts">
	import type { SearchHistoryEntry } from '../types';
	import { removeSearchFromHistory, clearSearchHistory } from '../searchHistory';

	interface Props {
		history: SearchHistoryEntry[];
		onHistoryChange?: () => void;
		onQueryClick?: (query: string) => void;
	}

	let { history, onHistoryChange, onQueryClick }: Props = $props();

	type FilterType = 'all' | 'recent' | 'frequent' | 'today';
	let filter = $state<FilterType>('all');

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
	}

	function handleClearHistory() {
		if (confirm('Are you sure you want to clear all search history? This cannot be undone.')) {
			clearSearchHistory();
			onHistoryChange?.();
		}
	}

	const totalSearches = $derived(
		history.reduce((sum, entry) => sum + entry.count, 0)
	);

	const filteredHistory = $derived.by(() => {
		if (filter === 'all') {
			return history;
		} else if (filter === 'recent') {
			return [...history].sort((a, b) => 
				new Date(b.lastSearched).getTime() - new Date(a.lastSearched).getTime()
			);
		} else if (filter === 'frequent') {
			return [...history]
				.filter(entry => entry.count > 1)
				.sort((a, b) => b.count - a.count);
		} else if (filter === 'today') {
			const today = new Date();
			today.setHours(0, 0, 0, 0);
			return history.filter(entry => {
				const entryDate = new Date(entry.lastSearched);
				entryDate.setHours(0, 0, 0, 0);
				return entryDate.getTime() === today.getTime();
			});
		}
		return history;
	});

	function handleQueryClick(query: string) {
		onQueryClick?.(query);
	}
</script>

{#if history.length > 0}
	<div class="card">
		<div class="flex items-center justify-between mb-4">
			<h3 class="text-lg font-serif font-bold text-academia-gold">Your Taste Profile</h3>
			<button
				class="text-xs text-academia-accent hover:text-academia-gold transition-colors"
				onclick={handleClearHistory}
				title="Clear all search history"
			>
				Clear All
			</button>
		</div>
		
		<!-- Quick Filters -->
		<div class="flex flex-wrap gap-2 mb-4">
			<button
				class="text-xs px-2 py-1 rounded {filter === 'all' ? 'bg-academia-gold text-academia-dark' : 'bg-academia-lighter text-academia-cream hover:bg-academia-light'} transition-colors"
				onclick={() => filter = 'all'}
				aria-label="Show all searches"
				aria-pressed={filter === 'all'}
			>
				All ({history.length})
			</button>
			<button
				class="text-xs px-2 py-1 rounded {filter === 'recent' ? 'bg-academia-gold text-academia-dark' : 'bg-academia-lighter text-academia-cream hover:bg-academia-light'} transition-colors"
				onclick={() => filter = 'recent'}
				aria-label="Show recent searches"
				aria-pressed={filter === 'recent'}
			>
				Recent
			</button>
			<button
				class="text-xs px-2 py-1 rounded {filter === 'frequent' ? 'bg-academia-gold text-academia-dark' : 'bg-academia-lighter text-academia-cream hover:bg-academia-light'} transition-colors"
				onclick={() => filter = 'frequent'}
				aria-label="Show frequently searched queries"
				aria-pressed={filter === 'frequent'}
			>
				Frequent
			</button>
			<button
				class="text-xs px-2 py-1 rounded {filter === 'today' ? 'bg-academia-gold text-academia-dark' : 'bg-academia-lighter text-academia-cream hover:bg-academia-light'} transition-colors"
				onclick={() => filter = 'today'}
				aria-label="Show today's searches"
				aria-pressed={filter === 'today'}
			>
				Today
			</button>
		</div>

		<div class="space-y-3">
			{#if filteredHistory.length === 0}
				<p class="text-sm text-academia-cream/60 text-center py-4">
					No searches match the selected filter.
				</p>
			{:else}
				{#each filteredHistory as entry}
				<div class="flex items-start gap-2 group">
					<div class="w-2 h-2 bg-academia-gold rounded-full mt-2 flex-shrink-0"></div>
					<div class="flex-1 min-w-0">
						<div class="flex items-start justify-between gap-2">
							<button
								class="text-sm text-academia-cream/80 break-words text-left hover:text-academia-gold transition-colors focus:outline-2 focus:outline-offset-2 focus:outline-academia-gold rounded"
								onclick={() => handleQueryClick(entry.query)}
								aria-label="Search for: {entry.query}"
							>
								{entry.query}
							</button>
							<button
								class="text-xs text-academia-cream/40 hover:text-red-400 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-2 focus:outline-offset-2 focus:outline-academia-gold rounded"
								onclick={(e) => {
									e.stopPropagation();
									handleRemoveQuery(entry.query);
								}}
								title="Remove from history"
								aria-label="Remove {entry.query} from history"
							>
								✕
							</button>
						</div>
						<div class="flex items-center gap-3 mt-1">
							{#if entry.count > 1}
								<span class="text-xs text-academia-accent">
									{entry.count}× searched
								</span>
							{/if}
							<span class="text-xs text-academia-cream/50">
								Last: {formatDate(entry.lastSearched)}
							</span>
						</div>
					</div>
				</div>
				{/each}
			{/if}
		</div>
		<p class="text-xs text-academia-accent mt-4 pt-4 border-t border-academia-lighter">
			{totalSearches} total search{totalSearches !== 1 ? 'es' : ''} across{' '}
			{history.length} unique query{history.length !== 1 ? 'ies' : 'y'}
		</p>
	</div>
{/if}
