import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getHealth, getRecommendations, getBookDetail, clearCache } from './api';
import { apiCache } from './cache';
import type { Book, BookDetail, RecommendationRequest, HealthResponse } from './types';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock environment variable
vi.stubEnv('VITE_API_URL', 'http://localhost:8000');

describe('API Integration Tests', () => {
	beforeEach(() => {
		// Clear all mocks and cache before each test
		mockFetch.mockClear();
		clearCache();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('getHealth', () => {
		it('should fetch health status successfully', async () => {
			const mockResponse: HealthResponse = {
				status: 'ok',
				service: 'whattoread-api',
				version: '1.0.0'
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => mockResponse
			});

			const result = await getHealth();

			expect(mockFetch).toHaveBeenCalledTimes(1);
			expect(mockFetch).toHaveBeenCalledWith('http://localhost:8000/health');
			expect(result).toEqual(mockResponse);
		});

		it('should throw error when health check fails', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 500,
				statusText: 'Internal Server Error'
			});

			await expect(getHealth()).rejects.toThrow('Health check failed');
		});

		it('should cache health response', async () => {
			const mockResponse: HealthResponse = {
				status: 'ok',
				service: 'whattoread-api',
				version: '1.0.0'
			};

			mockFetch.mockResolvedValue({
				ok: true,
				json: async () => mockResponse
			});

			// First call - should fetch from API
			const result1 = await getHealth();
			expect(mockFetch).toHaveBeenCalledTimes(1);
			expect(result1).toEqual(mockResponse);

			// Second call - should use cache
			const result2 = await getHealth();
			expect(mockFetch).toHaveBeenCalledTimes(1); // Still 1, not 2
			expect(result2).toEqual(mockResponse);
		});

		it('should handle network errors', async () => {
			mockFetch.mockRejectedValueOnce(new Error('Network error'));

			await expect(getHealth()).rejects.toThrow('Network error');
		});
	});

	describe('getRecommendations', () => {
		const mockBooks: Book[] = [
			{
				id: 1,
				ol_key: '/works/OL123456W',
				title: 'Gone Girl',
				authors: ['Gillian Flynn'],
				first_publish_year: 2012,
				subjects: ['Fiction', 'Thrillers', 'Psychological'],
				similarity: 0.85
			},
			{
				id: 2,
				ol_key: '/works/OL789012W',
				title: 'The Girl on the Train',
				authors: ['Paula Hawkins'],
				first_publish_year: 2015,
				subjects: ['Fiction', 'Mystery', 'Thrillers'],
				similarity: 0.82
			}
		];

		it('should fetch recommendations successfully', async () => {
			const request: RecommendationRequest = {
				query: 'dark psychological thrillers',
				limit: 10
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => mockBooks
			});

			const result = await getRecommendations(request);

			expect(mockFetch).toHaveBeenCalledTimes(1);
			expect(mockFetch).toHaveBeenCalledWith('http://localhost:8000/recommend', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					query: 'dark psychological thrillers',
					limit: 10
				})
			});
			expect(result).toEqual(mockBooks);
		});

		it('should use default limit when not provided', async () => {
			const request: RecommendationRequest = {
				query: 'science fiction'
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => mockBooks.slice(0, 1)
			});

			await getRecommendations(request);

			expect(mockFetch).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					body: JSON.stringify({
						query: 'science fiction',
						limit: 10
					})
				})
			);
		});

		it('should cache recommendations', async () => {
			const request: RecommendationRequest = {
				query: 'fantasy novels',
				limit: 5
			};

			mockFetch.mockResolvedValue({
				ok: true,
				json: async () => mockBooks
			});

			// First call
			const result1 = await getRecommendations(request);
			expect(mockFetch).toHaveBeenCalledTimes(1);

			// Second call with same params - should use cache
			const result2 = await getRecommendations(request);
			expect(mockFetch).toHaveBeenCalledTimes(1);
			expect(result2).toEqual(result1);
		});

		it('should not cache different queries', async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				json: async () => mockBooks
			});

			await getRecommendations({ query: 'thrillers', limit: 10 });
			await getRecommendations({ query: 'sci-fi', limit: 10 });

			expect(mockFetch).toHaveBeenCalledTimes(2);
		});

		it('should handle API error responses', async () => {
			const request: RecommendationRequest = {
				query: 'invalid query',
				limit: 10
			};

			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 422,
				json: async () => ({ detail: 'Validation error: query too short' })
			});

			await expect(getRecommendations(request)).rejects.toThrow('Validation error: query too short');
		});

		it('should handle API error without detail field', async () => {
			const request: RecommendationRequest = {
				query: 'test query',
				limit: 10
			};

			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 500,
				json: async () => ({ message: 'Internal server error' })
			});

			await expect(getRecommendations(request)).rejects.toThrow('Failed to get recommendations');
		});

		it('should handle network errors', async () => {
			const request: RecommendationRequest = {
				query: 'test query',
				limit: 10
			};

			mockFetch.mockRejectedValueOnce(new Error('Failed to fetch'));

			await expect(getRecommendations(request)).rejects.toThrow('Failed to fetch');
		});

		it('should handle invalid JSON response', async () => {
			const request: RecommendationRequest = {
				query: 'test query',
				limit: 10
			};

			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 500,
				json: async () => {
					throw new Error('Invalid JSON');
				}
			});

			await expect(getRecommendations(request)).rejects.toThrow('Failed to get recommendations');
		});
	});

	describe('getBookDetail', () => {
		const mockBookDetail: BookDetail = {
			id: 1,
			ol_key: '/works/OL123456W',
			title: 'Gone Girl',
			authors: ['Gillian Flynn'],
			first_publish_year: 2012,
			subjects: ['Fiction', 'Thrillers', 'Psychological'],
			search_content: 'Gone Girl. Fiction Thrillers Psychological'
		};

		it('should fetch book detail successfully', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => mockBookDetail
			});

			const result = await getBookDetail(1);

			expect(mockFetch).toHaveBeenCalledTimes(1);
			expect(mockFetch).toHaveBeenCalledWith('http://localhost:8000/books/1');
			expect(result).toEqual(mockBookDetail);
		});

		it('should cache book details', async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				json: async () => mockBookDetail
			});

			// First call
			const result1 = await getBookDetail(1);
			expect(mockFetch).toHaveBeenCalledTimes(1);

			// Second call - should use cache
			const result2 = await getBookDetail(1);
			expect(mockFetch).toHaveBeenCalledTimes(1);
			expect(result2).toEqual(result1);
		});

		it('should handle 404 not found error', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 404,
				statusText: 'Not Found'
			});

			await expect(getBookDetail(99999)).rejects.toThrow('Book not found');
		});

		it('should handle other error statuses', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 500,
				statusText: 'Internal Server Error'
			});

			await expect(getBookDetail(1)).rejects.toThrow('Failed to fetch book details');
		});

		it('should handle network errors', async () => {
			mockFetch.mockRejectedValueOnce(new Error('Network error'));

			await expect(getBookDetail(1)).rejects.toThrow('Network error');
		});

		it('should fetch different books separately', async () => {
			const mockBook2: BookDetail = {
				id: 2,
				ol_key: '/works/OL789012W',
				title: 'The Girl on the Train',
				authors: ['Paula Hawkins'],
				first_publish_year: 2015,
				subjects: ['Fiction', 'Mystery'],
				search_content: 'The Girl on the Train. Fiction Mystery'
			};

			mockFetch
				.mockResolvedValueOnce({
					ok: true,
					json: async () => mockBookDetail
				})
				.mockResolvedValueOnce({
					ok: true,
					json: async () => mockBook2
				});

			const result1 = await getBookDetail(1);
			const result2 = await getBookDetail(2);

			expect(mockFetch).toHaveBeenCalledTimes(2);
			expect(result1.id).toBe(1);
			expect(result2.id).toBe(2);
		});
	});

	describe('clearCache', () => {
		it('should clear all cache when called without arguments', async () => {
			const mockResponse: HealthResponse = {
				status: 'ok',
				service: 'whattoread-api',
				version: '1.0.0'
			};

			mockFetch.mockResolvedValue({
				ok: true,
				json: async () => mockResponse
			});

			// Populate cache
			await getHealth();
			expect(apiCache.getStats().size).toBeGreaterThan(0);

			// Clear cache
			clearCache();
			expect(apiCache.getStats().size).toBe(0);

			// Next call should fetch again
			await getHealth();
			expect(mockFetch).toHaveBeenCalledTimes(2);
		});

		it('should clear specific endpoint cache', async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				json: async () => ({
					status: 'ok',
					service: 'whattoread-api',
					version: '1.0.0'
				})
			});

			// Populate cache
			await getHealth();
			const initialSize = apiCache.getStats().size;

			// Clear specific cache
			clearCache('/health', {});

			// Next call should fetch again
			await getHealth();
			expect(mockFetch).toHaveBeenCalledTimes(2);
		});
	});

	describe('Edge Cases', () => {
		it('should handle empty book arrays', async () => {
			const request: RecommendationRequest = {
				query: 'nonexistent genre',
				limit: 10
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => []
			});

			const result = await getRecommendations(request);
			expect(result).toEqual([]);
		});

		it('should handle books with null year', async () => {
			const bookWithNullYear: Book = {
				id: 1,
				ol_key: '/works/OL123456W',
				title: 'Test Book',
				authors: ['Test Author'],
				first_publish_year: null,
				subjects: ['Fiction'],
				similarity: 0.75
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => [bookWithNullYear]
			});

			const result = await getRecommendations({ query: 'test', limit: 10 });
			expect(result[0].first_publish_year).toBeNull();
		});

		it('should handle books with empty arrays', async () => {
			const bookWithEmptyArrays: Book = {
				id: 1,
				ol_key: '/works/OL123456W',
				title: 'Test Book',
				authors: [],
				first_publish_year: 2020,
				subjects: [],
				similarity: 0.75
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => [bookWithEmptyArrays]
			});

			const result = await getRecommendations({ query: 'test', limit: 10 });
			expect(result[0].authors).toEqual([]);
			expect(result[0].subjects).toEqual([]);
		});

		it('should handle very long queries', async () => {
			const longQuery = 'a'.repeat(500);
			const request: RecommendationRequest = {
				query: longQuery,
				limit: 10
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => []
			});

			const result = await getRecommendations(request);
			expect(mockFetch).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					body: JSON.stringify({
						query: longQuery,
						limit: 10
					})
				})
			);
			expect(result).toEqual([]);
		});
	});
});
