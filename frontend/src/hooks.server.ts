import type { Handle } from '@sveltejs/kit';

const API_BASE_URL = process.env.API_URL || 'http://localhost:8000';

export const handle: Handle = async ({ event, resolve }) => {
	// Proxy API requests to FastAPI backend
	if (event.url.pathname.startsWith('/api')) {
		const targetUrl = `${API_BASE_URL}${event.url.pathname.replace('/api', '')}${event.url.search}`;
		
		try {
			const response = await fetch(targetUrl, {
				method: event.request.method,
				headers: {
					'Content-Type': 'application/json',
					...Object.fromEntries(event.request.headers.entries())
				},
				body: event.request.method !== 'GET' && event.request.method !== 'HEAD' 
					? await event.request.text() 
					: undefined
			});

			const data = await response.json().catch(() => null);
			
			return new Response(JSON.stringify(data), {
				status: response.status,
				headers: {
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
					'Access-Control-Allow-Headers': 'Content-Type'
				}
			});
		} catch (error) {
			return new Response(JSON.stringify({ error: 'Failed to proxy request' }), {
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			});
		}
	}

	return resolve(event);
};
