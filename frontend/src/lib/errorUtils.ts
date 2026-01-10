/**
 * Get actionable suggestions based on error type and message
 */
export function getErrorSuggestions(error: Error | string): {
	title: string;
	suggestions: string[];
	actions?: Array<{ label: string; action: () => void }>;
} {
	const message = typeof error === 'string' ? error : error.message;
	const errorMessage = message.toLowerCase();

	// Network errors
	if (
		errorMessage.includes('fetch') ||
		errorMessage.includes('network') ||
		errorMessage.includes('failed to fetch') ||
		errorMessage.includes('connection')
	) {
		return {
			title: 'Connection Error',
			suggestions: [
				'Check your internet connection and try again',
				'The server may be temporarily unavailable',
				'Try refreshing the page',
				'Wait a few moments and try again'
			]
		};
	}

	// Not found errors
	if (
		errorMessage.includes('not found') ||
		errorMessage.includes('404') ||
		errorMessage.includes('book not found')
	) {
		return {
			title: 'Not Found',
			suggestions: [
				'The book you\'re looking for may not exist in our database',
				'Try searching for similar books',
				'Check the book ID in the URL',
				'Return to the search page to find other books'
			]
		};
	}

	// Validation errors
	if (
		errorMessage.includes('validation') ||
		errorMessage.includes('invalid') ||
		errorMessage.includes('bad request') ||
		errorMessage.includes('400')
	) {
		return {
			title: 'Invalid Request',
			suggestions: [
				'Check that your search query is not empty',
				'Ensure the request parameters are valid',
				'Try a different search query',
				'Refresh the page and try again'
			]
		};
	}

	// Server errors
	if (
		errorMessage.includes('server') ||
		errorMessage.includes('500') ||
		errorMessage.includes('internal') ||
		errorMessage.includes('health check failed')
	) {
		return {
			title: 'Server Error',
			suggestions: [
				'This appears to be a server-side issue',
				'Try again in a few moments',
				'If the problem persists, the service may be temporarily down',
				'Check back later or refresh the page'
			]
		};
	}

	// Rate limiting errors
	if (
		errorMessage.includes('rate limit') ||
		errorMessage.includes('too many requests') ||
		errorMessage.includes('429')
	) {
		return {
			title: 'Too Many Requests',
			suggestions: [
				'You\'ve made too many requests too quickly',
				'Please wait a moment before trying again',
				'Try reducing the frequency of your searches',
				'Wait 30 seconds and try again'
			]
		};
	}

	// Search-specific errors
	if (
		errorMessage.includes('search') ||
		errorMessage.includes('recommendation') ||
		errorMessage.includes('failed to search')
	) {
		return {
			title: 'Search Error',
			suggestions: [
				'Try refining your search query',
				'Use different keywords or descriptions',
				'Check your spelling',
				'Try searching for a specific genre or author'
			]
		};
	}

	// Timeout errors
	if (
		errorMessage.includes('timeout') ||
		errorMessage.includes('timed out')
	) {
		return {
			title: 'Request Timeout',
			suggestions: [
				'The request took too long to complete',
				'Try again with a simpler search query',
				'Check your internet connection',
				'Reduce the number of results requested'
			]
		};
	}

	// Generic error
	return {
		title: 'Something Went Wrong',
		suggestions: [
			'Try refreshing the page',
			'Check your internet connection',
			'Try a different action',
			'If the problem persists, wait a few moments and try again'
		]
	};
}
