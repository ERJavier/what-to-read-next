export interface Book {
	id: number;
	ol_key: string;
	title: string;
	authors: string[];
	first_publish_year: number | null;
	subjects: string[];
	similarity?: number;
	search_content?: string;
}

export interface BookDetail extends Book {
	search_content: string;
}

export interface RecommendationRequest {
	query: string;
	limit?: number;
}

export interface HealthResponse {
	status: string;
	service: string;
	version: string;
}

export type SavedBookStatus = 'interested' | 'not_interested';

export interface SavedBook {
	book: Book;
	status: SavedBookStatus;
	savedAt: string; // ISO timestamp
}

export interface SavedBooksData {
	interested: SavedBook[];
	not_interested: SavedBook[];
}

export interface SearchHistoryEntry {
	query: string;
	count: number;
	firstSearched: string; // ISO timestamp
	lastSearched: string; // ISO timestamp
}
