/**
 * Image utilities for optimized image loading
 */

export type OpenLibraryCoverSize = 'S' | 'M' | 'L';

/**
 * Generate Open Library cover image URL
 * @param olKey - Open Library work key (e.g., "/works/OL123456W")
 * @param size - Cover size: S (small), M (medium), L (large)
 * @returns Cover image URL
 */
export function getOpenLibraryCoverUrl(olKey: string, size: OpenLibraryCoverSize = 'M'): string {
	if (!olKey) return '';
	
	// Extract the work ID from ol_key (e.g., "/works/OL123456W" -> "OL123456W")
	const workId = olKey.replace(/^\/works\//, '').replace(/\//g, '');
	
	if (!workId) return '';
	
	// Open Library cover API format: https://covers.openlibrary.org/b/olid/{workId}-{size}.jpg
	// For works, we use 'olid' (Open Library ID) identifier
	return `https://covers.openlibrary.org/b/olid/${workId}-${size}.jpg`;
}

/**
 * Generate responsive srcset for Open Library covers
 * @param olKey - Open Library work key
 * @returns srcset string for responsive images
 */
export function getOpenLibraryCoverSrcset(olKey: string): string {
	if (!olKey) return '';
	
	return [
		`${getOpenLibraryCoverUrl(olKey, 'S')} 160w`,
		`${getOpenLibraryCoverUrl(olKey, 'M')} 480w`,
		`${getOpenLibraryCoverUrl(olKey, 'L')} 768w`
	].join(', ');
}

/**
 * Generate placeholder data URL for book covers
 * Creates a simple SVG placeholder with book icon
 */
export function getBookCoverPlaceholder(title: string, width = 200, height = 300): string {
	const encodedTitle = encodeURIComponent(title.substring(0, 30));
	const svg = `
		<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
			<rect width="100%" height="100%" fill="#2d2a26"/>
			<text x="50%" y="50%" font-family="serif" font-size="14" fill="#d4af37" text-anchor="middle" dy=".3em">
				${encodedTitle}
			</text>
		</svg>
	`.trim();
	
	return `data:image/svg+xml;base64,${btoa(svg)}`;
}
