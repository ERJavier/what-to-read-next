import { browser } from '$app/environment';

export type Theme = 'dark' | 'light' | 'system';

const STORAGE_KEY = 'whattoread_theme';

/**
 * Get the effective theme (resolves 'system' to actual dark/light)
 */
export function getEffectiveTheme(theme: Theme): 'dark' | 'light' {
	if (theme === 'system' && browser) {
		return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
	}
	return theme === 'system' ? 'dark' : theme;
}

/**
 * Apply theme to document
 */
export function applyTheme(theme: Theme): void {
	if (!browser) return;
	
	const effectiveTheme = getEffectiveTheme(theme);
	const html = document.documentElement;
	
	// Remove existing theme classes
	html.classList.remove('dark', 'light');
	
	// Add new theme class
	html.classList.add(effectiveTheme);
	
	// Store preference (even if system, so we remember the choice)
	localStorage.setItem(STORAGE_KEY, theme);
}

/**
 * Get saved theme from localStorage, or default to system
 */
export function getSavedTheme(): Theme {
	if (!browser) return 'system';
	
	try {
		const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
		return saved && ['dark', 'light', 'system'].includes(saved) ? saved : 'system';
	} catch (e) {
		console.error('Error reading theme from localStorage:', e);
		return 'system';
	}
}

/**
 * Initialize theme on page load
 */
export function initTheme(): Theme {
	const theme = getSavedTheme();
	applyTheme(theme);
	return theme;
}

/**
 * Listen for system theme changes when theme is set to 'system'
 */
export function watchSystemTheme(callback: (isDark: boolean) => void): () => void {
	if (!browser) return () => {};
	
	const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
	
	const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
		callback(e.matches);
	};
	
	// Initial call
	handleChange(mediaQuery);
	
	// Modern browsers
	if (mediaQuery.addEventListener) {
		mediaQuery.addEventListener('change', handleChange);
		return () => mediaQuery.removeEventListener('change', handleChange);
	}
	
	// Fallback for older browsers
	mediaQuery.addListener(handleChange);
	return () => mediaQuery.removeListener(handleChange);
}
