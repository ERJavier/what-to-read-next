<script lang="ts">
	import type { Book, FilterPreferences, SortOption } from '../types';

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
	<div class="flex flex-col md:flex-row gap-4 flex-wrap">
		<!-- Subject/Genre Filter -->
		<div class="flex-1 min-w-[200px]">
			<label for="subject-filter" class="block text-sm font-medium text-academia-cream mb-2">
				Filter by Genre/Subject
			</label>
			<select
				id="subject-filter"
				multiple
				class="input w-full min-h-[100px]"
				value={preferences.selectedSubjects}
				onchange={handleSubjectChange}
			>
				{#each allSubjects as subject}
					<option value={subject} selected={preferences.selectedSubjects.includes(subject)}>
						{subject}
					</option>
				{/each}
			</select>
			<p class="text-xs text-academia-cream/60 mt-1">
				Hold Ctrl/Cmd to select multiple
			</p>
		</div>

		<!-- Year Range Filter -->
		<div class="flex-1 min-w-[200px]">
			<label for="year-min" class="block text-sm font-medium text-academia-cream mb-2">
				Filter by Year
			</label>
			<div class="flex gap-2 items-center">
				<input
					id="year-min"
					type="number"
					class="input flex-1"
					placeholder="Min year"
					min={minYear || undefined}
					max={maxYear || undefined}
					value={preferences.yearRange.min || ''}
					oninput={handleYearMinChange}
				/>
				<span class="text-academia-cream/60">-</span>
				<input
					id="year-max"
					type="number"
					class="input flex-1"
					placeholder="Max year"
					min={minYear || undefined}
					max={maxYear || undefined}
					value={preferences.yearRange.max || ''}
					oninput={handleYearMaxChange}
				/>
			</div>
			{#if decades.length > 0}
				<select
					id="decade-filter"
					class="input w-full mt-2"
					value={
						preferences.yearRange.min !== null && preferences.yearRange.max !== null
							? Math.floor(preferences.yearRange.min / 10) * 10
							: ''
					}
					onchange={handleDecadeChange}
				>
					<option value="">All decades</option>
					{#each decades as decade}
						<option value={decade}>{decade}s</option>
					{/each}
				</select>
			{/if}
		</div>

		<!-- Sort Options -->
		<div class="flex-1 min-w-[200px]">
			<label for="sort-by" class="block text-sm font-medium text-academia-cream mb-2">
				Sort by
			</label>
			<div class="flex gap-2">
				<select
					id="sort-by"
					class="input flex-1"
					value={preferences.sortBy}
					onchange={handleSortChange}
				>
					<option value="similarity">Similarity</option>
					<option value="year">Year</option>
					<option value="title">Title</option>
				</select>
				<button
					class="btn btn-secondary"
					onclick={handleSortDirectionChange}
					title={preferences.sortDirection === 'asc' ? 'Ascending' : 'Descending'}
				>
					{preferences.sortDirection === 'asc' ? '↑' : '↓'}
				</button>
			</div>
		</div>
	</div>

	<!-- Active Filters Display -->
	{#if hasActiveFilters}
		<div class="mt-4 pt-4 border-t border-academia-lighter">
			<div class="flex items-center justify-between mb-2">
				<span class="text-sm font-medium text-academia-cream">Active Filters:</span>
				<button class="btn btn-secondary text-xs" onclick={clearAllFilters}>
					Clear All
				</button>
			</div>
			<div class="flex flex-wrap gap-2">
				{#each preferences.selectedSubjects as subject}
					<span class="px-2 py-1 bg-academia-accent/30 rounded text-xs text-academia-cream flex items-center gap-1">
						{subject}
						<button
							class="hover:text-academia-gold"
							onclick={() => clearSubjectFilter(subject)}
							title="Remove filter"
						>
							×
						</button>
					</span>
				{/each}
				{#if preferences.yearRange.min !== null || preferences.yearRange.max !== null}
					<span class="px-2 py-1 bg-academia-accent/30 rounded text-xs text-academia-cream flex items-center gap-1">
						Year: {preferences.yearRange.min || 'Any'} - {preferences.yearRange.max || 'Any'}
						<button
							class="hover:text-academia-gold"
							onclick={() => updatePreferences({ yearRange: { min: null, max: null } })}
							title="Remove filter"
						>
							×
						</button>
					</span>
				{/if}
				{#if preferences.sortBy !== 'similarity' || preferences.sortDirection !== 'desc'}
					<span class="px-2 py-1 bg-academia-accent/30 rounded text-xs text-academia-cream flex items-center gap-1">
						Sort: {preferences.sortBy} ({preferences.sortDirection})
						<button
							class="hover:text-academia-gold"
							onclick={() => updatePreferences({ sortBy: 'similarity', sortDirection: 'desc' })}
							title="Reset sort"
						>
							×
						</button>
					</span>
				{/if}
			</div>
		</div>
	{/if}
</div>
