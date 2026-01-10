import { browser } from '$app/environment';
import type { Book } from './types';

const STORAGE_KEY = 'whattoread_recently_viewed';
const MAX_RECENT_ITEMS = 20;

export interface RecentlyViewedBook {
	book: Book;
	viewedAt: string; // ISO timestamp
}

/**
 * Get all recently viewed books from localStorage
 */
export function getRecentlyViewedBooks(): RecentlyViewedBook[] {
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
		console.error('Error reading recently viewed books from localStorage:', e);
		return [];
	}
}

/**
 * Add a book to recently viewed (or update its timestamp if already exists)
 */
export function addToRecentlyViewed(book: Book): void {
	if (!browser) return;

	try {
		let recent = getRecentlyViewedBooks();
		const now = new Date().toISOString();
		
		// Remove the book if it already exists
		recent = recent.filter(item => item.book.id !== book.id);
		
		// Add to the beginning
		recent.unshift({
			book,
			viewedAt: now
		});
		
		// Keep only the most recent items
		recent = recent.slice(0, MAX_RECENT_ITEMS);
		
		localStorage.setItem(STORAGE_KEY, JSON.stringify(recent));
	} catch (e) {
		console.error('Error saving to recently viewed:', e);
	}
}

/**
 * Remove a book from recently viewed
 */
export function removeFromRecentlyViewed(bookId: number): void {
	if (!browser) return;

	try {
		const recent = getRecentlyViewedBooks().filter(item => item.book.id !== bookId);
		localStorage.setItem(STORAGE_KEY, JSON.stringify(recent));
	} catch (e) {
		console.error('Error removing from recently viewed:', e);
	}
}

/**
 * Clear all recently viewed books
 */
export function clearRecentlyViewed(): void {
	if (!browser) return;

	try {
		localStorage.removeItem(STORAGE_KEY);
	} catch (e) {
		console.error('Error clearing recently viewed:', e);
	}
}
