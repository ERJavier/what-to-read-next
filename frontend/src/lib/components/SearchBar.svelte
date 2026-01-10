<script lang="ts">
	import { onMount } from 'svelte';
	import { getSearchHistory } from '../searchHistory';
	import type { SearchHistoryEntry } from '../types';

	interface Props {
		value?: string;
		onSearch?: (query: string) => void;
		placeholder?: string;
		showSuggestions?: boolean;
	}

	let { value = $bindable(''), onSearch, placeholder = 'Search for books...', showSuggestions = true }: Props = $props();
	
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;
	let searchInput: HTMLInputElement | null = $state(null);
	let suggestions = $state<string[]>([]);
	let showSuggestionsDropdown = $state(false);
	let selectedSuggestionIndex = $state(-1);
	let searchHistory = $state<SearchHistoryEntry[]>([]);

	// Expose focus method
	export function focus() {
		searchInput?.focus();
	}

	function loadSearchHistory() {
		searchHistory = getSearchHistory();
	}

	onMount(() => {
		loadSearchHistory();
	});

	function updateSuggestions(query: string) {
		if (!query.trim() || !showSuggestions) {
			suggestions = [];
			showSuggestionsDropdown = false;
			return;
		}

		const queryLower = query.toLowerCase();
		// Get suggestions from search history that match the query
		const matching = searchHistory
			.filter(entry => entry.query.toLowerCase().includes(queryLower))
			.sort((a, b) => {
				// Prioritize by recency and count
				const aScore = b.count * 10 + (new Date(b.lastSearched).getTime() / 1000000);
				const bScore = a.count * 10 + (new Date(a.lastSearched).getTime() / 1000000);
				return bScore - aScore;
			})
			.slice(0, 5)
			.map(entry => entry.query);

		// Remove duplicates and the exact query
		suggestions = [...new Set(matching)].filter(s => s.toLowerCase() !== queryLower);
		showSuggestionsDropdown = suggestions.length > 0;
		selectedSuggestionIndex = -1;
	}

	function handleInput(e: Event) {
		const target = e.target as HTMLInputElement;
		value = target.value;
		updateSuggestions(value);
		
		if (debounceTimer) {
			clearTimeout(debounceTimer);
		}
		
		debounceTimer = setTimeout(() => {
			if (value.trim()) {
				onSearch?.(value.trim());
			}
		}, 300);
	}

	function handleSubmit(e: Event) {
		e.preventDefault();
		if (debounceTimer) {
			clearTimeout(debounceTimer);
		}
		if (selectedSuggestionIndex >= 0 && suggestions[selectedSuggestionIndex]) {
			value = suggestions[selectedSuggestionIndex];
			showSuggestionsDropdown = false;
			onSearch?.(value.trim());
		} else if (value.trim()) {
			onSearch?.(value.trim());
			showSuggestionsDropdown = false;
		}
	}

	function handleSuggestionClick(suggestion: string) {
		value = suggestion;
		showSuggestionsDropdown = false;
		onSearch?.(suggestion);
		if (searchInput) {
			searchInput.focus();
		}
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (!showSuggestionsDropdown || suggestions.length === 0) return;

		if (e.key === 'ArrowDown') {
			e.preventDefault();
			selectedSuggestionIndex = Math.min(selectedSuggestionIndex + 1, suggestions.length - 1);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			selectedSuggestionIndex = Math.max(selectedSuggestionIndex - 1, -1);
		} else if (e.key === 'Enter' && selectedSuggestionIndex >= 0) {
			e.preventDefault();
			handleSuggestionClick(suggestions[selectedSuggestionIndex]);
		} else if (e.key === 'Escape') {
			showSuggestionsDropdown = false;
			selectedSuggestionIndex = -1;
		}
	}

	function handleFocus() {
		if (value.trim()) {
			updateSuggestions(value);
		}
		loadSearchHistory(); // Reload in case it changed
	}

	function handleBlur(e: FocusEvent) {
		// Delay hiding suggestions to allow click events to fire
		setTimeout(() => {
			showSuggestionsDropdown = false;
		}, 200);
	}
</script>

<form onsubmit={handleSubmit} class="w-full max-w-2xl mx-auto" role="search" aria-label="Book search">
	<div class="relative">
		<label for="search-input" class="sr-only">
			Search for books
		</label>
		<input
			id="search-input"
			bind:this={searchInput}
			type="text"
			class="input pr-12"
			placeholder={placeholder}
			value={value}
			oninput={handleInput}
			onkeydown={handleKeyDown}
			onfocus={handleFocus}
			onblur={handleBlur}
			aria-label="Search for books"
			aria-describedby="search-hint"
			aria-autocomplete="list"
			aria-expanded={showSuggestionsDropdown}
			aria-controls="search-suggestions"
		/>
		<button
			type="submit"
			class="absolute right-2 top-1/2 -translate-y-1/2 btn btn-primary"
			aria-label="Submit search"
		>
			Search
		</button>
		{#if showSuggestionsDropdown && suggestions.length > 0}
			<ul
				id="search-suggestions"
				class="absolute top-full left-0 right-0 mt-1 bg-academia-light border border-academia-lighter rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto"
				role="listbox"
				aria-label="Search suggestions"
			>
				{#each suggestions as suggestion, index}
					<li
						role="option"
						aria-selected={selectedSuggestionIndex === index}
						class="px-4 py-2 cursor-pointer hover:bg-academia-lighter transition-colors {selectedSuggestionIndex === index ? 'bg-academia-lighter' : ''}"
						onclick={() => handleSuggestionClick(suggestion)}
						onmouseenter={() => selectedSuggestionIndex = index}
					>
						<span class="text-academia-cream">{suggestion}</span>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
	<span id="search-hint" class="sr-only">
		Enter keywords, genres, or descriptions to find books. Use arrow keys to navigate suggestions.
	</span>
</form>
