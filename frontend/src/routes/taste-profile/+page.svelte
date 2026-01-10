<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import type { SearchHistoryEntry } from '$lib/types';
	import { getSearchHistory } from '$lib/searchHistory';
	import EnhancedTasteProfile from '$lib/components/EnhancedTasteProfile.svelte';

	let searchHistory = $state<SearchHistoryEntry[]>([]);

	function loadSearchHistory() {
		searchHistory = getSearchHistory();
	}

	onMount(() => {
		loadSearchHistory();
		
		// Listen for storage changes to update the list when history changes elsewhere
		const handleStorageChange = () => {
			loadSearchHistory();
		};
		window.addEventListener('storage', handleStorageChange);
		
		return () => {
			window.removeEventListener('storage', handleStorageChange);
		};
	});
</script>

<svelte:head>
	<title>Taste Profile - WhatToRead</title>
</svelte:head>

<!-- Skip to main content link -->
<a
	href="#main-content"
	class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-academia-gold focus:text-academia-dark focus:rounded focus:font-semibold"
>
	Skip to main content
</a>

<div class="min-h-screen p-4 md:p-8">
	<header class="text-center mb-8">
		<h1 class="text-4xl md:text-5xl font-serif font-bold text-academia-gold mb-4">
			Your Taste Profile
		</h1>
		<p class="text-academia-cream/80 text-lg mb-6">
			Discover insights about your reading preferences
		</p>
	</header>

	<nav aria-label="Navigation" class="flex justify-center mb-6">
		<button 
			class="btn btn-secondary focus:outline-2 focus:outline-offset-2 focus:outline-academia-gold" 
			onclick={() => goto('/')}
			aria-label="Go back to search page"
		>
			<span aria-hidden="true">←</span> Back to Search
		</button>
	</nav>

	<main id="main-content" role="main" class="max-w-4xl mx-auto">
		<EnhancedTasteProfile 
			history={searchHistory} 
			onHistoryChange={loadSearchHistory}
		/>
	</main>
</div>
