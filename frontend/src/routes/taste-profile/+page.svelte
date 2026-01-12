<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import type { SearchHistoryEntry } from '$lib/types';
	import { getSearchHistory } from '$lib/searchHistory';
	// Dynamic import for better code splitting - EnhancedTasteProfile is a heavy component
	import type { Component } from 'svelte';

	let EnhancedTasteProfile: Component<{ history: SearchHistoryEntry[]; onHistoryChange?: () => void }> | null = $state(null);
	let searchHistory = $state<SearchHistoryEntry[]>([]);
	let loadingComponent = $state(true);

	function loadSearchHistory() {
		searchHistory = getSearchHistory();
	}

	onMount(() => {
		loadSearchHistory();
		
		// Dynamically import the heavy component
		import('$lib/components/EnhancedTasteProfile.svelte')
			.then((module) => {
				EnhancedTasteProfile = module.default;
				loadingComponent = false;
			})
			.catch((error) => {
				console.error('Failed to load EnhancedTasteProfile component:', error);
				loadingComponent = false;
			});
		
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

<div class="min-h-screen p-2 sm:p-4 md:p-6 lg:p-8">
	<header class="text-center mb-4 sm:mb-6 md:mb-8 px-2">
		<h1 class="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-academia-gold mb-2 sm:mb-4">
			Your Taste Profile
		</h1>
		<p class="text-academia-cream/80 text-base sm:text-lg mb-4 sm:mb-6">
			Discover insights about your reading preferences
		</p>
	</header>

	<nav aria-label="Navigation" class="flex justify-center mb-4 sm:mb-6 px-2">
		<button 
			class="btn btn-secondary focus:outline-2 focus:outline-offset-2 focus:outline-academia-gold" 
			onclick={() => goto('/')}
			aria-label="Go back to search page"
		>
			<span aria-hidden="true">←</span> Back to Search
		</button>
	</nav>

	<main id="main-content" class="max-w-4xl mx-auto">
		{#if loadingComponent}
			<div class="card text-center py-12">
				<div class="animate-pulse">
					<div class="h-8 bg-academia-lighter rounded mb-4 w-3/4 mx-auto"></div>
					<div class="h-4 bg-academia-lighter rounded mb-2 w-1/2 mx-auto"></div>
					<div class="h-4 bg-academia-lighter rounded w-2/3 mx-auto"></div>
				</div>
				<p class="text-academia-cream/60 text-sm mt-4">Loading taste profile...</p>
			</div>
		{:else if EnhancedTasteProfile}
			{@const Component = EnhancedTasteProfile}
			<Component 
				history={searchHistory}
				onHistoryChange={loadSearchHistory}
			/>
		{:else}
			<div class="card text-center py-8">
				<p class="text-academia-cream/80 mb-2">Failed to load taste profile component</p>
				<button 
					class="btn btn-secondary mt-4"
					onclick={() => window.location.reload()}
				>
					Reload Page
				</button>
			</div>
		{/if}
	</main>
</div>
