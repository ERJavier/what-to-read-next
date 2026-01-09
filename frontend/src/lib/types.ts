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
