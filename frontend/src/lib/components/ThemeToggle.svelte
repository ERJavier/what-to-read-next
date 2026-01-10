<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { initTheme, applyTheme, watchSystemTheme, type Theme } from '../theme';

	let currentTheme = $state<Theme>('system');
	let effectiveTheme = $state<'dark' | 'light'>('dark');
	let showMenu = $state(false);

	function cycleTheme() {
		const themes: Theme[] = ['dark', 'light', 'system'];
		const currentIndex = themes.indexOf(currentTheme);
		const nextIndex = (currentIndex + 1) % themes.length;
		const nextTheme = themes[nextIndex];
		
		setTheme(nextTheme);
		showMenu = false;
	}

	function setTheme(theme: Theme) {
		currentTheme = theme;
		applyTheme(theme);
		if (browser) {
			effectiveTheme = theme === 'system' 
				? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
				: theme;
		}
	}

	onMount(() => {
		if (browser) {
			currentTheme = initTheme();
			effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
			
			// Watch for system theme changes when using system preference
			return watchSystemTheme((isDark) => {
				if (currentTheme === 'system') {
					effectiveTheme = isDark ? 'dark' : 'light';
					applyTheme('system');
				}
			});
		}
	});

	// Close menu when clicking outside
	function handleClickOutside(e: MouseEvent) {
		const target = e.target as HTMLElement;
		if (!target.closest('.theme-toggle-container')) {
			showMenu = false;
		}
	}

	$effect(() => {
		if (showMenu && browser) {
			window.addEventListener('click', handleClickOutside);
			return () => window.removeEventListener('click', handleClickOutside);
		}
	});
</script>

<div class="theme-toggle-container relative inline-block">
	<button
		class="btn btn-secondary flex items-center gap-2 focus:outline-2 focus:outline-offset-2 focus:outline-academia-gold"
		onclick={() => showMenu ? showMenu = false : cycleTheme()}
		onkeydown={(e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				if (showMenu) {
					showMenu = false;
				} else {
					cycleTheme();
				}
			} else if (e.key === 'Escape' && showMenu) {
				showMenu = false;
			}
		}}
		aria-label="Toggle theme (currently {currentTheme === 'system' ? 'system' : currentTheme})"
		aria-expanded={showMenu}
		title="Current: {currentTheme === 'system' ? 'System' : currentTheme === 'dark' ? 'Dark' : 'Light'} mode"
	>
		{#if effectiveTheme === 'dark'}
			<!-- Moon icon for dark mode -->
			<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
			</svg>
		{:else}
			<!-- Sun icon for light mode -->
			<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
			</svg>
		{/if}
		<span class="sr-only">Theme: {currentTheme === 'system' ? 'System' : currentTheme === 'dark' ? 'Dark' : 'Light'}</span>
		{#if currentTheme === 'system'}
			<span class="text-xs opacity-70" aria-hidden="true">Auto</span>
		{/if}
	</button>

	{#if showMenu}
		<div 
			class="absolute right-0 mt-2 bg-surface dark:bg-academia-light border border-default/50 dark:border-academia-lighter rounded-lg shadow-xl z-50 min-w-[140px] overflow-hidden"
			role="menu"
			aria-label="Theme selection"
		>
			<button
				class="w-full text-left px-4 py-2 text-sm text-primary dark:text-academia-cream hover:bg-elevated dark:hover:bg-academia-lighter transition-colors flex items-center gap-2 {currentTheme === 'dark' ? 'bg-academia-gold/20 dark:bg-academia-dark/50' : ''}"
				onclick={() => setTheme('dark')}
				role="menuitem"
				aria-selected={currentTheme === 'dark'}
			>
				<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
				</svg>
				Dark
				{#if currentTheme === 'dark'}
					<span class="ml-auto text-academia-gold" aria-hidden="true">✓</span>
				{/if}
			</button>
			<button
				class="w-full text-left px-4 py-2 text-sm text-primary dark:text-academia-cream hover:bg-elevated dark:hover:bg-academia-lighter transition-colors flex items-center gap-2 border-t border-default/30 dark:border-academia-lighter {currentTheme === 'light' ? 'bg-academia-gold/20 dark:bg-academia-dark/50' : ''}"
				onclick={() => setTheme('light')}
				role="menuitem"
				aria-selected={currentTheme === 'light'}
			>
				<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
				</svg>
				Light
				{#if currentTheme === 'light'}
					<span class="ml-auto text-academia-gold" aria-hidden="true">✓</span>
				{/if}
			</button>
			<button
				class="w-full text-left px-4 py-2 text-sm text-primary dark:text-academia-cream hover:bg-elevated dark:hover:bg-academia-lighter transition-colors flex items-center gap-2 border-t border-default/30 dark:border-academia-lighter {currentTheme === 'system' ? 'bg-academia-gold/20 dark:bg-academia-dark/50' : ''}"
				onclick={() => setTheme('system')}
				role="menuitem"
				aria-selected={currentTheme === 'system'}
			>
				<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
				</svg>
				System
				{#if currentTheme === 'system'}
					<span class="ml-auto text-academia-gold" aria-hidden="true">✓</span>
				{/if}
			</button>
		</div>
	{/if}
</div>
