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

<div class="min-h-screen p-4 md:p-8">
	<header class="text-center mb-8">
		<h1 class="text-4xl md:text-5xl font-serif font-bold text-academia-gold mb-4">
			Your Taste Profile
		</h1>
		<p class="text-academia-cream/80 text-lg mb-6">
			Discover insights about your reading preferences
		</p>
	</header>

	<div class="flex justify-center mb-6">
		<button class="btn btn-secondary" onclick={() => goto('/')}>
			← Back to Search
		</button>
	</div>

	<div class="max-w-4xl mx-auto">
		<EnhancedTasteProfile 
			history={searchHistory} 
			onHistoryChange={loadSearchHistory}
		/>
	</div>
</div>
