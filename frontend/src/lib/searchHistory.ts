import { browser } from '$app/environment';
import type { SearchHistoryEntry } from './types';

const STORAGE_KEY = 'whattoread_search_history';

/**
 * Get all search history entries from localStorage
 */
export function getSearchHistory(): SearchHistoryEntry[] {
	if (!browser) {
		return [];
	}

	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (!stored) {
			return [];
		}
		return JSON.parse(stored);
	} catch (e) {
		console.error('Error reading search history from localStorage:', e);
		return [];
	}
}

/**
 * Add or update a search query in history
 */
export function addSearchToHistory(query: string): void {
	if (!browser || !query.trim()) return;

	try {
		const history = getSearchHistory();
		const normalizedQuery = query.trim();
		const existingIndex = history.findIndex((entry) => entry.query === normalizedQuery);

		const now = new Date().toISOString();

		if (existingIndex >= 0) {
			// Update existing entry
			history[existingIndex].count += 1;
			history[existingIndex].lastSearched = now;
		} else {
			// Add new entry
			history.unshift({
				query: normalizedQuery,
				count: 1,
				firstSearched: now,
				lastSearched: now
			});
		}

		localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
	} catch (e) {
		console.error('Error saving search to history:', e);
	}
}

/**
 * Remove a search query from history
 */
export function removeSearchFromHistory(query: string): void {
	if (!browser) return;

	try {
		const history = getSearchHistory();
		const filtered = history.filter((entry) => entry.query !== query);
		localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
	} catch (e) {
		console.error('Error removing search from history:', e);
	}
}

/**
 * Clear all search history
 */
export function clearSearchHistory(): void {
	if (!browser) return;

	try {
		localStorage.removeItem(STORAGE_KEY);
	} catch (e) {
		console.error('Error clearing search history:', e);
	}
}

/**
 * Get just the query strings from history (for backward compatibility)
 */
export function getSearchQueries(): string[] {
	return getSearchHistory().map((entry) => entry.query);
}
