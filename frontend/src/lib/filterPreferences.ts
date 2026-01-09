import { browser } from '$app/environment';
import type { FilterPreferences } from './types';

const STORAGE_KEY = 'whattoread_filter_preferences';

const DEFAULT_PREFERENCES: FilterPreferences = {
	selectedSubjects: [],
	yearRange: {
		min: null,
		max: null
	},
	sortBy: 'similarity',
	sortDirection: 'desc'
};

/**
 * Get filter preferences from localStorage
 */
export function getFilterPreferences(): FilterPreferences {
	if (!browser) {
		return DEFAULT_PREFERENCES;
	}

	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (!stored) {
			return DEFAULT_PREFERENCES;
		}
		return JSON.parse(stored);
	} catch (e) {
		console.error('Error reading filter preferences from localStorage:', e);
		return DEFAULT_PREFERENCES;
	}
}

/**
 * Save filter preferences to localStorage
 */
export function saveFilterPreferences(preferences: FilterPreferences): void {
	if (!browser) return;

	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
	} catch (e) {
		console.error('Error saving filter preferences to localStorage:', e);
	}
}

/**
 * Clear filter preferences (reset to defaults)
 */
export function clearFilterPreferences(): void {
	if (!browser) return;

	try {
		localStorage.removeItem(STORAGE_KEY);
	} catch (e) {
		console.error('Error clearing filter preferences from localStorage:', e);
	}
}
