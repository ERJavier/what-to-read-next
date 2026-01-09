import { browser } from '$app/environment';
import type { Book, SavedBook, SavedBookStatus } from './types';

const STORAGE_KEY = 'whattoread_saved_books';

interface SavedBooksStorage {
	interested: Record<number, SavedBook>;
	not_interested: Record<number, SavedBook>;
}

/**
 * Get all saved books from localStorage
 */
export function getSavedBooks(): SavedBooksStorage {
	if (!browser) {
		return { interested: {}, not_interested: {} };
	}

	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (!stored) {
			return { interested: {}, not_interested: {} };
		}
		return JSON.parse(stored);
	} catch (e) {
		console.error('Error reading saved books from localStorage:', e);
		return { interested: {}, not_interested: {} };
	}
}

/**
 * Save a book with a status (interested/not_interested)
 */
export function saveBook(book: Book, status: SavedBookStatus): void {
	if (!browser) return;

	try {
		const saved = getSavedBooks();
		const savedBook: SavedBook = {
			book,
			status,
			savedAt: new Date().toISOString()
		};

		// Remove from other status if exists
		delete saved.interested[book.id];
		delete saved.not_interested[book.id];

		// Add to correct status
		saved[status][book.id] = savedBook;

		localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
	} catch (e) {
		console.error('Error saving book to localStorage:', e);
	}
}

/**
 * Remove a book from saved books
 */
export function removeSavedBook(bookId: number): void {
	if (!browser) return;

	try {
		const saved = getSavedBooks();
		delete saved.interested[bookId];
		delete saved.not_interested[bookId];
		localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
	} catch (e) {
		console.error('Error removing book from localStorage:', e);
	}
}

/**
 * Get saved books as arrays
 */
export function getSavedBooksAsArrays(): {
	interested: SavedBook[];
	not_interested: SavedBook[];
} {
	const saved = getSavedBooks();
	return {
		interested: Object.values(saved.interested),
		not_interested: Object.values(saved.not_interested)
	};
}

/**
 * Check if a book is saved and get its status
 */
export function getBookStatus(bookId: number): SavedBookStatus | null {
	const saved = getSavedBooks();
	if (saved.interested[bookId]) return 'interested';
	if (saved.not_interested[bookId]) return 'not_interested';
	return null;
}

/**
 * Check if a book is saved (regardless of status)
 */
export function isBookSaved(bookId: number): boolean {
	return getBookStatus(bookId) !== null;
}

/**
 * Clear all saved books
 */
export function clearAllSavedBooks(): void {
	if (!browser) return;

	try {
		localStorage.removeItem(STORAGE_KEY);
	} catch (e) {
		console.error('Error clearing saved books from localStorage:', e);
	}
}
