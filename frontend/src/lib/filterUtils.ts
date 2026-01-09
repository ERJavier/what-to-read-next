import type { Book, FilterPreferences } from './types';

/**
 * Filter books based on preferences
 */
export function filterBooks(books: Book[], preferences: FilterPreferences): Book[] {
	let filtered = [...books];

	// Filter by subjects
	if (preferences.selectedSubjects.length > 0) {
		filtered = filtered.filter((book) =>
			preferences.selectedSubjects.some((subject) =>
				book.subjects?.includes(subject)
			)
		);
	}

	// Filter by year range
	if (preferences.yearRange.min !== null) {
		filtered = filtered.filter(
			(book) =>
				book.first_publish_year !== null &&
				book.first_publish_year >= preferences.yearRange.min!
		);
	}

	if (preferences.yearRange.max !== null) {
		filtered = filtered.filter(
			(book) =>
				book.first_publish_year !== null &&
				book.first_publish_year <= preferences.yearRange.max!
		);
	}

	return filtered;
}

/**
 * Sort books based on preferences
 */
export function sortBooks(books: Book[], preferences: FilterPreferences): Book[] {
	const sorted = [...books];

	sorted.sort((a, b) => {
		let comparison = 0;

		switch (preferences.sortBy) {
			case 'similarity':
				// Sort by similarity score (higher is better)
				const aSim = a.similarity ?? 0;
				const bSim = b.similarity ?? 0;
				comparison = aSim - bSim;
				break;

			case 'year':
				// Sort by publication year
				const aYear = a.first_publish_year ?? 0;
				const bYear = b.first_publish_year ?? 0;
				comparison = aYear - bYear;
				break;

			case 'title':
				// Sort alphabetically by title
				comparison = a.title.localeCompare(b.title);
				break;
		}

		// Apply sort direction
		return preferences.sortDirection === 'asc' ? comparison : -comparison;
	});

	return sorted;
}

/**
 * Apply both filtering and sorting to books
 */
export function applyFiltersAndSort(
	books: Book[],
	preferences: FilterPreferences
): Book[] {
	const filtered = filterBooks(books, preferences);
	return sortBooks(filtered, preferences);
}
