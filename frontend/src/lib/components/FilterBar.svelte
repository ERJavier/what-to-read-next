<script lang="ts">
	import type { Book, FilterPreferences, SortOption } from '../types';
	import Tooltip from './Tooltip.svelte';

	interface Props {
		books: Book[];
		preferences: FilterPreferences;
		onPreferencesChange: (preferences: FilterPreferences) => void;
	}

	let { books, preferences, onPreferencesChange }: Props = $props();

	// Extract unique subjects from all books
	let allSubjects = $derived(
		Array.from(new Set(books.flatMap((book) => book.subjects || []))).sort()
	);

	// Extract year range from books
	let years = $derived(
		books
			.map((book) => book.first_publish_year)
			.filter((year): year is number => year !== null && year !== undefined)
	);
	let minYear = $derived(years.length > 0 ? Math.min(...years) : null);
	let maxYear = $derived(years.length > 0 ? Math.max(...years) : null);

	// Generate decade options
	let decades = $derived.by(() => {
		if (!minYear || !maxYear) return [];
		const startDecade = Math.floor(minYear / 10) * 10;
		const endDecade = Math.floor(maxYear / 10) * 10;
		const decadeList: number[] = [];
		for (let decade = startDecade; decade <= endDecade; decade += 10) {
			decadeList.push(decade);
		}
		return decadeList;
	});

	function updatePreferences(updates: Partial<FilterPreferences>) {
		onPreferencesChange({ ...preferences, ...updates });
	}

	function handleSubjectChange(e: Event) {
		const select = e.target as HTMLSelectElement;
		const selected = Array.from(select.selectedOptions).map((opt) => opt.value);
		updatePreferences({ selectedSubjects: selected });
	}

	function handleYearMinChange(e: Event) {
		const input = e.target as HTMLInputElement;
		const value = input.value ? parseInt(input.value, 10) : null;
		updatePreferences({
			yearRange: { ...preferences.yearRange, min: value }
		});
	}

	function handleYearMaxChange(e: Event) {
		const input = e.target as HTMLInputElement;
		const value = input.value ? parseInt(input.value, 10) : null;
		updatePreferences({
			yearRange: { ...preferences.yearRange, max: value }
		});
	}

	function handleDecadeChange(e: Event) {
		const select = e.target as HTMLSelectElement;
		if (select.value === '') {
			updatePreferences({
				yearRange: { min: null, max: null }
			});
		} else {
			const decade = parseInt(select.value, 10);
			updatePreferences({
				yearRange: { min: decade, max: decade + 9 }
			});
		}
	}

	function handleSortChange(e: Event) {
		const select = e.target as HTMLSelectElement;
		updatePreferences({ sortBy: select.value as SortOption });
	}

	function handleSortDirectionChange() {
		updatePreferences({
			sortDirection: preferences.sortDirection === 'asc' ? 'desc' : 'asc'
		});
	}

	function clearSubjectFilter(subject: string) {
		updatePreferences({
			selectedSubjects: preferences.selectedSubjects.filter((s) => s !== subject)
		});
	}

	function clearAllFilters() {
		updatePreferences({
			selectedSubjects: [],
			yearRange: { min: null, max: null },
			sortBy: 'similarity',
			sortDirection: 'desc'
		});
	}

	let hasActiveFilters = $derived(
		preferences.selectedSubjects.length > 0 ||
		preferences.yearRange.min !== null ||
		preferences.yearRange.max !== null ||
		preferences.sortBy !== 'similarity' ||
		preferences.sortDirection !== 'desc'
	);
</script>

<div class="card mb-6">
	<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
		<!-- Subject/Genre Filter Group -->
		<div class="flex flex-col">
			<div class="flex items-center gap-2 mb-2">
				<label for="subject-filter" class="block text-sm font-medium text-academia-cream">
					Filter by Genre/Subject
				</label>
				<Tooltip text="Select one or more genres/subjects to filter books. Hold Ctrl (or Cmd on Mac) to select multiple options." position="top">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-academia-cream/50 hover:text-academia-gold transition-colors cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-label="Help">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
				</Tooltip>
			</div>
			<select
				id="subject-filter"
				multiple
				class="input w-full min-h-[100px]"
				value={preferences.selectedSubjects}
				onchange={handleSubjectChange}
				aria-label="Filter by genre or subject. Hold Ctrl or Cmd to select multiple options"
				aria-describedby="subject-filter-hint"
			>
				{#each allSubjects as subject}
					<option value={subject} selected={preferences.selectedSubjects.includes(subject)}>
						{subject}
					</option>
				{/each}
			</select>
			<p id="subject-filter-hint" class="text-xs text-academia-cream/60 mt-1">
				Hold Ctrl/Cmd to select multiple
			</p>
		</div>

		<!-- Year Range Filter Group -->
		<div class="flex flex-col">
			<div class="flex items-center gap-2 mb-2">
				<label for="year-min" class="block text-sm font-medium text-academia-cream">
					Filter by Publication Year
				</label>
				<Tooltip text="Filter books by their publication year. You can set a minimum and maximum year, or use the decade dropdown for quick selection." position="top">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-academia-cream/50 hover:text-academia-gold transition-colors cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-label="Help">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
				</Tooltip>
			</div>
			<div class="flex gap-2 items-center mb-2">
				<label for="year-min" class="sr-only">Minimum publication year</label>
				<input
					id="year-min"
					type="number"
					class="input flex-1"
					placeholder="Min"
					min={minYear || undefined}
					max={maxYear || undefined}
					value={preferences.yearRange.min || ''}
					oninput={handleYearMinChange}
					aria-label="Minimum publication year"
				/>
				<span class="text-academia-cream/60" aria-hidden="true">-</span>
				<label for="year-max" class="sr-only">Maximum publication year</label>
				<input
					id="year-max"
					type="number"
					class="input flex-1"
					placeholder="Max"
					min={minYear || undefined}
					max={maxYear || undefined}
					value={preferences.yearRange.max || ''}
					oninput={handleYearMaxChange}
					aria-label="Maximum publication year"
				/>
			</div>
			{#if decades.length > 0}
				<select
					id="decade-filter"
					class="input w-full"
					value={
						preferences.yearRange.min !== null && preferences.yearRange.max !== null
							? Math.floor(preferences.yearRange.min / 10) * 10
							: ''
					}
					onchange={handleDecadeChange}
					aria-label="Filter by decade"
				>
					<option value="">All decades</option>
					{#each decades as decade}
						<option value={decade}>{decade}s</option>
					{/each}
				</select>
			{/if}
		</div>

		<!-- Sort Options Group -->
		<div class="flex flex-col">
			<div class="flex items-center gap-2 mb-2">
				<label for="sort-by" class="block text-sm font-medium text-academia-cream">
					Sort Results
				</label>
				<Tooltip text="Choose how to sort the search results. Similarity sorts by match score, Year sorts by publication year, and Title sorts alphabetically." position="top">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-academia-cream/50 hover:text-academia-gold transition-colors cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-label="Help">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
				</Tooltip>
			</div>
			<div class="flex gap-2">
				<select
					id="sort-by"
					class="input flex-1"
					value={preferences.sortBy}
					onchange={handleSortChange}
					aria-label="Sort books by"
				>
					<option value="similarity">Similarity</option>
					<option value="year">Year</option>
					<option value="title">Title</option>
				</select>
				<Tooltip text={preferences.sortDirection === 'asc' ? 'Currently ascending. Click to sort descending.' : 'Currently descending. Click to sort ascending.'} position="top">
					<button
						class="btn btn-secondary min-w-[3rem]"
						onclick={handleSortDirectionChange}
						aria-label={preferences.sortDirection === 'asc' ? 'Change to descending sort order' : 'Change to ascending sort order'}
						aria-pressed={preferences.sortDirection === 'desc'}
					>
						<span aria-hidden="true">{preferences.sortDirection === 'asc' ? '↑' : '↓'}</span>
					</button>
				</Tooltip>
			</div>
		</div>
	</div>

	<!-- Active Filters Display -->
	{#if hasActiveFilters}
		<div class="mt-4 pt-4 border-t border-academia-lighter">
			<div class="flex items-center justify-between mb-2">
				<span class="text-sm font-medium text-academia-cream">Active Filters:</span>
				<button 
					class="btn btn-secondary text-xs" 
					onclick={clearAllFilters}
					aria-label="Clear all active filters"
				>
					Clear All
				</button>
			</div>
			<div class="flex flex-wrap gap-2" role="list" aria-label="Active filters">
				{#each preferences.selectedSubjects as subject}
					<span class="px-2 py-1 bg-academia-accent/30 rounded text-xs text-academia-cream flex items-center gap-1" role="listitem">
						{subject}
						<button
							class="hover:text-academia-gold focus:outline-2 focus:outline-offset-1 focus:outline-academia-gold"
							onclick={() => clearSubjectFilter(subject)}
							aria-label="Remove {subject} filter"
						>
							<span aria-hidden="true">×</span>
						</button>
					</span>
				{/each}
				{#if preferences.yearRange.min !== null || preferences.yearRange.max !== null}
					<span class="px-2 py-1 bg-academia-accent/30 rounded text-xs text-academia-cream flex items-center gap-1" role="listitem">
						Year: {preferences.yearRange.min || 'Any'} - {preferences.yearRange.max || 'Any'}
						<button
							class="hover:text-academia-gold focus:outline-2 focus:outline-offset-1 focus:outline-academia-gold"
							onclick={() => updatePreferences({ yearRange: { min: null, max: null } })}
							aria-label="Remove year filter"
						>
							<span aria-hidden="true">×</span>
						</button>
					</span>
				{/if}
				{#if preferences.sortBy !== 'similarity' || preferences.sortDirection !== 'desc'}
					<span class="px-2 py-1 bg-academia-accent/30 rounded text-xs text-academia-cream flex items-center gap-1" role="listitem">
						Sort: {preferences.sortBy} ({preferences.sortDirection})
						<button
							class="hover:text-academia-gold focus:outline-2 focus:outline-offset-1 focus:outline-academia-gold"
							onclick={() => updatePreferences({ sortBy: 'similarity', sortDirection: 'desc' })}
							aria-label="Reset sort to default"
						>
							<span aria-hidden="true">×</span>
						</button>
					</span>
				{/if}
			</div>
		</div>
	{/if}
</div>
