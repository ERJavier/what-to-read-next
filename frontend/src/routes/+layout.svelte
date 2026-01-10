<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import favicon from '$lib/assets/favicon.svg';
	import { initTheme, watchSystemTheme } from '$lib/theme';
	import '../app.css';

	let { children } = $props();

	onMount(() => {
		if (browser) {
			// Initialize theme
			initTheme();
			
			// Watch for system theme changes
			return watchSystemTheme(() => {
				// Theme will be reapplied automatically by the watcher
			});
		}
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>WhatToRead - Discover Your Next Book</title>
</svelte:head>

<div class="min-h-screen transition-colors duration-300">
	{@render children()}
</div>
