<script lang="ts">
	import type { SearchHistoryEntry } from '../types';
	import { removeSearchFromHistory, clearSearchHistory } from '../searchHistory';

	interface Props {
		history: SearchHistoryEntry[];
		onHistoryChange?: () => void;
	}

	let { history, onHistoryChange }: Props = $props();

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
		<div class="space-y-3">
			{#each history as entry}
				<div class="flex items-start gap-2 group">
					<div class="w-2 h-2 bg-academia-gold rounded-full mt-2 flex-shrink-0"></div>
					<div class="flex-1 min-w-0">
						<div class="flex items-start justify-between gap-2">
							<p class="text-sm text-academia-cream/80 break-words">{entry.query}</p>
							<button
								class="text-xs text-academia-cream/40 hover:text-red-400 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
								onclick={() => handleRemoveQuery(entry.query)}
								title="Remove from history"
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
		</div>
		<p class="text-xs text-academia-accent mt-4 pt-4 border-t border-academia-lighter">
			{totalSearches} total search{totalSearches !== 1 ? 'es' : ''} across{' '}
			{history.length} unique query{history.length !== 1 ? 'ies' : 'y'}
		</p>
	</div>
{/if}
