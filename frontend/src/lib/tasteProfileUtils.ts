import type { SearchHistoryEntry, SavedBook, Book } from './types';
import { getSavedBooksAsArrays } from './storage';
import { getSearchHistory } from './searchHistory';

export interface TasteProfileStats {
	totalSearches: number;
	uniqueQueries: number;
	totalBooksSaved: number;
	interestedBooks: number;
	notInterestedBooks: number;
	favoriteGenres: Array<{ genre: string; count: number }>;
	favoriteAuthors: Array<{ author: string; count: number }>;
	yearDistribution: Array<{ year: number; count: number }>;
	mostSearchedQueries: Array<{ query: string; count: number }>;
}

export interface TasteProfileInsight {
	type: 'genre' | 'author' | 'year' | 'trend' | 'recommendation';
	title: string;
	message: string;
	actionable?: boolean;
}

/**
 * Calculate taste profile statistics from search history and saved books
 */
export function calculateTasteProfileStats(): TasteProfileStats {
	const history = getSearchHistory();
	const savedBooks = getSavedBooksAsArrays();
	const allSavedBooks = [...savedBooks.interested, ...savedBooks.not_interested];

	// Genre frequency
	const genreMap = new Map<string, number>();
	const authorMap = new Map<string, number>();
	const yearMap = new Map<number, number>();

	allSavedBooks.forEach((savedBook) => {
		const book = savedBook.book;

		// Count genres/subjects
		book.subjects?.forEach((subject) => {
			genreMap.set(subject, (genreMap.get(subject) || 0) + 1);
		});

		// Count authors
		book.authors?.forEach((author) => {
			authorMap.set(author, (authorMap.get(author) || 0) + 1);
		});

		// Count years (group by decade for better visualization)
		if (book.first_publish_year) {
			const decade = Math.floor(book.first_publish_year / 10) * 10;
			yearMap.set(decade, (yearMap.get(decade) || 0) + 1);
		}
	});

	// Convert maps to sorted arrays
	const favoriteGenres = Array.from(genreMap.entries())
		.map(([genre, count]) => ({ genre, count }))
		.sort((a, b) => b.count - a.count);

	const favoriteAuthors = Array.from(authorMap.entries())
		.map(([author, count]) => ({ author, count }))
		.sort((a, b) => b.count - a.count);

	const yearDistribution = Array.from(yearMap.entries())
		.map(([year, count]) => ({ year, count }))
		.sort((a, b) => a.year - b.year);

	const mostSearchedQueries = history
		.map((entry) => ({ query: entry.query, count: entry.count }))
		.sort((a, b) => b.count - a.count)
		.slice(0, 10);

	return {
		totalSearches: history.reduce((sum, entry) => sum + entry.count, 0),
		uniqueQueries: history.length,
		totalBooksSaved: allSavedBooks.length,
		interestedBooks: savedBooks.interested.length,
		notInterestedBooks: savedBooks.not_interested.length,
		favoriteGenres,
		favoriteAuthors,
		yearDistribution,
		mostSearchedQueries
	};
}

/**
 * Generate insights based on taste profile data
 */
export function generateInsights(stats: TasteProfileStats): TasteProfileInsight[] {
	const insights: TasteProfileInsight[] = [];

	// Genre insights
	if (stats.favoriteGenres.length > 0) {
		const topGenre = stats.favoriteGenres[0];
		insights.push({
			type: 'genre',
			title: 'Favorite Genre',
			message: `You're most drawn to ${topGenre.genre} books (appears in ${topGenre.count} saved book${topGenre.count !== 1 ? 's' : ''}).`,
			actionable: true
		});
	}

	// Author insights
	if (stats.favoriteAuthors.length > 0) {
		const topAuthor = stats.favoriteAuthors[0];
		insights.push({
			type: 'author',
			title: 'Favorite Author',
			message: `You've saved ${topAuthor.count} book${topAuthor.count !== 1 ? 's' : ''} by ${topAuthor.author}.`,
			actionable: true
		});
	}

	// Search activity insights
	if (stats.totalSearches > 10) {
		insights.push({
			type: 'trend',
			title: 'Active Explorer',
			message: `You've made ${stats.totalSearches} searches! Your reading preferences are clearly defined.`,
			actionable: false
		});
	}

	// Book saving insights
	if (stats.interestedBooks > 5) {
		insights.push({
			type: 'recommendation',
			title: 'Reading List',
			message: `You have ${stats.interestedBooks} books on your reading list. Time to start reading!`,
			actionable: true
		});
	}

	// Year preference insights
	if (stats.yearDistribution.length > 0) {
		const topDecade = stats.yearDistribution.reduce((max, current) =>
			current.count > max.count ? current : max
		);
		insights.push({
			type: 'year',
			title: 'Era Preference',
			message: `You prefer books from the ${topDecade.year}s (${topDecade.count} saved book${topDecade.count !== 1 ? 's' : ''}).`,
			actionable: false
		});
	}

	// Balance insights
	if (stats.interestedBooks > 0 && stats.notInterestedBooks > 0) {
		const ratio = stats.interestedBooks / (stats.interestedBooks + stats.notInterestedBooks);
		if (ratio > 0.7) {
			insights.push({
				type: 'trend',
				title: 'Selective Reader',
				message: `You're quite selective! You've liked ${Math.round(ratio * 100)}% of the books you've reviewed.`,
				actionable: false
			});
		}
	}

	// First time user
	if (stats.totalSearches === 0 && stats.totalBooksSaved === 0) {
		insights.push({
			type: 'recommendation',
			title: 'Get Started',
			message: 'Start searching and saving books to build your personalized taste profile!',
			actionable: true
		});
	}

	return insights;
}

/**
 * Generate recommendation queries based on taste profile
 */
export function generateRecommendationQueries(stats: TasteProfileStats): string[] {
	const queries: string[] = [];

	// Use top genres
	if (stats.favoriteGenres.length > 0) {
		const topGenres = stats.favoriteGenres.slice(0, 3).map((g) => g.genre);
		queries.push(topGenres.join(' '));
	}

	// Use top authors
	if (stats.favoriteAuthors.length > 0) {
		stats.favoriteAuthors.slice(0, 2).forEach((author) => {
			queries.push(`books by ${author.author}`);
		});
	}

	// Use most searched queries
	stats.mostSearchedQueries.slice(0, 2).forEach((query) => {
		queries.push(query.query);
	});

	return queries.filter((q) => q.trim().length > 0);
}

/**
 * Export taste profile data as JSON
 */
export function exportAsJSON(stats: TasteProfileStats, insights: TasteProfileInsight[]): string {
	const history = getSearchHistory();
	const savedBooks = getSavedBooksAsArrays();

	const exportData = {
		exportedAt: new Date().toISOString(),
		version: '1.0',
		statistics: stats,
		insights,
		searchHistory: history,
		savedBooks: {
			interested: savedBooks.interested.map((sb) => ({
				book: {
					id: sb.book.id,
					title: sb.book.title,
					authors: sb.book.authors,
					subjects: sb.book.subjects,
					first_publish_year: sb.book.first_publish_year
				},
				savedAt: sb.savedAt
			})),
			notInterested: savedBooks.not_interested.map((sb) => ({
				book: {
					id: sb.book.id,
					title: sb.book.title,
					authors: sb.book.authors,
					subjects: sb.book.subjects,
					first_publish_year: sb.book.first_publish_year
				},
				savedAt: sb.savedAt
			}))
		}
	};

	return JSON.stringify(exportData, null, 2);
}

/**
 * Export taste profile data as CSV
 */
export function exportAsCSV(stats: TasteProfileStats): string {
	const history = getSearchHistory();
	const savedBooks = getSavedBooksAsArrays();
	const allSavedBooks = [...savedBooks.interested, ...savedBooks.not_interested];

	let csv = 'WhatToRead Taste Profile Export\n';
	csv += `Exported: ${new Date().toISOString()}\n\n`;

	// Statistics
	csv += 'Statistics\n';
	csv += 'Metric,Value\n';
	csv += `Total Searches,${stats.totalSearches}\n`;
	csv += `Unique Queries,${stats.uniqueQueries}\n`;
	csv += `Total Books Saved,${stats.totalBooksSaved}\n`;
	csv += `Interested Books,${stats.interestedBooks}\n`;
	csv += `Not Interested Books,${stats.notInterestedBooks}\n\n`;

	// Search History
	csv += 'Search History\n';
	csv += 'Query,Count,First Searched,Last Searched\n';
	history.forEach((entry) => {
		csv += `"${entry.query}",${entry.count},"${entry.firstSearched}","${entry.lastSearched}"\n`;
	});
	csv += '\n';

	// Saved Books
	csv += 'Saved Books\n';
	csv += 'Status,Title,Authors,Subjects,Year,Saved At\n';
	allSavedBooks.forEach((savedBook) => {
		const authors = savedBook.book.authors?.join('; ') || '';
		const subjects = savedBook.book.subjects?.join('; ') || '';
		csv += `"${savedBook.status}","${savedBook.book.title}","${authors}","${subjects}",${savedBook.book.first_publish_year || ''},"${savedBook.savedAt}"\n`;
	});
	csv += '\n';

	// Favorite Genres
	csv += 'Favorite Genres\n';
	csv += 'Genre,Count\n';
	stats.favoriteGenres.forEach((genre) => {
		csv += `"${genre.genre}",${genre.count}\n`;
	});
	csv += '\n';

	// Favorite Authors
	csv += 'Favorite Authors\n';
	csv += 'Author,Count\n';
	stats.favoriteAuthors.forEach((author) => {
		csv += `"${author.author}",${author.count}\n`;
	});

	return csv;
}
