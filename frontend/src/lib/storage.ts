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

/**
 * Export saved books as JSON
 */
export function exportSavedBooksAsJSON(): string {
	const saved = getSavedBooksAsArrays();
	const exportData = {
		exportDate: new Date().toISOString(),
		version: '1.0',
		interested: saved.interested,
		not_interested: saved.not_interested,
		summary: {
			totalInterested: saved.interested.length,
			totalNotInterested: saved.not_interested.length,
			totalBooks: saved.interested.length + saved.not_interested.length
		}
	};
	return JSON.stringify(exportData, null, 2);
}

/**
 * Export saved books as CSV
 */
export function exportSavedBooksAsCSV(): string {
	const saved = getSavedBooksAsArrays();
	const headers = ['Status', 'Title', 'Authors', 'Year', 'Subjects', 'Open Library Key', 'Saved Date'];
	const rows: string[][] = [headers];

	// Helper to escape CSV fields
	const escapeCSV = (value: string | number | null | undefined): string => {
		if (value === null || value === undefined) return '';
		const str = String(value);
		if (str.includes(',') || str.includes('"') || str.includes('\n')) {
			return `"${str.replace(/"/g, '""')}"`;
		}
		return str;
	};

	// Add interested books
	saved.interested.forEach((sb) => {
		rows.push([
			'Interested',
			escapeCSV(sb.book.title),
			escapeCSV(sb.book.authors?.join('; ') || ''),
			escapeCSV(sb.book.first_publish_year?.toString() || ''),
			escapeCSV(sb.book.subjects?.join('; ') || ''),
			escapeCSV(sb.book.ol_key),
			escapeCSV(new Date(sb.savedAt).toLocaleDateString())
		]);
	});

	// Add not interested books
	saved.not_interested.forEach((sb) => {
		rows.push([
			'Not Interested',
			escapeCSV(sb.book.title),
			escapeCSV(sb.book.authors?.join('; ') || ''),
			escapeCSV(sb.book.first_publish_year?.toString() || ''),
			escapeCSV(sb.book.subjects?.join('; ') || ''),
			escapeCSV(sb.book.ol_key),
			escapeCSV(new Date(sb.savedAt).toLocaleDateString())
		]);
	});

	return rows.map((row) => row.join(',')).join('\n');
}

/**
 * Print saved books (opens print dialog)
 */
export function printSavedBooks(): void {
	if (!browser) return;

	const saved = getSavedBooksAsArrays();
	const printWindow = window.open('', '_blank');
	if (!printWindow) return;

	const html = `
		<!DOCTYPE html>
		<html>
		<head>
			<title>Saved Books - WhatToRead</title>
			<style>
				body {
					font-family: 'Georgia', serif;
					padding: 2rem;
					color: #333;
					background: white;
				}
				h1 {
					color: #1a1a1a;
					border-bottom: 2px solid #d4af37;
					padding-bottom: 0.5rem;
					margin-bottom: 2rem;
				}
				h2 {
					color: #2d2d2d;
					margin-top: 2rem;
					margin-bottom: 1rem;
				}
				.book {
					margin-bottom: 1.5rem;
					padding: 1rem;
					border-left: 3px solid #d4af37;
					background: #f9f9f9;
				}
				.book-title {
					font-weight: bold;
					font-size: 1.1em;
					margin-bottom: 0.5rem;
				}
				.book-meta {
					font-size: 0.9em;
					color: #666;
					margin: 0.25rem 0;
				}
				.book-subjects {
					margin-top: 0.5rem;
					font-size: 0.85em;
					color: #888;
				}
				.summary {
					margin-top: 2rem;
					padding: 1rem;
					background: #f0f0f0;
					border-radius: 4px;
				}
				@media print {
					@page {
						margin: 1.5cm;
					}
					.no-print {
						display: none;
					}
				}
			</style>
		</head>
		<body>
			<h1>Saved Books - WhatToRead</h1>
			<div class="summary">
				<strong>Summary:</strong> ${saved.interested.length + saved.not_interested.length} total books 
				(${saved.interested.length} interested, ${saved.not_interested.length} not interested)
				<br>
				<strong>Exported:</strong> ${new Date().toLocaleString()}
			</div>

			<h2>Interested Books (${saved.interested.length})</h2>
			${saved.interested.map((sb) => `
				<div class="book">
					<div class="book-title">${sb.book.title}</div>
					<div class="book-meta"><strong>Authors:</strong> ${sb.book.authors?.join(', ') || 'Unknown'}</div>
					${sb.book.first_publish_year ? `<div class="book-meta"><strong>Year:</strong> ${sb.book.first_publish_year}</div>` : ''}
					${sb.book.subjects && sb.book.subjects.length > 0 ? `<div class="book-subjects"><strong>Subjects:</strong> ${sb.book.subjects.join(', ')}</div>` : ''}
					<div class="book-meta"><strong>Saved:</strong> ${new Date(sb.savedAt).toLocaleDateString()}</div>
				</div>
			`).join('')}

			<h2>Not Interested Books (${saved.not_interested.length})</h2>
			${saved.not_interested.map((sb) => `
				<div class="book">
					<div class="book-title">${sb.book.title}</div>
					<div class="book-meta"><strong>Authors:</strong> ${sb.book.authors?.join(', ') || 'Unknown'}</div>
					${sb.book.first_publish_year ? `<div class="book-meta"><strong>Year:</strong> ${sb.book.first_publish_year}</div>` : ''}
					${sb.book.subjects && sb.book.subjects.length > 0 ? `<div class="book-subjects"><strong>Subjects:</strong> ${sb.book.subjects.join(', ')}</div>` : ''}
					<div class="book-meta"><strong>Saved:</strong> ${new Date(sb.savedAt).toLocaleDateString()}</div>
				</div>
			`).join('')}
		</body>
		</html>
	`;

	printWindow.document.write(html);
	printWindow.document.close();
	printWindow.focus();
	setTimeout(() => {
		printWindow.print();
		printWindow.close();
	}, 250);
}
