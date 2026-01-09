import type { Book, BookDetail, RecommendationRequest, HealthResponse } from './types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export async function getHealth(): Promise<HealthResponse> {
	const response = await fetch(`${API_BASE_URL}/health`);
	if (!response.ok) {
		throw new Error('Health check failed');
	}
	return response.json();
}

export async function getRecommendations(request: RecommendationRequest): Promise<Book[]> {
	const response = await fetch(`${API_BASE_URL}/recommend`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			query: request.query,
			limit: request.limit || 10
		})
	});

	if (!response.ok) {
		const error = await response.json().catch(() => ({ detail: 'Failed to get recommendations' }));
		throw new Error(error.detail || 'Failed to get recommendations');
	}

	return response.json();
}

export async function getBookDetail(bookId: number): Promise<BookDetail> {
	const response = await fetch(`${API_BASE_URL}/books/${bookId}`);
	
	if (!response.ok) {
		if (response.status === 404) {
			throw new Error('Book not found');
		}
		throw new Error('Failed to fetch book details');
	}

	return response.json();
}
